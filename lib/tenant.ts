import { headers } from 'next/headers';

export async function getTenantSubdomain() {
  const headersList = await headers();
  
  const subdomain = headersList.get('x-tenant-subdomain');
  if (subdomain) return subdomain;
  
  const host = headersList.get('host') || '';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0];
    }
  }
  
  return null;
}