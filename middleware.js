export const config = {
  matcher: ['/', '/sofer-treaz']
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Карта безпрефиксных URL → их румынской версии (default для Молдовы)
  // 301 Permanent Redirect: передаёт link equity, консолидирует signals
  const redirectMap = {
    '/': '/ro/',
    '/sofer-treaz': '/ro/sofer-treaz'
  };
  
  const destination = redirectMap[pathname];
  
  if (destination) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': url.origin + destination,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
  
  return;
}
