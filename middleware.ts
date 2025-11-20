import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Development mode: bypass authentication for local testing
const isDev = process.env.DEV_MODE === 'true';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public access to auth routes and API auth routes
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }
  
  // In dev mode, skip authentication
  if (isDev) {
    return NextResponse.next()
  }
  
  // In production, check authentication
  const session = await auth()
  
  // Protect all other routes
  if (!session?.user?.id) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
}

