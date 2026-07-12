import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('host') || '';
  const searchParams = request.nextUrl.searchParams;
  let subdomain = '';

  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  }

  if (!subdomain && searchParams.has('tenant')) {
    subdomain = searchParams.get('tenant') || '';
  }

  if (!subdomain) {
    const tenantCookie = request.cookies.get('tenant');
    if (tenantCookie) subdomain = tenantCookie.value;
  }

  if (subdomain && subdomain !== 'www' && subdomain !== 'pratikshasuchi') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-subdomain', subdomain);
    
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};