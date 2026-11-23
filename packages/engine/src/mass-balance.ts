export interface IndoorMassBalanceParams {
  ambientPm25: number;        // Outdoor concentration (ug/m3)
  roomVolumeM3?: number;      // Default 45 m3 (typical 15x12x9 ft room)
  airExchangePerHour?: number;// Lambda: 1.0 (closed windows) to 4.5 (open windows)
  hasExhaust?: boolean;       // Exhaust hood on stove removes 75% cooking emissions
  hasPurifier?: boolean;      // Clean Air Delivery Rate (CADR m3/h)
  purifierCadrM3PerHour?: number; // Default 300 m3/h
  isCooking?: boolean;        // Cooking source emission S = 18,000 ug/h
  isIncenseBurning?: boolean; // Incense source emission S = 22,000 ug/h
  penetrationFactor?: number; // P: default 0.80
  depositionRatePerHour?: number; // k: default 0.25 h^-1
}

export interface IndoorMassBalanceResult {
  indoorConcentrationUgM3: number;
  unmitigatedConcentrationUgM3: number;
  percentageReduction: number;
  cleanAirExchangeRate: number;
}

export function calculateIndoorMassBalance(
  params: IndoorMassBalanceParams
): IndoorMassBalanceResult {
  const {
    ambientPm25,
    roomVolumeM3 = 45,
    airExchangePerHour = 1.2,
    hasExhaust = false,
    hasPurifier = false,
    purifierCadrM3PerHour = 300,
    isCooking = false,
    isIncenseBurning = false,
    penetrationFactor = 0.80,
    depositionRatePerHour = 0.25
  } = params;

  // Calculate indoor emission source S (ug/h)
  let emissionSourceUgPerHour = 0;
  if (isCooking) {
    const rawCooking = 18000; // ug/h unvented LPG gas burner
    emissionSourceUgPerHour += hasExhaust ? rawCooking * 0.25 : rawCooking;
  }
  if (isIncenseBurning) {
    emissionSourceUgPerHour += 22000; // ug/h active incense stick
  }

  // Removal rate: lambda + k + CADR/V
  const filtrationLossRate = hasPurifier ? purifierCadrM3PerHour / roomVolumeM3 : 0;
  const totalLossRate = airExchangePerHour + depositionRatePerHour + filtrationLossRate;

  // Steady-state indoor concentration: C_in,ss = (P * lambda * C_out + S/V) / totalLossRate
  const infiltrationInput = penetrationFactor * airExchangePerHour * ambientPm25;
  const sourceInput = emissionSourceUgPerHour / roomVolumeM3;
  const indoorConc = (infiltrationInput + sourceInput) / totalLossRate;

  // Baseline unmitigated concentration (no exhaust, no filtration, standard leakage)
  const baselineLossRate = 1.2 + depositionRatePerHour;
  const rawCookingSource = isCooking ? 18000 / roomVolumeM3 : 0;
  const rawIncenseSource = isIncenseBurning ? 22000 / roomVolumeM3 : 0;
  const unmitigatedConc = (penetrationFactor * 1.2 * ambientPm25 + rawCookingSource + rawIncenseSource) / baselineLossRate;

  const reduction = Math.max(0, Math.round(((unmitigatedConc - indoorConc) / unmitigatedConc) * 100));

  return {
    indoorConcentrationUgM3: Math.round(indoorConc * 10) / 10,
    unmitigatedConcentrationUgM3: Math.round(unmitigatedConc * 10) / 10,
    percentageReduction: reduction,
    cleanAirExchangeRate: Math.round(totalLossRate * 100) / 100
  };
}
