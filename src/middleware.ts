import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const isCustomerSite = host.includes('anlurichcustomer.com');
  if (!isCustomerSite) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (path === '/' || path === '') {
    const url = req.nextUrl.clone();
    url.pathname = '/customer';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|api|favicon.ico).*)'] };
