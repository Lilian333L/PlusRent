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

  /**
   * Every country, so nobody is ever turned away for calling from somewhere the
   * list forgot. The table is "ISO,dial,name" joined with a pipe and split at
   * load, which keeps the file small.
   */
  var RAW =
    "AF,93,Afghanistan|AL,355,Albania|DZ,213,Algeria|AS,1684,American Samoa|AD,376,Andorra|" +
    "AO,244,Angola|AI,1264,Anguilla|AG,1268,Antigua and Barbuda|AR,54,Argentina|AM,374,Armenia|" +
    "AW,297,Aruba|AU,61,Australia|AT,43,Austria|AZ,994,Azerbaijan|BS,1242,Bahamas|BH,973,Bahrain|" +
    "BD,880,Bangladesh|BB,1246,Barbados|BY,375,Belarus|BE,32,Belgium|BZ,501,Belize|BJ,229,Benin|" +
    "BM,1441,Bermuda|BT,975,Bhutan|BO,591,Bolivia|BA,387,Bosnia and Herzegovina|BW,267,Botswana|" +
    "BR,55,Brazil|BN,673,Brunei|BG,359,Bulgaria|BF,226,Burkina Faso|BI,257,Burundi|" +
    "KH,855,Cambodia|CM,237,Cameroon|CA,1,Canada|CV,238,Cape Verde|KY,1345,Cayman Islands|" +
    "CF,236,Central African Republic|TD,235,Chad|CL,56,Chile|CN,86,China|CO,57,Colombia|" +
    "KM,269,Comoros|CG,242,Congo|CD,243,Congo (DRC)|CR,506,Costa Rica|CI,225,Cote d Ivoire|" +
    "HR,385,Croatia|CU,53,Cuba|CW,599,Curacao|CY,357,Cyprus|CZ,420,Czechia|DK,45,Denmark|" +
    "DJ,253,Djibouti|DM,1767,Dominica|DO,1809,Dominican Republic|EC,593,Ecuador|EG,20,Egypt|" +
    "SV,503,El Salvador|GQ,240,Equatorial Guinea|ER,291,Eritrea|EE,372,Estonia|SZ,268,Eswatini|" +
    "ET,251,Ethiopia|FJ,679,Fiji|FI,358,Finland|FR,33,France|GF,594,French Guiana|" +
    "PF,689,French Polynesia|GA,241,Gabon|GM,220,Gambia|GE,995,Georgia|DE,49,Germany|" +
    "GH,233,Ghana|GI,350,Gibraltar|GR,30,Greece|GL,299,Greenland|GD,1473,Grenada|" +
    "GP,590,Guadeloupe|GU,1671,Guam|GT,502,Guatemala|GN,224,Guinea|GW,245,Guinea-Bissau|" +
    "GY,592,Guyana|HT,509,Haiti|HN,504,Honduras|HK,852,Hong Kong|HU,36,Hungary|IS,354,Iceland|" +
    "IN,91,India|ID,62,Indonesia|IR,98,Iran|IQ,964,Iraq|IE,353,Ireland|IL,972,Israel|IT,39,Italy|" +
    "JM,1876,Jamaica|JP,81,Japan|JO,962,Jordan|KZ,7,Kazakhstan|KE,254,Kenya|KI,686,Kiribati|" +
    "KW,965,Kuwait|KG,996,Kyrgyzstan|LA,856,Laos|LV,371,Latvia|LB,961,Lebanon|LS,266,Lesotho|" +
    "LR,231,Liberia|LY,218,Libya|LI,423,Liechtenstein|LT,370,Lithuania|LU,352,Luxembourg|" +
    "MO,853,Macao|MG,261,Madagascar|MW,265,Malawi|MY,60,Malaysia|MV,960,Maldives|ML,223,Mali|" +
    "MT,356,Malta|MH,692,Marshall Islands|MQ,596,Martinique|MR,222,Mauritania|MU,230,Mauritius|" +
    "MX,52,Mexico|FM,691,Micronesia|MD,373,Moldova|MC,377,Monaco|MN,976,Mongolia|" +
    "ME,382,Montenegro|MS,1664,Montserrat|MA,212,Morocco|MZ,258,Mozambique|MM,95,Myanmar|" +
    "NA,264,Namibia|NR,674,Nauru|NP,977,Nepal|NL,31,Netherlands|NC,687,New Caledonia|" +
    "NZ,64,New Zealand|NI,505,Nicaragua|NE,227,Niger|NG,234,Nigeria|MK,389,North Macedonia|" +
    "NO,47,Norway|OM,968,Oman|PK,92,Pakistan|PW,680,Palau|PS,970,Palestine|PA,507,Panama|" +
    "PG,675,Papua New Guinea|PY,595,Paraguay|PE,51,Peru|PH,63,Philippines|PL,48,Poland|" +
    "PT,351,Portugal|PR,1787,Puerto Rico|QA,974,Qatar|RE,262,Reunion|RO,40,Romania|RU,7,Russia|" +
    "RW,250,Rwanda|KN,1869,Saint Kitts and Nevis|LC,1758,Saint Lucia|VC,1784,Saint Vincent|" +
    "WS,685,Samoa|SM,378,San Marino|ST,239,Sao Tome and Principe|SA,966,Saudi Arabia|" +
    "SN,221,Senegal|RS,381,Serbia|SC,248,Seychelles|SL,232,Sierra Leone|SG,65,Singapore|" +
    "SK,421,Slovakia|SI,386,Slovenia|SB,677,Solomon Islands|SO,252,Somalia|ZA,27,South Africa|" +
    "KR,82,South Korea|SS,211,South Sudan|ES,34,Spain|LK,94,Sri Lanka|SD,249,Sudan|" +
    "SR,597,Suriname|SE,46,Sweden|CH,41,Switzerland|SY,963,Syria|TW,886,Taiwan|TJ,992,Tajikistan|" +
    "TZ,255,Tanzania|TH,66,Thailand|TL,670,Timor-Leste|TG,228,Togo|TO,676,Tonga|" +
    "TT,1868,Trinidad and Tobago|TN,216,Tunisia|TR,90,Turkiye|TM,993,Turkmenistan|TV,688,Tuvalu|" +
    "UG,256,Uganda|UA,380,Ukraine|AE,971,United Arab Emirates|GB,44,United Kingdom|" +
    "US,1,United States|UY,598,Uruguay|UZ,998,Uzbekistan|VU,678,Vanuatu|VA,379,Vatican City|" +
    "VE,58,Venezuela|VN,84,Vietnam|YE,967,Yemen|ZM,260,Zambia|ZW,263,Zimbabwe|";

  // National number length, without the dial code and without the trunk zero.
  // A single value means exactly that many digits; two values mean a range.
  // A country that is not listed here has no length rule at all and is judged
  // only by the international limit, so an unusual country can never turn a
  // real customer away.
  var LEN = {
    MD: [8], RO: [9], UA: [9], RU: [10], BY: [9], KZ: [10],
    IT: [9, 11], DE: [10, 11], FR: [9], GB: [10], ES: [9], PT: [9],
    IL: [8, 9], TR: [10], PL: [9], CZ: [9], SK: [9], AT: [10, 13],
    BE: [8, 9], NL: [9], IE: [7, 9], GR: [10], BG: [8, 9], HU: [8, 9],
    CH: [9], SE: [7, 13], NO: [8], DK: [8], FI: [5, 12], IS: [7],
    US: [10], CA: [10], EE: [7, 8], LV: [8], LT: [8], HR: [8, 9],
    SI: [8], RS: [8, 9], ME: [8], MK: [8], AL: [9], BA: [8],
    CY: [8], MT: [8], LU: [9], AE: [9], QA: [8], SA: [9],
  };

  // Shown first, because this is where PlusRent's customers actually call from.
  var TOP = ["MD", "RO", "UA", "RU", "IT", "DE", "FR", "GB", "ES", "PT", "IL", "TR"];

  // So that a Russian or Romanian speaker finds the country by the name they use
  var ALIAS = {
    MD: "moldova молдова", RO: "romania românia румыния", UA: "ukraine ucraina украина україна",
    RU: "russia rusia россия", IT: "italy italia италия", DE: "germany germania германия deutschland",
    FR: "france franta франция", GB: "uk england marea britanie великобритания англия",
    ES: "spain spania испания", PT: "portugal portugalia португалия", IL: "israel израиль",
    TR: "turkey turcia турция türkiye", US: "usa sua сша america",
    GR: "greece grecia греция", PL: "poland polonia польша", CZ: "czech cehia чехия",
    AT: "austria австрия", BE: "belgium belgia бельгия", NL: "netherlands olanda нидерланды",
    IE: "ireland irlanda ирландия", CH: "switzerland elvetia швейцария",
  };

  var COUNTRIES = (function () {
    var out = [];
    RAW.split("|").forEach(function (row) {
      if (!row) return;
      var bits = row.split(",");
      if (bits.length < 3) return;
      out.push({
        iso: bits[0],
        dial: bits[1],
        name: bits.slice(2).join(","),
        len: LEN[bits[0]] || null,
        alias: ALIAS[bits[0]] || "",
      });
    });
    var rank = {};
    TOP.forEach(function (iso, i) { rank[iso] = i; });
    out.sort(function (a, b) {
      var ra = rank[a.iso] === undefined ? 999 : rank[a.iso];
      var rb = rank[b.iso] === undefined ? 999 : rank[b.iso];
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    return out;
  })();

  var TEXT = {
    ro: {
      search: "Caută țara",
      hint: "Alege țara, apoi scrie numărul. Merge și cu prefix, și fără.",
      example: "Exemplu",
      wrongLength: "Un numar din {c} are {n} cifre. Ai scris {g}.",
      wrongLength: "Un număr din {c} are {n} cifre. Ai scris {g}.",
      tooShort: "Numărul pare prea scurt. Verifică-l, te rugăm.",
      tooLong: "Numărul pare prea lung. Verifică-l, te rugăm.",
      notANumber: "Scrie numărul de telefon la care te putem suna.",
      noCountry: "Alege țara numărului.",
      willSend: "Îți scriem pe WhatsApp sau Telegram, ori te sunăm la",
    },
    ru: {
      search: "Поиск страны",
      hint: "Выберите страну и введите номер. Можно с кодом и без.",
      example: "Например",
      wrongLength: "Номер из {c}: {n} цифр. Вы ввели {g}.",
      tooShort: "Номер выглядит коротким. Проверьте, пожалуйста.",
      tooLong: "Номер выглядит длинным. Проверьте, пожалуйста.",
      notANumber: "Введите номер, по которому мы сможем позвонить.",
      noCountry: "Выберите страну номера.",
      willSend: "Напишем в WhatsApp или Telegram, либо позвоним на",
    },
    en: {
      search: "Search country",
      hint: "Pick the country, then type the number. With or without the code.",
      example: "For example",
      wrongLength: "A {c} number has {n} digits. You typed {g}.",
      tooShort: "That looks too short. Please check it.",
      tooLong: "That looks too long. Please check it.",
      notANumber: "Enter a number we can call you on.",
      noCountry: "Choose the country for this number.",
      willSend: "We will message you on WhatsApp or Telegram, or call",
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

  // The countries customers actually call from, in the language of the page.
  // Everywhere else the English name is shown, which is still recognisable and
  // findable, and the search matches the local name either way.
  var LOCAL = {
    ro: { MD: "Moldova", RO: "România", UA: "Ucraina", RU: "Rusia", IT: "Italia",
          DE: "Germania", FR: "Franța", GB: "Marea Britanie", ES: "Spania",
          PT: "Portugalia", IL: "Israel", TR: "Turcia", PL: "Polonia",
          CZ: "Cehia", AT: "Austria", BE: "Belgia", NL: "Olanda", IE: "Irlanda",
          GR: "Grecia", BG: "Bulgaria", HU: "Ungaria", CH: "Elveția",
          SE: "Suedia", US: "Statele Unite", CA: "Canada", ES2: "" },
    ru: { MD: "Молдова", RO: "Румыния", UA: "Украина", RU: "Россия", IT: "Италия",
          DE: "Германия", FR: "Франция", GB: "Великобритания", ES: "Испания",
          PT: "Португалия", IL: "Израиль", TR: "Турция", PL: "Польша",
          CZ: "Чехия", AT: "Австрия", BE: "Бельгия", NL: "Нидерланды",
          IE: "Ирландия", GR: "Греция", BG: "Болгария", HU: "Венгрия",
          CH: "Швейцария", SE: "Швеция", US: "США", CA: "Канада" },
    en: {},
  };

  function displayName(c) {
    var m = LOCAL[lang()] || {};
    return m[c.iso] || c.name;
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
    var text = String(raw || "").trim();
    var digits = text.replace(/\D/g, "");
    if (!digits) return { ok: false, reason: "notANumber", e164: "", national: "" };

    // 00373… and 011373… are the international prefix, drop it
    var hadZeroZero = /^(00|011)/.test(digits);
    digits = digits.replace(/^00/, "").replace(/^011/, "");
    var explicit = text.charAt(0) === "+" || hadZeroZero;

    var national = digits;

    // A leading + or 00 is the caller stating this is the full international
    // number, so whatever dial code follows decides the country even when the
    // rest is still half typed: +380 86… switches to Ukraine immediately.
    if (explicit) {
      var stated = countryByDigits(digits);
      if (stated) {
        country = stated;
        national = digits.slice(stated.dial.length);
      }
    } else if (digits.indexOf(country.dial) === 0) {
      national = digits.slice(country.dial.length);
    }
    // Without a leading +, the number is read against the country that is
    // selected and nothing else. Guessing here got it wrong: a Romanian mobile
    // starts with 7, +7 is Russia's whole dial code, so 721234567 typed under
    // Romania was being sent to Russia. A bare number is a local number.

    // the trunk zero people keep in front of a local number
    national = national.replace(/^0+/, "");

    // the code typed twice, "+373 0373 69…"
    if (national.indexOf(country.dial) === 0 && national.length > country.dial.length + 6) {
      national = national.slice(country.dial.length).replace(/^0+/, "");
    }

    var res = { country: country, national: national, e164: "+" + country.dial + national };

    // E.164 allows at most 15 digits including the dial code; below 4 national
    // digits nothing in the world is reachable
    if (national.length < 4) return Object.assign(res, { ok: false, reason: "tooShort" });
    if (national.length + country.dial.length > 15) {
      return Object.assign(res, { ok: false, reason: "tooLong" });
    }

    if (country.len && country.len.length) {
      var min = country.len[0];
      var max = country.len.length > 1 ? country.len[1] : country.len[0];
      res.expected = min === max ? String(min) : min + "–" + max;
      res.got = national.length;
      if (national.length < min) return Object.assign(res, { ok: false, reason: "wrongLength" });
      if (national.length > max) return Object.assign(res, { ok: false, reason: "wrongLength" });
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

    var fallback = byIso(input.dataset.country || "MD");
    var chosen = null;   // set only when the visitor picks from the menu
    var country = fallback;

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

    // and which flag the customer picked. +1 and +7 each cover two countries,
    // so the dial code alone cannot say whether a number is Russian or Kazakh;
    // this can, because the person chose.
    var hiddenIso = document.createElement("input");
    hiddenIso.type = "hidden";
    hiddenIso.name = input.name ? input.name + "_country" : "phone_country";
    wrap.parentNode.insertBefore(hiddenIso, note);

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
      pick.setAttribute("aria-label", displayName(country) + " +" + country.dial);
      input.placeholder = EXAMPLE[country.iso] || "";
    }

    function drawList(filter) {
      list.innerHTML = "";
      var q = (filter || "").trim().toLowerCase();
      COUNTRIES.filter(function (c) {
        if (!q) return true;
        var num = q.replace(/[^0-9]/g, "");
        return c.name.toLowerCase().indexOf(q) !== -1 ||
          (c.alias && c.alias.indexOf(q) !== -1) ||
          c.iso.toLowerCase().indexOf(q) === 0 ||
          (num && c.dial.indexOf(num) === 0);
      }).forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pr-phone-opt";
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", c.iso === country.iso ? "true" : "false");
        b.innerHTML = '<span class="pr-phone-iso"></span><span class="n"></span><span class="d"></span>';
        b.querySelector(".pr-phone-iso").textContent = c.iso;
        b.querySelector(".n").textContent = displayName(c);
        b.querySelector(".d").textContent = "+" + c.dial;
        b.addEventListener("click", function () {
          country = c;
          chosen = c;
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
      // A country detected from a pasted +code must not outlive that number.
      // Without this, pasting +679… and then typing a local number sent it to
      // Fiji: the field kept a country the visitor never chose.
      var text = (input.value || "").trim();
      var statesItsOwn = text.charAt(0) === "+" || /^00\d/.test(text.replace(/\s/g, ""));
      if (!statesItsOwn) country = chosen || fallback;

      var r = parse(input.value, country);

      // Follow the country the number states as soon as it states it, while it
      // is still being typed: +380 8… flips to Ukraine straight away rather
      // than waiting for the number to be complete.
      if (r.country && r.country.iso !== country.iso) {
        country = r.country;
      }
      drawPick();

      hidden.value = r.ok ? r.e164 : "";
      input.dataset.e164 = hidden.value;
      hiddenIso.value = country ? country.iso : "";
      input.dataset.country = hiddenIso.value;
      // the page's own submit-state listener runs on input, so tell it whenever
      // the verdict changes for a reason other than a keystroke
      if (input.dataset.lastVerdict !== String(r.ok)) {
        input.dataset.lastVerdict = String(r.ok);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      function setState(bad) {
        wrap.classList.toggle("is-bad", !!bad);
        input.setAttribute("aria-invalid", bad ? "true" : "false");
        input.classList.toggle("error_input", !!bad);
        var legacy = input.closest(".pr-phone-wrap");
        if (legacy) legacy.classList.toggle("is-valid", !bad && !!input.value.trim());
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
        var msg = t(r.reason);
        if (r.reason === "wrongLength") {
          msg = msg.replace("{c}", displayName(r.country))
                   .replace("{n}", r.expected)
                   .replace("{g}", r.got);
        }
        note.textContent = msg;
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

  /**
   * The number to actually send: international, with the country code.
   *
   * The visible field holds what the person typed, which is their number the
   * way they say it out loud, without a country code. The widget works out the
   * full form and keeps it on the element and in a hidden twin, and until now
   * nothing read either: every booking arrived with the country code missing,
   * so a number could not be dialled back.
   *
   * Takes an element or a selector. Falls back to the typed value, so a form
   * whose widget has not started yet still sends something rather than nothing.
   */
  function full(el) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return "";
    if (el.dataset && el.dataset.e164) return el.dataset.e164;
    if (el.form && el.name) {
      var twin = el.form.querySelector('input[name="' + el.name + '_e164"]');
      if (twin && twin.value) return twin.value;
    }
    return (el.value || "").trim();
  }

  window.PhoneInput = { enhance: enhance, parse: parse, countries: COUNTRIES, start: start, full: full };
})();
