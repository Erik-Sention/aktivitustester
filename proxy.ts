import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isLogin = request.nextUrl.pathname.startsWith('/login')

  // Verify session by calling a lightweight check
  // Firebase Admin can only run in Node.js runtime, so we do a simple cookie presence check here.
  // The actual verification happens in each server page/action via getSessionUser().
  const hasSession = !!sessionCookie

  if (isDashboard && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL('/dashboard/athletes', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
