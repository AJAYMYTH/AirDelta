import { CommuteMode, EmissionsLedger } from "@airdelta/schemas";
import { getConstant, formatAssumptionRef } from "./constants.js";

export function calculateEmissionsDelta(
  originalMode: CommuteMode,
  optimizedMode: CommuteMode,
  distanceKm = 12.0 // Typical urban commute distance
): EmissionsLedger {
  const factorsRef: string[] = [];

  const getModeFactorKey = (mode: CommuteMode): string | null => {
    switch (mode) {
      case "two_wheeler":
        return "EF.CO2e.two_wheeler";
      case "car":
        return "EF.CO2e.car_petrol";
      case "bus":
        return "EF.CO2e.bus_urban";
      case "metro":
        return "EF.CO2e.metro";
      default:
        return null;
    }
  };

  const origKey = getModeFactorKey(originalMode);
  const optKey = getModeFactorKey(optimizedMode);

  let origFactor = 0;
  if (origKey) {
    origFactor = getConstant(origKey);
    factorsRef.push(formatAssumptionRef(origKey));
  }

  let optFactor = 0;
  if (optKey) {
    optFactor = getConstant(optKey);
    factorsRef.push(formatAssumptionRef(optKey));
  }

  const deltaGrams = (optFactor - origFactor) * distanceKm;

  return {
    deltaGramsCo2e: Math.round(deltaGrams * 10) / 10,
    factorsRef,
    badge: "assumed"
  };
}
