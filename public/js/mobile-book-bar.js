/**
 * Car page, phones and tablets: a bar pinned to the bottom of the screen with
 * the daily price and a button that scrolls to the booking form. The form sits
 * well below the gallery on a phone, so without it the only way to book was to
 * scroll past the whole price breakdown first.
 *
 * The bar hides while the form itself is on screen, and the floating contact
 * and back-to-top buttons move up while it is showing (body.pr-mb-on).
 */
(function () {
  var bar = document.getElementById('pr-mobile-book');
  var form = document.getElementById('contact_form');
  if (!bar || !form || !('IntersectionObserver' in window)) return;

  var mq = window.matchMedia('(max-width: 991px)');
  var formVisible = false;

  function update() {
    var on = mq.matches && !formVisible;
    bar.classList.toggle('is-on', on);
    document.body.classList.toggle('pr-mb-on', on);
    bar.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  // "on screen" means the form reaches the upper part of the viewport, not
  // just its first pixels peeking in at the bottom
  new IntersectionObserver(function (entries) {
    formVisible = entries[0].isIntersecting;
    update();
  }, { rootMargin: '0px 0px -45% 0px' }).observe(form);

  if (mq.addEventListener) mq.addEventListener('change', update);

  // the sidebar price is filled in by the page script once the car has loaded
  var source = document.getElementById('car-price-sidebar');
  var target = document.getElementById('pr-mb-price');
  if (source && target) {
    var copy = function () {
      var text = (source.textContent || '').trim();
      if (/\d/.test(text)) target.textContent = text;
    };
    new MutationObserver(copy).observe(source, { childList: true, characterData: true, subtree: true });
    copy();
  }

  bar.querySelector('a').addEventListener('click', function (e) {
    e.preventDefault();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  update();
})();
