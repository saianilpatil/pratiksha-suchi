import { NextResponse } from 'next/server';
import { getTenantBySubdomain, getActiveQueueForTenant } from '@/lib/sheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('tenant');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant required' },
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

    const entries = await getActiveQueueForTenant(tenant.id);

    return NextResponse.json({ success: true, entries, tenant });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}