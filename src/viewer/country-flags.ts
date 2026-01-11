/**
 * Country code and flag emoji mappings for PWA riders
 *
 * Maps PWA-specific country codes (from sail numbers) to ISO 3166-1 alpha-2 codes,
 * then to flag emojis. Handles multiple PWA codes mapping to the same country.
 */

// Map PWA country codes to ISO 3166-1 alpha-2 codes
const PWA_TO_ISO_MAP: Record<string, string> = {
  // United Kingdom variants
  K: "GB",
  GB: "GB",
  GBR: "GB",
  KC: "GB",
  KA: "GB",
  KV: "GB",
  KO: "GB",
  KBA: "GB",
  KEN: "GB", // Kenya code used for UK rider

  // Italy variants
  IT: "IT",
  I: "IT",
  ITA: "IT",
  ita: "IT",

  // Germany variants
  DE: "DE",
  GER: "DE",
  G: "DE", // Based on German names in data
  D: "DK", // Denmark, not Germany (based on Danish names)

  // Netherlands
  NL: "NL",
  NED: "NL",

  // France
  FR: "FR",
  F: "FR",
  FRA: "FR",

  // Spain
  ES: "ES",
  E: "ES",
  ESP: "ES",

  // United States
  US: "US",
  USA: "US",

  // Japan
  JP: "JP",
  J: "JP",
  JPN: "JP",

  // Croatia
  HR: "HR",
  CRO: "HR",
  Cro: "HR",

  // Greece
  GR: "GR",
  GRE: "GR",

  // Hungary
  HU: "HU",
  H: "HU",
  HUN: "HU",
  HKG: "HK", // Hong Kong (separate from Hungary)

  // Belgium
  B: "BE",
  BEL: "BE",
  Bel: "BE",

  // Venezuela
  V: "VE",

  // Morocco
  M: "MA",

  // Denmark
  DEN: "DK",
  d: "DK", // lowercase variant

  // Sweden
  S: "SE",
  SWE: "SE",

  // Norway
  N: "NO",
  NOR: "NO",

  // Russia
  R: "RU",
  RUS: "RU",

  // Argentina
  ARG: "AR",
  A: "AR", // Based on A-211 sail number pattern

  // Cuba
  C: "CU", // Based on C-16 sail number pattern

  // Thailand
  T: "TH", // Based on T-1000 sail number pattern
  THA: "TH",

  // Israel
  isr: "IL",
  ISR: "IL",

  // Australia
  AU: "AU",
  AUS: "AU",

  // New Caledonia
  NC: "NC",

  // Poland
  POL: "PL",

  // Turkey
  TUR: "TR",

  // Netherlands Antilles / Bonaire
  NB: "BQ", // Bonaire, Sint Eustatius and Saba

  // Guadeloupe
  GP: "GP",
  GPE: "GP",

  // Brazil
  BRA: "BR",

  // Switzerland
  SUI: "CH",

  // Czech Republic
  CZE: "CZ",
  CZ: "CZ",

  // New Zealand
  NZL: "NZ",

  // Portugal
  POR: "PT",
  PT: "PT",

  // Puerto Rico
  PR: "PR",

  // Chile
  CHI: "CL",

  // Austria
  AUT: "AT",
  AT: "AT",

  // French Polynesia / Tahiti
  TAH: "PF",

  // Slovenia
  SLO: "SI",

  // Peru
  PER: "PE",

  // Curaçao
  CUR: "CW",

  // Aruba
  ARU: "AW",

  // Canada
  CAN: "CA",
  CA: "CA",

  // Ukraine
  UKR: "UA",

  // Singapore
  SGP: "SG",

  // Saint Martin
  SXM: "SX",

  // French Southern Territories
  TF: "TF",

  // Mexico
  MX: "MX",
  MEX: "MX",

  // Lithuania
  LTU: "LT",

  // Latvia
  LAT: "LV",

  // Guam
  GUM: "GU",

  // Guernsey / Channel Islands
  GC: "GG",

  // Dominican Republic
  DR: "DO",

  // Cyprus
  CYP: "CY",
  CY: "CY",

  // Cape Verde
  CV: "CV",

  // Colombia
  COL: "CO",

  // China
  CHN: "CN",

  // Saint Barthélemy
  BL: "BL",
  SBH: "BL",

  // Bulgaria
  BUL: "BG",

  // Uruguay
  URU: "UY",

  // Slovakia
  SVK: "SK",

  // South Africa
  SA: "ZA",

  // Philippines
  PHI: "PH",
  PH: "PH",

  // Northern Mariana Islands
  NMI: "MP",

  // Austria (alternative)
  OE: "AT",

  // Puerto Rico (alternative)
  PUR: "PR",

  // Puerto Rico (alternative)
  PU: "PR",

  // Antigua and Barbuda
  AWT: "AG",

  // Catalonia (Spain region, use Spain flag)
  CAT: "ES",

  // Special codes
  PWA: "", // PWA special code, no flag
  "??": "", // Unknown/invalid, no flag
  "14": "", // Unknown code, no flag
  HI: "US", // Hawaii (US state)
};

