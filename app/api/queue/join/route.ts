import { NextResponse } from 'next/server';
import { getTenantBySubdomain, addToQueue, getActiveQueueForTenant, isBusinessOpen } from '@/lib/sheets';
import { sendEmail, getStatusEmailTemplate } from '@/lib/email';
import { markEmailSent } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, tenant: subdomain } = body;

    if (!name || !email || !phone || !subdomain) {
      return NextResponse.json(
        { error: 'Name, email, phone, and tenant are required' },
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

    const open = isBusinessOpen(tenant);
    if (!open) {
      return NextResponse.json(
        { error: 'Business is currently closed' },
        { status: 403 }
      );
    }

    const queue = await getActiveQueueForTenant(tenant.id);
    const position = queue.filter(e => e.status === 'waiting').length + 1;

    const entry = await addToQueue({
      tenantId: tenant.id,
      name,
      email,
      phone,
      service: 'General',
      position,
    });

    const template = getStatusEmailTemplate('waiting', name, tenant.name, position);
    await sendEmail({ to: email, ...template });
    await markEmailSent(entry.id);

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json(
      { error: 'Failed to join queue' },
      { status: 500 }
    );
  }
}