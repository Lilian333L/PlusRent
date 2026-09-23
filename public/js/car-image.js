/**
 * Car photo URLs through Vercel Image Optimization.
 * Originals in Supabase Storage are up to 1920x1440 / 570 KB; cards need ~400-800 px.
 * On localhost (no /_vercel/image endpoint) the original URL is returned unchanged.
 * Allowed widths must match "images.sizes" in vercel.json.
 */
(function () {
  var SUPABASE_PREFIX = 'https://ncmqbrhlxjrjgnkaafhv.supabase.co/storage/v1/object/public/car-images/';
  var WIDTHS = [480, 640, 828, 1080];
  var CARD_SIZES = '(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 400px';

  function canOptimize(url) {
    return typeof url === 'string' &&
      url.indexOf(SUPABASE_PREFIX) === 0 &&
      /(^|\.)plusrent\.md$|\.vercel\.app$/.test(window.location.hostname);
  }

  function optimizedUrl(url, width) {
    if (!canOptimize(url)) return url;
    return '/_vercel/image?url=' + encodeURIComponent(url) + '&w=' + width + '&q=75';
  }

  /** Single URL, e.g. for a background or a small thumbnail */
  window.carImageUrl = function (url, width) {
    return optimizedUrl(url, width || 828);
  };

  // Safety net: if an optimized image fails, fall back to the original Supabase URL
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img.src.indexOf('/_vercel/image?') === -1) return;
    var original = new URL(img.src).searchParams.get('url');
    if (!original) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = original;
  }, true);

  /** srcset string for large gallery photos (higher quality than cards) */
  window.carImageSrcset = function (url, widths, quality) {
    if (!canOptimize(url)) return "";
    return widths.map(function (w) {
      return "/_vercel/image?url=" + encodeURIComponent(url) + "&w=" + w + "&q=" + (quality || 75) + " " + w + "w";
    }).join(", ");
  };

  /** src + srcset + sizes attributes for an <img> inside a car card */
  window.carImageAttrs = function (url, sizes) {
    var attrs = 'src="' + optimizedUrl(url, 828) + '"';
    if (canOptimize(url)) {
      attrs += ' srcset="' + WIDTHS.map(function (w) { return optimizedUrl(url, w) + ' ' + w + 'w'; }).join(', ') + '"';
      attrs += ' sizes="' + (sizes || CARD_SIZES) + '"';
    }
    return attrs;
  };
})();