// Map ISO country codes to flag emojis
const ISO_TO_FLAG_MAP: Record<string, string> = {
  GB: "🇬🇧", // United Kingdom
  IT: "🇮🇹", // Italy
  DE: "🇩🇪", // Germany
  DK: "🇩🇰", // Denmark
  NL: "🇳🇱", // Netherlands
  FR: "🇫🇷", // France
  ES: "🇪🇸", // Spain
  US: "🇺🇸", // United States
  JP: "🇯🇵", // Japan
  HR: "🇭🇷", // Croatia
  GR: "🇬🇷", // Greece
  HU: "🇭🇺", // Hungary
  HK: "🇭🇰", // Hong Kong
  BE: "🇧🇪", // Belgium
  VE: "🇻🇪", // Venezuela
  MA: "🇲🇦", // Morocco
  SE: "🇸🇪", // Sweden
  NO: "🇳🇴", // Norway
  RU: "🇷🇺", // Russia
  AR: "🇦🇷", // Argentina
  CU: "🇨🇺", // Cuba
  TH: "🇹🇭", // Thailand
  IL: "🇮🇱", // Israel
  AU: "🇦🇺", // Australia
  NC: "🇳🇨", // New Caledonia
  PL: "🇵🇱", // Poland
  TR: "🇹🇷", // Turkey
  BQ: "🇧🇶", // Bonaire, Sint Eustatius and Saba
  GP: "🇬🇵", // Guadeloupe
  BR: "🇧🇷", // Brazil
  CH: "🇨🇭", // Switzerland
  CZ: "🇨🇿", // Czech Republic
  NZ: "🇳🇿", // New Zealand
  PT: "🇵🇹", // Portugal
  PR: "🇵🇷", // Puerto Rico
  CL: "🇨🇱", // Chile
  AT: "🇦🇹", // Austria
  PF: "🇵🇫", // French Polynesia
  SI: "🇸🇮", // Slovenia
  PE: "🇵🇪", // Peru
  CW: "🇨🇼", // Curaçao
  AW: "🇦🇼", // Aruba
  CA: "🇨🇦", // Canada
  UA: "🇺🇦", // Ukraine
  SG: "🇸🇬", // Singapore
  SX: "🇸🇽", // Sint Maarten
  TF: "🇹🇫", // French Southern Territories
  MX: "🇲🇽", // Mexico
  LT: "🇱🇹", // Lithuania
  LV: "🇱🇻", // Latvia
  GU: "🇬🇺", // Guam
  GG: "🇬🇬", // Guernsey
  DO: "🇩🇴", // Dominican Republic
  CY: "🇨🇾", // Cyprus
  CV: "🇨🇻", // Cape Verde
  CO: "🇨🇴", // Colombia
  CN: "🇨🇳", // China
  BL: "🇧🇱", // Saint Barthélemy
  BG: "🇧🇬", // Bulgaria
  UY: "🇺🇾", // Uruguay
  SK: "🇸🇰", // Slovakia
  ZA: "🇿🇦", // South Africa
  PH: "🇵🇭", // Philippines
  MP: "🇲🇵", // Northern Mariana Islands
  AG: "🇦🇬", // Antigua and Barbuda
};

/**
 * Gets the flag emoji for a given PWA country code
 * @param countryCode - PWA country code (from rider data)
 * @returns Flag emoji string, or default flag (🏳️) if unknown/invalid
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.trim() === "") {
    return "🏳️"; // Default flag for empty/invalid
  }

  // Normalize: trim and convert to uppercase for case-insensitive matching
  const normalized = countryCode.trim().toUpperCase();

  // Handle special codes that should not show flags
  if (normalized === "PWA" || normalized === "??" || normalized === "14") {
    return "🏳️"; // Default flag for special/unknown codes
  }

  // Map PWA code to ISO code
  const isoCode = PWA_TO_ISO_MAP[normalized] || PWA_TO_ISO_MAP[countryCode] || normalized;

  // If ISO code is empty (special codes), return default flag
  if (!isoCode || isoCode.trim() === "") {
    return "🏳️";
  }

  // Get flag from ISO code, or try using the normalized code directly
  const flag = ISO_TO_FLAG_MAP[isoCode] || ISO_TO_FLAG_MAP[normalized];

  // Return flag if found, otherwise default flag
  return flag || "🏳️";
}
