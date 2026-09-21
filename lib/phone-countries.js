/**
 * Which country a phone number belongs to.
 *
 * The same table the phone widget uses in the browser, kept here so the server
 * can name the country on a number whatever form it arrived through, including
 * one typed before the widget loaded. The source of truth is this file and
 * public/js/phone-input.js; they carry the same list and both are checked by
 * scripts/check-phone-countries.js.
 *
 * Two dial codes belong to two countries each, +1 and +7. When the browser
 * tells us which flag the customer picked we use that; otherwise both names
 * are given rather than a guess.
 */

const RAW =
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
  "VE,58,Venezuela|VN,84,Vietnam|YE,967,Yemen|ZM,260,Zambia|ZW,263,Zimbabwe";

const COUNTRIES = RAW.split("|").filter(Boolean).map((row) => {
  const bits = row.split(",");
  return { iso: bits[0], dial: bits[1], name: bits.slice(2).join(",") };
});

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

const BY_DIAL = COUNTRIES.reduce((map, c) => {
  if (!map.has(c.dial)) map.set(c.dial, []);
  map.get(c.dial).push(c);
  return map;
}, new Map());

/** The two regional indicator letters that a phone renders as a flag. */
function flag(iso) {
  if (!/^[A-Z]{2}$/.test(iso || "")) return "";
  return String.fromCodePoint(
    0x1f1e6 + iso.charCodeAt(0) - 65,
    0x1f1e6 + iso.charCodeAt(1) - 65
  );
}

/**
 * Name the country behind a number.
 *
 * `iso` is what the browser reported, when it did. Without it the dial code is
 * read longest first, so +1684 is American Samoa rather than the United States.
 * Returns null when the number carries no country code at all, which is the
 * case worth shouting about rather than papering over.
 */
function describe(phone, iso) {
  if (iso && BY_ISO.has(String(iso).toUpperCase())) {
    const c = BY_ISO.get(String(iso).toUpperCase());
    return { iso: c.iso, name: c.name, flag: flag(c.iso), certain: true };
  }

  const digits = String(phone || "").trim();
  if (!digits.startsWith("+")) return null;
  const bare = digits.slice(1).replace(/\D/g, "");
  if (!bare) return null;

  for (let len = 4; len >= 1; len--) {
    const dial = bare.slice(0, len);
    if (!BY_DIAL.has(dial)) continue;
    const hits = BY_DIAL.get(dial);
    if (hits.length === 1) {
      return { iso: hits[0].iso, name: hits[0].name, flag: flag(hits[0].iso), certain: true };
    }
    // +1 and +7 each cover two countries; say both rather than pick one
    return {
      iso: hits.map((c) => c.iso).join("/"),
      name: hits.map((c) => c.name).join(" or "),
      flag: "",
      certain: false,
    };
  }
  return null;
}

// National number length, without the dial code and without the trunk zero.
// The same table the widget carries, so both copies judge a number the same
// way; scripts/check-phone-countries.js keeps them in step. A country that is
// not listed has no length rule and is judged only by the E.164 limit.
const LEN = {
  MD: [8], RO: [9], UA: [9], RU: [10], BY: [9], KZ: [10],
  IT: [9, 11], DE: [10, 11], FR: [9], GB: [10], ES: [9], PT: [9],
  IL: [8, 9], TR: [10], PL: [9], CZ: [9], SK: [9], AT: [10, 13],
  BE: [8, 9], NL: [9], IE: [7, 9], GR: [10], BG: [8, 9], HU: [8, 9],
  CH: [9], SE: [7, 13], NO: [8], DK: [8], FI: [5, 12], IS: [7],
  US: [10], CA: [10], EE: [7, 8], LV: [8], LT: [8], HR: [8, 9],
  SI: [8], RS: [8, 9], ME: [8], MK: [8], AL: [9], BA: [8],
  CY: [8], MT: [8], LU: [9], AE: [9], QA: [8], SA: [9],
};

/**
 * How long a national number from this country may be.
 *
 * `iso` may be a two letter code, or a dial code when the country is not known
 * (+1 and +7 each cover two countries, so the widest of the two is taken).
 * A country with no rule is judged only by the E.164 limit, so an unusual
 * country can never have digits taken off it by mistake.
 */
