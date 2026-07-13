import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || './service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '';

// ── IST helpers ──────────────────────────────────────────────
export function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  return new Date(now.getTime() + istOffset);
}

export function toISTString(date: Date) {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getISTTime() {
  return toISTString(getISTDate());
}

function parseTimeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Check if new booking would exceed closing time
export function wouldExceedClosingTime(tenant: any, myPosition: number) {
  const avgMinutes = tenant.avgServiceMinutes || 15;
  const waitMinutes = myPosition * avgMinutes;
  const nowIST = getISTDate();
  const currentMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
  const closeMinutes = parseTimeToMinutes(tenant.closeTime || '18:00');
  return currentMinutes + waitMinutes > closeMinutes;
}

export async function getAllTenants() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Tenants!A2:J',
  });
  
  const rows = res.data.values || [];
  return rows.map((row) => ({
    id: row[0],
    subdomain: row[1],
    name: row[2],
    type: row[3],
    ownerEmail: row[4],
    password: row[5] || '',
    openTime: row[6] || '09:00',
    closeTime: row[7] || '18:00',
    avgServiceMinutes: parseInt(row[8]) || 15,
    createdAt: row[9],
  }));
}

export async function getTenantBySubdomain(subdomain: string) {
  const tenants = await getAllTenants();
  return tenants.find((t) => t.subdomain === subdomain) || null;
}

export async function getTenantByEmail(email: string) {
  const tenants = await getAllTenants();
  return tenants.find((t) => t.ownerEmail === email) || null;
}

export async function createTenant(data: {
  subdomain: string;
  name: string;
  type: string;
  ownerEmail: string;
  password: string;
  openTime?: string;
  closeTime?: string;
  avgServiceMinutes?: number;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Tenants!A:J',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        id,
        data.subdomain,
        data.name,
        data.type,
        data.ownerEmail,
        data.password,
        data.openTime || '09:00',
        data.closeTime || '18:00',
        data.avgServiceMinutes || 15,
        now,
      ]],
    },
  });
  
  return { id, ...data, createdAt: now };
}

export function isBusinessOpen(tenant: any) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const openTime = tenant.openTime || '09:00';
  const closeTime = tenant.closeTime || '18:00';
  return currentTime >= openTime && currentTime < closeTime;
}

export function getApproxWaitTime(tenant: any, queueLength: number) {
  const avgMinutes = tenant.avgServiceMinutes || 15;
  return queueLength * avgMinutes;
}

export async function getQueueForTenant(tenantId: string, statusFilter?: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A2:L',
  });
  
  const rows = res.data.values || [];
  let entries = rows
    .filter((row) => row[1] === tenantId)
    .map((row) => ({
      id: row[0],
      tenantId: row[1],
      name: row[2],
      email: row[3],
      phone: row[4] || '',
      service: row[5] || 'General',
      status: row[6],
      position: parseInt(row[7]) || 0,
      joinedAt: row[8],
      checkedInAt: row[9] || null,
      servedAt: row[10] || null,
      emailSent: row[11] === 'TRUE',
    }));

  if (statusFilter) {
    entries = entries.filter(e => e.status === statusFilter);
  }
  
  const statusOrder = { waiting: 0, checkedin: 1, serving: 2, served: 3, cancelled: 4 };
  entries.sort((a, b) => {
    const orderDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
    if (orderDiff !== 0) return orderDiff;
    return a.position - b.position;
  });
  
  return entries;
}

export async function getActiveQueueForTenant(tenantId: string) {
  const all = await getQueueForTenant(tenantId);
  return all.filter(e => e.status === 'waiting' || e.status === 'checkedin');
}

export async function addToQueue(data: {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  position: number;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A:L',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        id,
        data.tenantId,
        data.name,
        data.email,
        data.phone,
        data.service,
        'waiting',
        data.position,
        now,
        '',
        '',
        'FALSE',
      ]],
    },
  });
  
  return {
    id,
    tenantId: data.tenantId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    service: data.service,
    status: 'waiting',
    position: data.position,
    joinedAt: now,
    checkedInAt: null,
    servedAt: null,
    emailSent: false,
  };
}

export async function updateEntryStatus(entryId: string, newStatus: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A2:L',
  });
  
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === entryId);
  
  if (rowIndex === -1) return null;
  
  const actualRow = rowIndex + 2;
  const now = new Date().toISOString();
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queue!G${actualRow}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[newStatus]],
    },
  });

  if (newStatus === 'checkedin') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queue!J${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[now]] },
    });
  } else if (newStatus === 'served') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queue!K${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[now]] },
    });
  }
  
  return { id: entryId, status: newStatus };
}

export async function shiftWaitingPositions(tenantId: string) {
  const entries = await getQueueForTenant(tenantId, 'waiting');
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A2:L',
  });
  
  const allRows = res.data.values || [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowIndex = allRows.findIndex((row) => row[0] === entry.id);
    if (rowIndex === -1) continue;
    
    const actualRow = rowIndex + 2;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queue!H${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[i + 1]],
      },
    });
  }
  
  return entries.map((e, i) => ({ ...e, position: i + 1 }));
}

export async function markEmailSent(entryId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A2:L',
  });
  
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === entryId);
  if (rowIndex === -1) return;
  
  const actualRow = rowIndex + 2;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queue!L${actualRow}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['TRUE']],
    },
  });
}
