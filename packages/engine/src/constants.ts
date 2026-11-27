export const CONSTANTS_VERSION = "2026-11-a";
export const ENGINE_VERSION = "1.0.0";

export interface ConstantDefinition {
  key: string;
  value: number;
  unit: string;
  confidence: "High" | "Medium" | "Low";
  sourceUrl: string;
  description: string;
}

export const CONSTANTS_REGISTRY: Record<string, ConstantDefinition> = {
  // Breathing ventilation rates (m3/h)
  "VE.sleep.child": {
    key: "VE.sleep.child",
    value: 0.30,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Child (3-6y) sleeping breathing rate"
  },
  "VE.rest.child": {
    key: "VE.rest.child",
    value: 0.42,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Child sedentary / indoor play breathing rate"
  },
  "VE.light_exercise.child": {
    key: "VE.light_exercise.child",
    value: 0.85,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Child light outdoor activity breathing rate"
  },
  "VE.moderate_exercise.child": {
    key: "VE.moderate_exercise.child",
    value: 1.40,
    unit: "m3/h",
    confidence: "Medium",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Child active sports / running breathing rate"
  },
  "VE.sleep.teen": {
    key: "VE.sleep.teen",
    value: 0.38,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Teen (13-17y) sleeping breathing rate"
  },
  "VE.rest.teen": {
    key: "VE.rest.teen",
    value: 0.48,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Teen (13-17y) sedentary / study breathing rate"
  },
  "VE.light_exercise.teen": {
    key: "VE.light_exercise.teen",
    value: 1.05,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Teen (13-17y) light walking breathing rate"
  },
  "VE.moderate_exercise.teen": {
    key: "VE.moderate_exercise.teen",
    value: 1.80,
    unit: "m3/h",
    confidence: "Medium",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Teen (13-17y) sports / brisk cycling breathing rate"
  },
  "VE.sleep.adult": {
    key: "VE.sleep.adult",
    value: 0.45,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Adult (18-60y) sleeping breathing rate"
  },
  "VE.rest.adult": {
    key: "VE.rest.adult",
    value: 0.55,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Adult sedentary / desk work breathing rate"
  },
  "VE.light_exercise.adult": {
    key: "VE.light_exercise.adult",
    value: 1.25,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Adult walking 3-4 km/h breathing rate"
  },
  "VE.moderate_exercise.adult": {
    key: "VE.moderate_exercise.adult",
    value: 2.10,
    unit: "m3/h",
    confidence: "High",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Adult brisk walking / cycling breathing rate"
  },
  "VE.sleep.senior": {
    key: "VE.sleep.senior",
    value: 0.40,
    unit: "m3/h",
    confidence: "Medium",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Senior (>65y) sleeping breathing rate"
  },
  "VE.rest.senior": {
    key: "VE.rest.senior",
    value: 0.50,
    unit: "m3/h",
    confidence: "Medium",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Senior (>65y) sedentary breathing rate"
  },
  "VE.light_exercise.senior": {
    key: "VE.light_exercise.senior",
    value: 1.10,
    unit: "m3/h",
    confidence: "Medium",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Senior slow walking breathing rate"
  },
  "VE.moderate_exercise.senior": {
    key: "VE.moderate_exercise.senior",
    value: 1.65,
    unit: "m3/h",
    confidence: "Medium",
    sourceUrl: "https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6",
    description: "Senior moderate exercise breathing rate"
  },

  // Microenvironment penetration factors (dimensionless ratio)
  "F_micro.indoor.unsealed": {
    key: "F_micro.indoor.unsealed",
    value: 0.75,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://epic.uchicago.edu/wp-content/uploads/sites/5/2025/06/IAQ-Research-Highlight.pdf",
    description: "Standard unsealed Indian home envelope penetration"
  },
  "F_micro.indoor.sealed": {
    key: "F_micro.indoor.sealed",
    value: 0.50,
    unit: "ratio",
    confidence: "Medium",
    sourceUrl: "https://cpwd.gov.in/Publication/GreenBuildingGuidelines.pdf",
    description: "Weather-stripped doors/windows envelope"
  },
  "F_micro.indoor.purifier_active": {
    key: "F_micro.indoor.purifier_active",
    value: 0.20,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://epic.uchicago.edu/wp-content/uploads/sites/5/2025/06/IAQ-Research-Highlight.pdf",
    description: "Indoor space with active HEPA filtration"
  },
  "F_micro.transit.walking": {
    key: "F_micro.transit.walking",
    value: 1.00,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://www.nature.com/articles/s41370-020-0255-4",
    description: "Direct ambient roadside pedestrian exposure"
  },
  "F_micro.transit.cycle": {
    key: "F_micro.transit.cycle",
    value: 1.00,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://www.nature.com/articles/s41370-020-0255-4",
    description: "Direct ambient roadside cyclist exposure"
  },
  "F_micro.transit.two_wheeler": {
    key: "F_micro.transit.two_wheeler",
    value: 1.15,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://www.sciencedirect.com/science/article/pii/S135223101930456X",
    description: "Two-wheeler rider in tailpipe vortex concentration"
  },
  "F_micro.transit.auto": {
    key: "F_micro.transit.auto",
    value: 0.90,
    unit: "ratio",
    confidence: "Medium",
    sourceUrl: "https://www.sciencedirect.com/science/article/pii/S135223101930456X",
    description: "Semi-open auto-rickshaw passenger exposure"
  },
  "F_micro.transit.bus_non_ac": {
    key: "F_micro.transit.bus_non_ac",
    value: 0.85,
    unit: "ratio",
    confidence: "Medium",
    sourceUrl: "https://www.sciencedirect.com/science/article/pii/S135223101930456X",
    description: "Standard city bus passenger exposure"
  },
  "F_micro.transit.car_ac_recirc": {
    key: "F_micro.transit.car_ac_recirc",
    value: 0.30,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://www.sciencedirect.com/science/article/pii/S135223101830501X",
    description: "AC passenger car cabin with recirculation mode"
  },
  "F_micro.transit.metro": {
    key: "F_micro.transit.metro",
    value: 0.25,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://www.nature.com/articles/s41598-021-99884-6",
    description: "Delhi Metro train car and underground platform"
  },

  // Protection factors
  "mask.n95.effective": {
    key: "mask.n95.effective",
    value: 0.85,
    unit: "ratio",
    confidence: "High",
    sourceUrl: "https://www.cdc.gov/niosh/npptl/topics/respirators/factsheets/respfact.html",
    description: "Certified N95 mask real-world fit filtration efficiency"
  },
  "mask.surgical.effective": {
    key: "mask.surgical.effective",
    value: 0.35,
    unit: "ratio",
    confidence: "Medium",
    sourceUrl: "https://www.cdc.gov/niosh/npptl/topics/respirators/factsheets/respfact.html",
    description: "Loose-fitting surgical mask leakage baseline"
  },

  // Emissions factors (gCO2e per passenger-km)
  "EF.CO2e.two_wheeler": {
    key: "EF.CO2e.two_wheeler",
    value: 42.0,
    unit: "gCO2e/km",
    confidence: "High",
    sourceUrl: "https://cpcb.nic.in/vehicular-exhaust-emission-standards/",
    description: "Indian average 2-wheeler emissions per km"
  },
  "EF.CO2e.car_petrol": {
    key: "EF.CO2e.car_petrol",
    value: 145.0,
    unit: "gCO2e/km",
    confidence: "High",
    sourceUrl: "https://cpcb.nic.in/vehicular-exhaust-emission-standards/",
    description: "Indian passenger car petrol baseline per vehicle-km"
  },
  "EF.CO2e.bus_urban": {
    key: "EF.CO2e.bus_urban",
    value: 28.0,
    unit: "gCO2e/km",
    confidence: "Medium",
    sourceUrl: "https://cpcb.nic.in/emission-factors-for-indian-vehicles/",
    description: "City public bus per passenger-km average"
  },
  "EF.CO2e.metro": {
    key: "EF.CO2e.metro",
    value: 12.0,
    unit: "gCO2e/km",
    confidence: "High",
    sourceUrl: "https://www.delhimetrorail.com/corporate/sustainability",
    description: "Delhi Metro electricity grid carbon factor per passenger-km"
  }
};

export function getConstant(key: string): number {
  const entry = CONSTANTS_REGISTRY[key];
  if (!entry) {
    throw new Error(`Constant '${key}' not found in registry ${CONSTANTS_VERSION}`);
  }
  return entry.value;
}

export function formatAssumptionRef(key: string): string {
  return `${key}@${CONSTANTS_VERSION}`;
}
