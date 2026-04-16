export const config = {
  matcher: ['/', '/sofer-treaz']
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Базовая карта путей → куда редиректить
  const pathMap = {
    '/': {
      ro: '/ro/',
      ru: '/ru/',
      en: '/en/'
    },
    '/sofer-treaz': {
      ro: '/ro/sofer-treaz',
      ru: '/ru/sofer-treaz',
      en: '/en/sofer-treaz'
    }
  };
  
  const paths = pathMap[pathname];
  if (!paths) return;
  
  // Определяем целевой язык из Accept-Language
  // Default = 'ro' (Молдова → румынский)
  let targetLang = 'ro';
  
  const acceptLang = (request.headers.get('accept-language') || '').toLowerCase();
  
  // Парсим Accept-Language, берём первый поддерживаемый язык
  // Примеры: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7" → ru
  //          "en-US,en;q=0.9" → en
  //          "ro-MD,ro;q=0.9,ru;q=0.8" → ro
  if (acceptLang) {
    const languages = acceptLang
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase());
    
    // Ищем первый поддерживаемый язык в порядке приоритета пользователя
    for (const lang of languages) {
      const primary = lang.split('-')[0]; // 'ru-ru' → 'ru'
      if (primary === 'ro' || primary === 'ru' || primary === 'en') {
        targetLang = primary;
        break;
      }
    }
  }
  
  const destination = paths[targetLang];
  
  return new Response(null, {
    status: 301,
    headers: {
      'Location': url.origin + destination,
      'Cache-Control': 'public, max-age=3600',
      'Vary': 'Accept-Language'
    }
  });
}
