import { NextResponse } from 'next/server';

export default function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider/i.test(userAgent);
  
  if (isBot) {
    return NextResponse.redirect(new URL('/ro/', request.url), 302);
  }

  const cookieLang = request.cookies.get('lang')?.value;
  const validLangs = ['ro', 'ru', 'en'];
  
  if (cookieLang && validLangs.includes(cookieLang)) {
    return NextResponse.redirect(new URL('/' + cookieLang + '/', request.url), 302);
  }

  const acceptLang = request.headers.get('accept-language') || '';
  let lang = 'ro';
  if (acceptLang.includes('ru')) lang = 'ru';
  else if (acceptLang.includes('en')) lang = 'en';

  return NextResponse.redirect(new URL('/' + lang + '/', request.url), 302);
}

export const config = {
  matcher: ['/', '/sofer-treaz', '/cars', '/about', '/contact']
};
