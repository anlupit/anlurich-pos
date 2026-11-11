import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const path = req.nextUrl.pathname;
  const lower = path.toLowerCase();
  if (lower.startsWith('/customer') && path !== '/customer') {
    const url = req.nextUrl.clone();
    url.pathname = '/customer';
    return NextResponse.redirect(url);
  }
  const isCustomerSite = host.includes('anlurichcustomer.com');
  if (!isCustomerSite) return NextResponse.next();
  if (path === '/' || path === '') {
    const url = req.nextUrl.clone();
    url.pathname = '/customer';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|api|favicon.ico).*)'] };
