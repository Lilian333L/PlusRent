export const config = {
  // Matches paths that need trailing-slash stripping OR language-based redirect.
  // NOTE: language-prefixed routes (e.g. /ro/cars) are served by vercel.json rewrites,
  // they do NOT hit this middleware for content delivery.
  matcher: [
    '/',
    '/sofer-treaz',
    '/sofer-treaz/',
    '/cars',
    '/cars/',
    '/about',
    '/about/',
    '/contact',
    '/contact/',
    '/ro/sofer-treaz/',
    '/ru/sofer-treaz/',
    '/en/sofer-treaz/',
    '/ro/cars/',
    '/ru/cars/',
    '/en/cars/',
    '/ro/about/',
    '/ru/about/',
    '/en/about/',
    '/ro/contact/',
    '/ru/contact/',
    '/en/contact/',
    '/terms/'
  ]
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search; // preserve query string (?utm_source=..., etc.)

  // Language roots keep their trailing slash (directory-style)
  const keepSlashPaths = ['/', '/ro/', '/ru/', '/en/'];

  // ============================================================
  // STEP 1 — NORMALIZE PATH (strip trailing slash if not a language root)
  // ============================================================
  let normalizedPath = pathname;
  let needsRedirect = false;

  if (pathname.endsWith('/') && !keepSlashPaths.includes(pathname)) {
    normalizedPath = pathname.slice(0, -1);
    needsRedirect = true;
  }

  // ============================================================
  // STEP 2 — LANGUAGE-BASED REDIRECT (for unprefixed paths)
  // ============================================================
  // Paths that should redirect to language-prefixed canonical URL
  // based on user's Accept-Language header.
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
    },
    '/cars': {
      ro: '/ro/cars',
      ru: '/ru/cars',
      en: '/en/cars'
    },
    '/about': {
      ro: '/ro/about',
      ru: '/ru/about',
      en: '/en/about'
    },
    '/contact': {
      ro: '/ro/contact',
      ru: '/ru/contact',
      en: '/en/contact'
    }
  };

  let finalDestination = normalizedPath;
  let cacheMaxAge = 31536000; // 1 year for trailing-slash canonicalization

  // Check if the normalized path needs language-based redirect
  if (pathMap[normalizedPath]) {
    // Determine target language from Accept-Language header
    // Default = 'ro' (Moldova → Romanian)
    let targetLang = 'ro';
    const acceptLang = (request.headers.get('accept-language') || '').toLowerCase();

    if (acceptLang) {
      const languages = acceptLang
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase());

      // Pick the first supported language in the user's preference order
      // Examples:
      //   "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7" → ru
      //   "en-US,en;q=0.9"                      → en
      //   "ro-MD,ro;q=0.9,ru;q=0.8"             → ro
      for (const lang of languages) {
        const primary = lang.split('-')[0]; // 'ru-ru' → 'ru'
        if (primary === 'ro' || primary === 'ru' || primary === 'en') {
          targetLang = primary;
          break;
        }
      }
    }

    finalDestination = pathMap[normalizedPath][targetLang];
    needsRedirect = true;
    cacheMaxAge = 3600; // 1 hour — language preference may change
  }

  // ============================================================
  // STEP 3 — SINGLE REDIRECT (if needed)
  // ============================================================
  if (needsRedirect && finalDestination !== pathname) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': url.origin + finalDestination + search,
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
        'Vary': 'Accept-Language'
      }
    });
  }

  // No redirect needed → let the request pass through
  return;
}
