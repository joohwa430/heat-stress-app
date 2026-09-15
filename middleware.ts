import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // 로컬은 전부 허용
  if (hostname === 'localhost') {
    return NextResponse.next();
  }

  // 배포에서는 /heat-stress만 허용
  if (pathname.startsWith('/heat-stress')) {
    return NextResponse.next();
  }

  return new NextResponse(null, { status: 404 });
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
