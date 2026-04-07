export const config = {
  matcher: '/(.*)',
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  
  // Only apply to vercel.app domains
  if (!url.hostname.endsWith('.vercel.app')) {
    return;
  }

  const expectedPassword = process.env.SITE_PASSWORD;

  // If no password is set in environment, allow access
  if (!expectedPassword) {
    return;
  }

  const authorizationHeader = request.headers.get('authorization');

  if (authorizationHeader) {
    const basicAuth = authorizationHeader.split(' ')[1];
    try {
      const decoded = atob(basicAuth);
      const [, pwd] = decoded.split(':');

      // If password matches, allow access
      if (pwd === expectedPassword) {
        return;
      }
    } catch (e) {
      // Ignore decoding errors and fall through to 401
    }
  }

  return new Response('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}
