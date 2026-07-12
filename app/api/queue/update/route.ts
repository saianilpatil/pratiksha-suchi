import { NextResponse } from 'next/server';
import {
  getTenantBySubdomain,
  getQueueForTenant,
  updateEntryStatus,
  shiftWaitingPositions,
} from '@/lib/sheets';
import { sendEmail, getStatusEmailTemplate } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entryId, newStatus, tenant: subdomain } = body;

    if (!entryId || !newStatus || !subdomain) {
      return NextResponse.json(
        { error: 'Entry ID, new status, and tenant required' },
        { status: 400 }
      );
    }

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const updated = await updateEntryStatus(entryId, newStatus);
    if (!updated) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const allEntries = await getQueueForTenant(tenant.id);
    const entry = allEntries.find(e => e.id === entryId);

    if (entry) {
      const template = getStatusEmailTemplate(newStatus, entry.name, tenant.name);
      await sendEmail({ to: entry.email, ...template });
    }

    if (newStatus === 'checkedin' || newStatus === 'serving') {
      await shiftWaitingPositions(tenant.id);
    }

    const updatedQueue = await getQueueForTenant(tenant.id);

    return NextResponse.json({
      success: true,
      entry: updated,
      queue: updatedQueue,
    });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}