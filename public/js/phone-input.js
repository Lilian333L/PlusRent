/**
 * The phone field: a country in front of the number, and a parser that forgives.
 *
 * People write their number the way they say it out loud, and every one of these
 * is a real customer who must get through:
 *
 *   069 11 36 2        a local number, no code, the commonest case
 *   +373 69 11 36 2    the full number
 *   +373060911362      the code typed again in front of a number that starts 0
 *   00373 69113 62     the old international prefix
 *   0040 7xx …         a Romanian mobile, because half the diaspora has one
 *
 * So the country picker is a help, not a gate: it sets the default and shows
 * what is expected, and whatever gets typed is read against it and normalised
 * to +373XXXXXXXX before it is sent. The number is only refused when it cannot
 * be a phone number at all, never for being written in an unexpected shape.
 *
 * No dependency and no CDN: the country list is small on purpose, the countries
 * PlusRent's customers actually call from, Moldova first. No flag emoji either:
 * Windows draws them as a two-letter box, so for a large share of visitors they
 * would not have been flags at all.
 */
(function () {
  "use strict";

  // dial code, flag, and how many digits the national part has (a list means
  // several lengths are valid, null means do not check the length)
  var COUNTRIES = [
    { iso: "MD", name: "Moldova", dial: "373", len: [8] },
    { iso: "RO", name: "România", dial: "40", len: [9] },
    { iso: "UA", name: "Україна", dial: "380", len: [9] },
    { iso: "RU", name: "Россия", dial: "7", len: [10] },
    { iso: "IT", name: "Italia", dial: "39", len: [9, 10] },
    { iso: "DE", name: "Deutschland", dial: "49", len: [10, 11] },
    { iso: "FR", name: "France", dial: "33", len: [9] },
    { iso: "GB", name: "United Kingdom", dial: "44", len: [10] },
    { iso: "ES", name: "España", dial: "34", len: [9] },
    { iso: "PT", name: "Portugal", dial: "351", len: [9] },
    { iso: "IL", name: "ישראל", dial: "972", len: [9] },
    { iso: "TR", name: "Türkiye", dial: "90", len: [10] },
    { iso: "PL", name: "Polska", dial: "48", len: [9] },
    { iso: "CZ", name: "Česko", dial: "420", len: [9] },
    { iso: "AT", name: "Österreich", dial: "43", len: [10, 11] },
    { iso: "BE", name: "Belgique", dial: "32", len: [9] },
    { iso: "NL", name: "Nederland", dial: "31", len: [9] },
    { iso: "IE", name: "Ireland", dial: "353", len: [9] },
    { iso: "GR", name: "Ελλάδα", dial: "30", len: [10] },
    { iso: "BG", name: "България", dial: "359", len: [9] },
    { iso: "HU", name: "Magyarország", dial: "36", len: [9] },
    { iso: "CH", name: "Schweiz", dial: "41", len: [9] },
    { iso: "SE", name: "Sverige", dial: "46", len: [9] },
    { iso: "US", name: "United States", dial: "1", len: [10] },
  ];

  var TEXT = {
    ro: {
      search: "Caută țara",
      hint: "Alege țara, apoi scrie numărul. Merge și cu prefix, și fără.",
      example: "Exemplu",
      tooShort: "Numărul pare prea scurt. Verifică-l, te rugăm.",
      tooLong: "Numărul pare prea lung. Verifică-l, te rugăm.",
      notANumber: "Scrie numărul de telefon la care te putem suna.",
      noCountry: "Alege țara numărului.",
      willSend: "Te sunăm la",
    },
    ru: {
      search: "Поиск страны",
      hint: "Выберите страну и введите номер. Можно с кодом и без.",
      example: "Например",
      tooShort: "Номер выглядит коротким. Проверьте, пожалуйста.",
      tooLong: "Номер выглядит длинным. Проверьте, пожалуйста.",
      notANumber: "Введите номер, по которому мы сможем позвонить.",
      noCountry: "Выберите страну номера.",
      willSend: "Позвоним на",
    },
    en: {
      search: "Search country",
      hint: "Pick the country, then type the number. With or without the code.",
      example: "For example",
      tooShort: "That looks too short. Please check it.",
      tooLong: "That looks too long. Please check it.",
      notANumber: "Enter a number we can call you on.",
      noCountry: "Choose the country for this number.",
      willSend: "We will call",
    },
  };

  var EXAMPLE = { MD: "69 123 456", RO: "721 234 567", UA: "67 123 4567", RU: "912 345 67 89" };

  function lang() {
    var l = (document.documentElement.lang || "ro").slice(0, 2);
    return TEXT[l] ? l : "ro";
  }
  function t(key) {
    return TEXT[lang()][key];
  }

  function byIso(iso) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].iso === iso) return COUNTRIES[i];
    return COUNTRIES[0];
  }

  /** Longest dial code that the digits start with, so 373 wins over 37 and 3. */
  function countryByDigits(digits) {
    var best = null;
    for (var i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      if (digits.indexOf(c.dial) === 0 && (!best || c.dial.length > best.dial.length)) best = c;
    }
    return best;
  }

  /**
   * Read whatever was typed against the chosen country.
   *
   * Handles the case the owner sees most: +373 selected and "060911362" typed,
   * where the leading 0 is the national trunk prefix and has to go, and the
   * case where the dial code was typed again inside the number.
   */
  function parse(raw, country) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return { ok: false, reason: "notANumber", e164: "", national: "" };

    // 00373… and 011373… are the international prefix, drop it
    digits = digits.replace(/^00/, "").replace(/^011/, "");

    var national = digits;

    if (digits.indexOf(country.dial) === 0) {
      national = digits.slice(country.dial.length);
    } else {
      var other = countryByDigits(digits);
      // only believe another country if what follows is a plausible number
      if (other && other.iso !== country.iso && digits.length - other.dial.length >= 8) {
        country = other;
        national = digits.slice(other.dial.length);
      }
    }

    // the trunk zero people keep in front of a local number
    national = national.replace(/^0+/, "");

    // the code typed twice, "+373 0373 69…"
    if (national.indexOf(country.dial) === 0 && national.length > country.dial.length + 6) {
      national = national.slice(country.dial.length).replace(/^0+/, "");
    }

    var res = { country: country, national: national, e164: "+" + country.dial + national };

    if (national.length < 6) return Object.assign(res, { ok: false, reason: "tooShort" });
    if (national.length > 13) return Object.assign(res, { ok: false, reason: "tooLong" });

    if (country.len && country.len.length) {
      var min = Math.min.apply(null, country.len);
      var max = Math.max.apply(null, country.len);
      // one digit either side of the expected length is accepted: a real
      // customer must never be blocked by our table being slightly off
      if (national.length < min - 1) return Object.assign(res, { ok: false, reason: "tooShort" });
      if (national.length > max + 1) return Object.assign(res, { ok: false, reason: "tooLong" });
    }
    return Object.assign(res, { ok: true });
  }

  function css() {
    if (document.getElementById("pr-phone-css")) return;
    var st = document.createElement("style");
    st.id = "pr-phone-css";
    st.textContent = [
      ".pr-phone{position:relative;display:flex;align-items:stretch;width:100%;",
      "border:1px solid var(--pr-phone-border,#d6d3d1);border-radius:12px;background:#fff;",
      "transition:border-color .15s,box-shadow .15s}",
      ".pr-phone:focus-within{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.16)}",
      ".pr-phone.is-bad{border-color:#dc2626}",
      ".pr-phone.is-bad:focus-within{box-shadow:0 0 0 3px rgba(220,38,38,.14)}",
      ".pr-phone-pick{display:flex;align-items:center;gap:7px;padding:0 12px;border:0;background:transparent;",
      "cursor:pointer;font:inherit;color:#1c1917;border-right:1px solid #e7e5e4;border-radius:12px 0 0 12px;",
      "min-height:52px;white-space:nowrap;-webkit-tap-highlight-color:transparent}",
      ".pr-phone-pick:hover{background:#fafaf9}",
      ".pr-phone-pick:focus-visible{outline:2px solid #f59e0b;outline-offset:-2px}",
      ".pr-phone-iso{font-size:.72rem;font-weight:700;letter-spacing:.03em;color:#57534e;",
      "background:#f5f5f4;border-radius:5px;padding:3px 5px;line-height:1;flex:none}",
      ".pr-phone-dial{font-weight:700;font-variant-numeric:tabular-nums}",
      ".pr-phone-caret{width:7px;height:7px;border-right:2px solid #a8a29e;border-bottom:2px solid #a8a29e;",
      "transform:rotate(45deg);margin-top:-3px;flex:none}",
      ".pr-phone input{flex:1;min-width:0;border:0;background:transparent;padding:0 14px;font:inherit;",
      "color:#1c1917;min-height:52px;border-radius:0 12px 12px 0}",
      ".pr-phone input:focus{outline:none}",
      ".pr-phone-note{display:block;margin-top:6px;font-size:.82rem;line-height:1.45;color:#78716c}",
      ".pr-phone-note.is-bad{color:#b91c1c}",
      ".pr-phone-note.is-ok{color:#15803d}",
      ".pr-phone-note b{font-variant-numeric:tabular-nums}",
      ".pr-phone-menu{position:absolute;z-index:1200;top:calc(100% + 6px);left:0;width:min(330px,100%);",
      "max-height:310px;overflow:auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px;",
      "box-shadow:0 18px 40px rgba(0,0,0,.16);padding:8px;display:none}",
      ".pr-phone-menu.open{display:block}",
      ".pr-phone-search{width:100%;padding:9px 11px;border:1px solid #e7e5e4;border-radius:9px;",
      "font:inherit;margin-bottom:6px}",
      ".pr-phone-search:focus{outline:2px solid #f59e0b;outline-offset:-1px}",
      ".pr-phone-opt{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;",
      "background:transparent;cursor:pointer;font:inherit;text-align:left;border-radius:8px;color:#1c1917}",
      ".pr-phone-opt:hover,.pr-phone-opt.active{background:#fffbeb}",
      ".pr-phone-opt[aria-selected=true]{background:#fef3c7;font-weight:700}",
      ".pr-phone-opt .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}",
      ".pr-phone-opt .d{color:#78716c;font-variant-numeric:tabular-nums}",
      "@media (max-width:480px){.pr-phone-menu{width:100%}}",
    ].join("");
    document.head.appendChild(st);
  }

  function enhance(input) {
    if (!input || input.dataset.prPhone) return;
    input.dataset.prPhone = "1";
    css();

    var country = byIso(input.dataset.country || "MD");

    var wrap = document.createElement("div");
    wrap.className = "pr-phone";
    input.parentNode.insertBefore(wrap, input);

    var pick = document.createElement("button");
    pick.type = "button";
    pick.className = "pr-phone-pick";
    pick.setAttribute("aria-haspopup", "listbox");
    pick.setAttribute("aria-expanded", "false");
    wrap.appendChild(pick);
    wrap.appendChild(input);

    // The note is the field's own message, tied to the input so a screen reader
    // reads it with the field rather than leaving the error only as a red border.
    var note = document.createElement("small");
    note.className = "pr-phone-note";
    note.id = (input.id || "phone") + "-note";
    wrap.parentNode.insertBefore(note, wrap.nextSibling);
    var described = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (described.indexOf(note.id) === -1) described.push(note.id);
    input.setAttribute("aria-describedby", described.join(" "));

    var menu = document.createElement("div");
    menu.className = "pr-phone-menu";
    menu.setAttribute("role", "listbox");
    wrap.appendChild(menu);

    var search = document.createElement("input");
    search.type = "text";
    search.className = "pr-phone-search";
    search.placeholder = t("search");
    search.setAttribute("aria-label", t("search"));
    menu.appendChild(search);

    var list = document.createElement("div");
    menu.appendChild(list);

    // the value the form actually submits, normalised
    var hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = input.name ? input.name + "_e164" : "phone_e164";
    wrap.parentNode.insertBefore(hidden, note);

    function drawPick() {
      pick.innerHTML = "";
      var f = document.createElement("span");
      f.className = "pr-phone-iso";
      f.textContent = country.iso;
      var d = document.createElement("span");
      d.className = "pr-phone-dial";
      d.textContent = "+" + country.dial;
      var c = document.createElement("span");
      c.className = "pr-phone-caret";
      pick.appendChild(f);
      pick.appendChild(d);
      pick.appendChild(c);
      pick.setAttribute("aria-label", country.name + " +" + country.dial);
      input.placeholder = EXAMPLE[country.iso] || "";
    }

    function drawList(filter) {
      list.innerHTML = "";
      var q = (filter || "").trim().toLowerCase();
      COUNTRIES.filter(function (c) {
        return !q || c.name.toLowerCase().indexOf(q) !== -1 ||
          c.dial.indexOf(q.replace("+", "")) === 0 || c.iso.toLowerCase().indexOf(q) === 0;
      }).forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pr-phone-opt";
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", c.iso === country.iso ? "true" : "false");
        b.innerHTML = '<span class="pr-phone-iso"></span><span class="n"></span><span class="d"></span>';
        b.querySelector(".pr-phone-iso").textContent = c.iso;
        b.querySelector(".n").textContent = c.name;
        b.querySelector(".d").textContent = "+" + c.dial;
        b.addEventListener("click", function () {
          country = c;
          drawPick();
          close();
          input.focus();
          validate();
        });
        list.appendChild(b);
      });
    }

    function open() {
      drawList("");
      search.value = "";
      menu.classList.add("open");
      pick.setAttribute("aria-expanded", "true");
      setTimeout(function () { search.focus(); }, 30);
    }
    function close() {
      menu.classList.remove("open");
      pick.setAttribute("aria-expanded", "false");
    }

    pick.addEventListener("click", function () {
      menu.classList.contains("open") ? close() : open();
    });
    search.addEventListener("input", function () { drawList(search.value); });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); pick.focus(); }
      if (e.key === "Enter") {
        e.preventDefault();
        var first = list.querySelector(".pr-phone-opt");
        if (first) first.click();
      }
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) close();
    });

    function validate(quiet) {
      var r = parse(input.value, country);
      hidden.value = r.ok ? r.e164 : "";
      input.dataset.e164 = hidden.value;

      function setState(bad) {
        wrap.classList.toggle("is-bad", !!bad);
        input.setAttribute("aria-invalid", bad ? "true" : "false");
        // role=alert only while there is an error, so the hint is not announced
        // every time somebody types a digit
        if (bad) note.setAttribute("role", "alert");
        else note.removeAttribute("role");
      }

      if (!input.value.trim()) {
        setState(false);
        note.className = "pr-phone-note";
        note.textContent = t("hint");
        return r;
      }
      if (r.ok) {
        // the country was corrected from what was typed, show it
        if (r.country.iso !== country.iso) { country = r.country; drawPick(); }
        setState(false);
        note.className = "pr-phone-note is-ok";
        note.innerHTML = "";
        note.appendChild(document.createTextNode(t("willSend") + " "));
        var b = document.createElement("b");
        b.textContent = r.e164;
        note.appendChild(b);
      } else if (quiet) {
        setState(false);
        note.className = "pr-phone-note";
        note.textContent = t("hint");
      } else {
        setState(true);
        note.className = "pr-phone-note is-bad";
        note.textContent = t(r.reason);
      }
      return r;
    }

    input.addEventListener("input", function () { validate(true); });
    input.addEventListener("blur", function () { validate(false); });
    input.setAttribute("inputmode", "tel");
    input.setAttribute("autocomplete", "tel-national");

    drawPick();
    validate(true);

    input.prPhone = {
      validate: function () { return validate(false); },
      value: function () { return parse(input.value, country); },
    };
  }

  function start() {
    document.querySelectorAll('input[type="tel"]').forEach(function (el) {
      if (el.closest("#mobile-filter-overlay")) return;
      enhance(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  setTimeout(start, 1200);

  window.PhoneInput = { enhance: enhance, parse: parse, countries: COUNTRIES, start: start };
})();
