export const config = {
  matcher: ['/', '/sofer-treaz', '/cars', '/about', '/contact'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Уже на языковом пути — пропускаем
  if (/^\/(ro|ru|en)(\/|$)/.test(pathname)) return;

  // Читаем cookie
  const cookies = request.headers.get('cookie') || '';
  const cookieMatch = cookies.match(/(?:^|;\s*)lang=([a-z]{2})/);
  const cookieLang = cookieMatch ? cookieMatch[1] : null;

  let lang = 'ro';
  if (cookieLang && ['ro', 'ru', 'en'].includes(cookieLang)) {
    lang = cookieLang;
  } else {
    const al = (request.headers.get('accept-language') || '').toLowerCase();
    if (al.startsWith('ru')) lang = 'ru';
    else if (al.startsWith('en')) lang = 'en';
  }

  const suffix = pathname === '/' ? '' : pathname;
  const dest = `${url.origin}/${lang}${suffix}`;

  // Создаём redirect с cookie в одном объекте
  return new Response(null, {
    status: 302,
    headers: {
      'Location': dest,
      'Set-Cookie': `lang=${lang}; Path=/; Max-Age=2592000; SameSite=Lax`,
    },
  });
}
