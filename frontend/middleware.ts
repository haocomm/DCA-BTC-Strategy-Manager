import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/strategies/:path*',
    '/exchanges/:path*',
    '/logs/:path*',
    '/settings/:path*',
    '/notifications/:path*',
  ],
}