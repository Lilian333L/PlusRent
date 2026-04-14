export const config = {
  matcher: ['/', '/sofer-treaz', '/cars', '/about', '/contact']
};

export default function middleware(request) {
  const url = new URL(request.url);

  // Боты — всегда на /ro/
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider/i.test(userAgent);

  if (isBot) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': url.origin + '/ro' + url.pathname }
    });
  }

  // Cookie lang=
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)lang=([^;]+)/);
  const cookieLang = cookieMatch ? cookieMatch[1] : null;
  const validLangs = ['ro', 'ru', 'en'];

  if (cookieLang && validLangs.includes(cookieLang)) {
    const dest = url.pathname === '/' 
      ? '/' + cookieLang + '/'
      : '/' + cookieLang + url.pathname;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': url.origin + dest,
        'Set-Cookie': 'lang=' + cookieLang + '; path=/; max-age=2592000; SameSite=Lax'
      }
    });
  }

  // Accept-Language fallback
  const acceptLang = request.headers.get('accept-language') || '';
  let lang = 'ro';
  if (acceptLang.toLowerCase().includes('ru')) lang = 'ru';
  else if (acceptLang.toLowerCase().includes('en')) lang = 'en';

  const dest = url.pathname === '/'
    ? '/' + lang + '/'
    : '/' + lang + url.pathname;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': url.origin + dest,
      'Set-Cookie': 'lang=' + lang + '; path=/; max-age=2592000; SameSite=Lax'
    }
  });
}
