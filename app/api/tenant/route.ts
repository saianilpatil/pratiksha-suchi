import { NextResponse } from 'next/server';
import { getAllTenants, createTenant, getTenantBySubdomain } from '@/lib/sheets';

export async function GET() {
  try {
    const tenants = await getAllTenants();
    const safeTenants = tenants.map(({ password, ...t }) => t);
    return NextResponse.json({ success: true, tenants: safeTenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subdomain, name, type, ownerEmail, password } = body;

    if (!subdomain || !name || !ownerEmail || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const existing = await getTenantBySubdomain(subdomain);
    if (existing) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 409 }
      );
    }

    const tenant = await createTenant({
      subdomain,
      name,
      type: type || 'general',
      ownerEmail,
      password,
    });

    const { password: _, ...safeTenant } = tenant;
    return NextResponse.json({ success: true, tenant: safeTenant });
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}