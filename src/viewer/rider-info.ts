// Rider metadata mapping (mock/placeholder implementation)
export interface RiderInfo {
  country: string;
  sailNumber: string;
  lastName: string;
}

// Mock data mapping - in a real system, this would come from an API
const mockRiderData: Record<string, RiderInfo> = {
  "K-90": { country: "GB", sailNumber: "K-90", lastName: "Meldrum" },
  "I-676": { country: "IT", sailNumber: "I-676", lastName: "Morislo" },
  "E-255": { country: "ES", sailNumber: "E-255", lastName: "Friedi Morales" },
  "SBH-8": { country: "", sailNumber: "SBH-8", lastName: "Beauvarlet" },
};

export function getRiderInfo(riderId: string): RiderInfo {
  // Check if we have mock data for this rider
  if (mockRiderData[riderId]) {
    return mockRiderData[riderId];
  }

  // Try to parse riderId patterns
  // Pattern: "K-90" -> country from prefix, sail number, name from lookup
  // Pattern: "I-676" -> country from prefix, sail number, name from lookup
  // Pattern: "E-255" -> country from prefix, sail number, name from lookup
  // Pattern: "SBH-8" -> country from prefix, sail number, name from lookup

  const countryMap: Record<string, string> = {
    K: "GB", // UK
    I: "IT", // Italy
    E: "ES", // Spain
    SBH: "", // Unknown
  };

  // Try to extract country code from prefix
  const parts = riderId.split("-");
  const prefix = parts[0];
  const country = countryMap[prefix] || "";

  return {
    country,
    sailNumber: riderId,
    lastName: riderId, // Fallback to riderId as name
  };
}
