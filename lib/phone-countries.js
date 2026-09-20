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

module.exports = { COUNTRIES, describe, flag };
