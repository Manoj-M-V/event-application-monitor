// import { clerkMiddleware } from "@clerk/nextjs/server"

// export default clerkMiddleware()

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     "/((?!_next|[^?]\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).)",
//     // Only apply to trpc routes (not api routes)
//     "/trpc(.*)",
//     // Apply to dashboard and welcome routes
//     "/dashboard(.*)",
//     "/welcome",
//   ],
// }

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Create a middleware that excludes specific routes from Clerk authentication
const publicRoutes = [
  "/api/v1/events",
]

// Check if the path should be public
const isPublic = (path) => {
  return publicRoutes.some(publicRoute => path.startsWith(publicRoute))
}

export default function middleware(req) {
  const path = req.nextUrl.pathname
  
  // Skip Clerk auth for public API routes
  if (isPublic(path)) {
    return NextResponse.next()
  }
  
  // Use Clerk middleware for all other routes
  return clerkMiddleware()(req)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).)",
    // Run on all routes that need protection
    "/(.*)", // This will include your landing page, dashboard, etc.
  ],
}