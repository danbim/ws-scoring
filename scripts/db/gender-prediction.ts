// Gender prediction utility based on first names

// Common male first names
const MALE_NAMES = new Set([
  "marc",
  "sean",
  "steve",
  "nicolas",
  "tristan",
  "steve",
  "antonio",
  "antoine",
  "albert",
  "tristan",
  "steve",
  "gunnar",
  "mathieu",
  "benjamin",
  "clement",
  "nil",
  "kiran",
  "pablo",
  "ian",
  "damien",
  "arthur",
  "mathias",
  "tomonori",
  "eleazar",
  "guillermo",
  "josh",
  "phillip",
  "rafael",
  "peon",
  "tristan",
  "steve",
  "marc",
  "norio",
  "gunnar",
  "mathieu",
  "benjamin",
  "clement",
  "nil",
  "kiran",
  "pablo",
  "ian",
  "damien",
  "arthur",
  "mathias",
  "tomonori",
  "eleazar",
  "guillermo",
  "josh",
  "phillip",
  "rafael",
  "peon",
]);

// Common female first names
const FEMALE_NAMES = new Set([
  "marina",
  "blanca",
  "silvia",
  "valerie",
  "alice",
  "vickey",
  "mariana",
  "mio",
  "maria",
  "nayra",
  "vasiliki",
  "oriane",
  "arrianne",
  "fumi",
]);

export type Gender = "male" | "female" | "unknown";

/**
 * Predicts gender based on first name
 * @param firstName - The first name to analyze
 * @returns Predicted gender: "male", "female", or "unknown"
 */
export function predictGender(firstName: string): Gender {
  if (!firstName) {
    return "unknown";
  }

  const normalized = firstName.toLowerCase().trim();

  if (MALE_NAMES.has(normalized)) {
    return "male";
  }

  if (FEMALE_NAMES.has(normalized)) {
    return "female";
  }

  // Heuristic: names ending in 'a' are often female (in many languages)
  if (normalized.endsWith("a") && normalized.length > 2) {
    // But exclude some common male names ending in 'a'
    const maleEndingInA = ["joshua", "noah", "luca", "nikita"];
    if (!maleEndingInA.includes(normalized)) {
      return "female";
    }
  }

  // Heuristic: names ending in 'o' are often male (in many languages)
  if (normalized.endsWith("o") && normalized.length > 2) {
    return "male";
  }

  // Heuristic: names ending in 'e' or 'er' are often male (in many languages)
  if (normalized.endsWith("e") || normalized.endsWith("er")) {
    // But exclude some common female names
    const femaleEndingInE = ["marie", "jane", "diane", "claire"];
    if (!femaleEndingInE.includes(normalized)) {
      return "male";
    }
  }

  return "unknown";
}