function lengthRule(iso) {
  let rules = [];
  if (iso && LEN[iso]) rules = [LEN[iso]];
  else if (iso && BY_DIAL.has(iso)) {
    rules = BY_DIAL.get(iso).map((c) => LEN[c.iso]).filter(Boolean);
  }
  if (!rules.length) return { min: 4, max: 15 };
  const mins = rules.map((r) => r[0]);
  const maxes = rules.map((r) => (r.length > 1 ? r[1] : r[0]));
  return { min: Math.min(...mins), max: Math.max(...maxes) };
}

/** Whether a national number of this many digits is a plausible one. */
function plausible(count, iso) {
  const rule = lengthRule(iso);
  return count >= rule.min && count <= rule.max;
}

/** The national trunk prefix people put in front of a local number. */
const TRUNK = { RU: "8", KZ: "8", BY: "8" };

/**
 * One number, one country code, whatever shape it arrived in.
 *
 * The browser normally hands over a clean +E.164 string, but not always: an
 * older cached script, a customer who pasted "+7 +7 985...", a form that sent
 * the typed value and the dial code both. Telegram then showed the code twice
 * and the owner could not tell which digits to dial. So every number is put
 * back into one canonical form here, on the server, where nothing can be
 * skipped by a stale asset.
 *
 * Returns "" when there is nothing usable, and the digits unchanged (without a
 * leading +) when no country code can be worked out, so the message can still
 * say the number is incomplete rather than invent a country for it.
 */
function normalize(phone, iso) {
  const text = String(phone || "").trim();
  if (!text) return "";

  let digits = text.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // A leading + or 00 is the caller stating this is the full international
  // number. Without it, and without a country from the browser, a bare local
  // number stays a bare local number: guessing a country from digits that
  // happen to look like a dial code is how 69 11 36 22 became Micronesia.
  const explicit = text.charAt(0) === "+" || /^(00|011)/.test(digits);
  digits = digits.replace(/^011/, "").replace(/^00/, "");

  const chosen = iso && BY_ISO.has(String(iso).toUpperCase())
    ? BY_ISO.get(String(iso).toUpperCase())
    : null;

  // The longest dial code the digits start with, so 373 wins over 37 and 3.
  let carrier = null;
  for (let len = 4; len >= 1; len--) {
    if (BY_DIAL.has(digits.slice(0, len))) { carrier = digits.slice(0, len); break; }
  }

  const dial = chosen ? chosen.dial : (explicit ? carrier : null);
  if (!dial) return digits;

  // For the length rule: the country the visitor picked when we have it, the
  // dial code otherwise.
  const rule = chosen ? chosen.iso : dial;
  const trunkIso = chosen ? chosen.iso : null;

  // Take the dial code off for as long as the shorter number is the plausible
  // one. That is how "+7+79858261455" and "+373 373 69..." stop arriving with
  // the code twice, while a Kazakh number, whose national part genuinely
  // starts with the dial code 7, keeps every digit it needs.
  let national = stripTrunk(digits, trunkIso);
  for (let round = 0; round < 4; round++) {
    if (national.indexOf(dial) !== 0) break;
    const rest = stripTrunk(national.slice(dial.length), trunkIso);
    const restFits = plausible(rest.length, rule);
    const keepFits = plausible(national.length, rule);
    if (keepFits && !restFits) break;              // it is already the number
    if (restFits) { national = rest; continue; }   // the code was stated again
    if (!keepFits && rest.length >= lengthRule(rule).min) { national = rest; continue; }
    break;                                          // neither reading is better
  }
  if (!national) return "";

  return "+" + dial + national;
}

/**
 * Drop the 0 or the 8 that belongs to dialling inside the country.
 *
 * Only ever when the number is too long without it: Russia's 8 800 numbers
 * start with the same 8 that Russians put in front of a local number, and
 * taking it off one of those would leave a number nobody can call.
 */
function stripTrunk(national, iso) {
  let out = String(national || "");
  if (!out) return out;
  const rule = lengthRule(iso);

  const noZero = out.replace(/^0+/, "");
  if (noZero && (out.length > rule.max || !plausible(out.length, iso))) out = noZero;

  const trunk = iso && TRUNK[iso];
  if (trunk && out.indexOf(trunk) === 0 && out.length > rule.max) {
    const rest = out.slice(trunk.length);
    if (plausible(rest.length, iso)) out = rest;
  }
  return out;
}

module.exports = { COUNTRIES, LEN, describe, flag, normalize };
