export default function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Для ботов и кроулеров — всегда /ro/ (x-default)
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|facebookexternalhit|twitterbot/i.test(userAgent);
  
  if (isBot) {
    return Response.redirect(new URL('/ro/', request.url), 302);
  }

  // Для людей — читаем cookie lang=
  const cookieLang = request.cookies.get('lang')?.value;
  const validLangs = ['ro', 'ru', 'en'];
  
  if (cookieLang && validLangs.includes(cookieLang)) {
    return Response.redirect(new URL('/' + cookieLang + '/', request.url), 302);
  }

  // Fallback — Accept-Language
  const acceptLang = request.headers.get('accept-language') || '';
  let lang = 'ro';
  if (acceptLang.includes('ru')) lang = 'ru';
  else if (acceptLang.includes('en')) lang = 'en';

  return Response.redirect(new URL('/' + lang + '/', request.url), 302);
}
