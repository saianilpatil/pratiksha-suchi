import { NextResponse } from 'next/server';
import { getTenantBySubdomain, addToQueue, getActiveQueueForTenant } from '@/lib/sheets';
import { sendEmail, getStatusEmailTemplate } from '@/lib/email';
import { markEmailSent } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, service, tenant: subdomain } = body;

    if (!name || !email || !subdomain) {
      return NextResponse.json(
        { error: 'Name, email, and tenant are required' },
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

    const queue = await getActiveQueueForTenant(tenant.id);
    const position = queue.filter(e => e.status === 'waiting').length + 1;

    const entry = await addToQueue({
      tenantId: tenant.id,
      name,
      email,
      service: service || 'General',
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