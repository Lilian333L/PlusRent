/**
 * Frame every car photo the same way, whatever shape it was uploaded in.
 *
 * The cards are 4:3. A photo uploaded at 4:3 fills them exactly. A square one
 * has to lose a third of its height, and taking that off the middle put the
 * car low and small with a band of empty hedge above it, so the Jetta and the
 * M8 did not match the rest of the fleet.
 *
 * There is no single crop position that is right for every photo, so this does
 * not guess one. It reads the picture, finds the band where the car actually
 * is, and moves the crop so that band sits in the middle of the card. A photo
 * added later is framed on its own terms, whatever its shape.
 *
 * It is careful about failing: the result is clamped to a sane range, and if
 * the pixels cannot be read for any reason the photo simply keeps the default
 * framing rather than ending up somewhere absurd.
 */
(function () {
  "use strict";

  var ATTR = "data-framed";
  var SAMPLE_W = 48;      // enough to find the car, cheap to process
  var MIN_POS = 0.30;
  var MAX_POS = 0.90;
  var TOLERANCE = 0.04;   // treat as "already the right shape" within this

  function boxRatio(box) {
    var r = box.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r.width / r.height;
    return 4 / 3;
  }

  /**
   * Where the subject sits vertically, as a fraction from 0 (top) to 1.
   *
   * A car photographed against a hedge gives two strong horizontal edges, the
   * roofline and the shadow under the sills. Rows that differ most from the row
   * above carry the car; the hedge and the road are comparatively even. The
   * centre of mass of that difference is a good estimate of where the car is,
   * and it is blended with the middle of the frame so a noisy photo cannot pull
   * the crop far from centre.
   */
  function subjectCentre(img) {
    var h = Math.max(8, Math.round(SAMPLE_W / (img.naturalWidth / img.naturalHeight)));
    var c = document.createElement("canvas");
    c.width = SAMPLE_W;
    c.height = h;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SAMPLE_W, h);

    var data;
    try {
      data = ctx.getImageData(0, 0, SAMPLE_W, h).data;
    } catch (e) {
      return null; // the canvas is tainted, leave the photo alone
    }

    var rows = new Float64Array(h);
    var total = 0;
    for (var y = 1; y < h; y++) {
      var sum = 0;
      for (var x = 0; x < SAMPLE_W; x++) {
        var i = (y * SAMPLE_W + x) * 4;
        var j = ((y - 1) * SAMPLE_W + x) * 4;
        sum += Math.abs(data[i] - data[j]) +
               Math.abs(data[i + 1] - data[j + 1]) +
               Math.abs(data[i + 2] - data[j + 2]);
      }
      rows[y] = sum;
      total += sum;
    }
    if (total <= 0) return null;

    var acc = 0;
    for (var k = 0; k < h; k++) acc += rows[k] * ((k + 0.5) / h);
    var centre = acc / total;

    // Mostly the measurement, with a little pull toward the middle so a noisy
    // photo cannot send the crop to an extreme. The weight was chosen by
    // putting the square uploads next to a 4:3 one and matching how the car
    // sits in the frame: less than this left a band of hedge above the car,
    // more than this pushed its roof against the top edge.
    return 0.85 * centre + 0.15 * 0.5;
  }

  /**
   * The object-position that puts `centre` of the image in the middle of a box
   * of ratio `R`, given the image's own ratio `r`.
   */
  function positionFor(centre, r, R) {
    if (r >= R) return null;            // nothing is cropped vertically
    var over = 1 / r - 1 / R;           // overflow, in units of box width
    if (over <= 0) return null;
    var p = (centre / r - 1 / (2 * R)) / over;
    return Math.min(MAX_POS, Math.max(MIN_POS, p));
  }

  function frame(img) {
    if (!img || img.getAttribute(ATTR)) return;
    var box = img.closest(".d-img");
    if (!box || !img.naturalWidth || !img.naturalHeight) return;

    var r = img.naturalWidth / img.naturalHeight;
    var R = boxRatio(box);
    if (Math.abs(r - R) <= TOLERANCE) {
      img.setAttribute(ATTR, "same-shape");
      return;
    }

    var centre = subjectCentre(img);
    if (centre === null) {
      img.setAttribute(ATTR, "unreadable");
      return;
    }
    var p = positionFor(centre, r, R);
    if (p === null) {
      img.setAttribute(ATTR, "no-crop");
      return;
    }
    img.style.setProperty("object-position", "50% " + (p * 100).toFixed(1) + "%", "important");
    img.setAttribute(ATTR, (p * 100).toFixed(1));
  }

  function prepare(img) {
    if (img.dataset.framePrep) return;
    img.dataset.framePrep = "1";
    // needed before the pixels can be read; the images allow it
    if (!img.crossOrigin && /^https?:/.test(img.src) &&
        img.src.indexOf(location.origin) !== 0) {
      var src = img.src;
      img.crossOrigin = "anonymous";
      img.src = src; // restart the load with the attribute set
    }
    if (img.complete && img.naturalWidth) frame(img);
    else img.addEventListener("load", function () { frame(img); }, { once: true });
  }

  function scan() {
    document.querySelectorAll(".d-img img").forEach(prepare);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  // the catalogue and the home page grid render their cards from the API, so
  // watch for cards arriving rather than assuming they are here at load
  if (typeof MutationObserver !== "undefined") {
    var mo = new MutationObserver(function () { scan(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener("resize", function () {
    clearTimeout(window.__frameT);
    window.__frameT = setTimeout(function () {
      document.querySelectorAll(".d-img img[" + ATTR + "]").forEach(function (i) {
        i.removeAttribute(ATTR);
      });
      scan();
    }, 300);
  });

  window.CarPhotoFrame = { scan: scan, frame: frame, subjectCentre: subjectCentre };
})();
