import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || './service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '';

// ─── TENANTS ───

export async function getAllTenants() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Tenants!A2:G',
  });
  
  const rows = res.data.values || [];
  return rows.map((row) => ({
    id: row[0],
    subdomain: row[1],
    name: row[2],
    type: row[3],
    ownerEmail: row[4],
    password: row[5] || '',
    createdAt: row[6],
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
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Tenants!A:G',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[id, data.subdomain, data.name, data.type, data.ownerEmail, data.password, now]],
    },
  });
  
  return { id, ...data, createdAt: now };
}

// ─── QUEUE ───

export async function getQueueForTenant(tenantId: string, statusFilter?: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A2:K',
  });
  
  const rows = res.data.values || [];
  let entries = rows
    .filter((row) => row[1] === tenantId)
    .map((row) => ({
      id: row[0],
      tenantId: row[1],
      name: row[2],
      email: row[3],
      service: row[4] || 'General',
      status: row[5],
      position: parseInt(row[6]) || 0,
      joinedAt: row[7],
      checkedInAt: row[8] || null,
      servedAt: row[9] || null,
      emailSent: row[10] === 'TRUE',
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
  service: string;
  position: number;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Queue!A:K',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        id,
        data.tenantId,
        data.name,
        data.email,
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
    range: 'Queue!A2:K',
  });
  
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === entryId);
  
  if (rowIndex === -1) return null;
  
  const actualRow = rowIndex + 2;
  const now = new Date().toISOString();
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queue!F${actualRow}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[newStatus]],
    },
  });

  if (newStatus === 'checkedin') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queue!I${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[now]] },
    });
  } else if (newStatus === 'served') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queue!J${actualRow}`,
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
    range: 'Queue!A2:K',
  });
  
  const allRows = res.data.values || [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowIndex = allRows.findIndex((row) => row[0] === entry.id);
    if (rowIndex === -1) continue;
    
    const actualRow = rowIndex + 2;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queue!G${actualRow}`,
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
    range: 'Queue!A2:K',
  });
  
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === entryId);
  if (rowIndex === -1) return;
  
  const actualRow = rowIndex + 2;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queue!K${actualRow}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['TRUE']],
    },
  });
}