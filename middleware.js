export const config = {
  // Matches paths that need trailing-slash stripping OR language-based redirect.
  // NOTE: language-prefixed routes (e.g. /ro/cars) are served by vercel.json rewrites,
  // they do NOT hit this middleware.
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
    '/ro/',
    '/ru/',
    '/en/',
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

  // ============================================================
  // STEP 1 — TRAILING SLASH NORMALIZATION (301 → canonical URL)
  // ============================================================
  // Strip trailing slash from any path EXCEPT the language roots
  // (/ro/, /ru/, /en/) and the site root (/).
  // Language roots keep their slash because they are directory-style.
  const keepSlashPaths = ['/', '/ro/', '/ru/', '/en/'];
  if (pathname.endsWith('/') && !keepSlashPaths.includes(pathname)) {
    // Strip the trailing slash and 301 redirect
    const cleanPath = pathname.slice(0, -1);
    return new Response(null, {
      status: 301,
      headers: {
        'Location': url.origin + cleanPath + search,
        'Cache-Control': 'public, max-age=31536000', // 1 year — canonical
        'Vary': 'Accept-Language'
      }
    });
  }

  // ============================================================
  // STEP 2 — LANGUAGE-BASED REDIRECT (for unprefixed paths)
  // ============================================================
  // Accept-Language based redirect from root-level paths
  // to their language-prefixed canonical URL.
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

  const paths = pathMap[pathname];
  if (!paths) return; // No language redirect needed → let the request pass through

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

  const destination = paths[targetLang];
  return new Response(null, {
    status: 301,
    headers: {
      'Location': url.origin + destination + search,
      'Cache-Control': 'public, max-age=3600', // 1 hour — language preference may change
      'Vary': 'Accept-Language'
    }
  });
}
