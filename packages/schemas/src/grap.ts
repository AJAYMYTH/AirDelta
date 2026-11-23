import { GrapStage } from "./advisory.js";

export interface GrapStageRule {
  stage: GrapStage;
  stageName: string;
  aqiThreshold: string;
  cpcbCategory: string;
  rwaMandates: string[];
  schoolMandates: string[];
  workplaceMandates: string[];
  citizenDos: string[];
}

export const GRAP_RULES: Record<GrapStage, GrapStageRule> = {
  STAGE_I: {
    stage: "STAGE_I",
    stageName: "GRAP Stage I (Poor)",
    aqiThreshold: "AQI 201 – 300",
    cpcbCategory: "Poor",
    rwaMandates: [
      "Ensure security guards are provided electric heaters to prevent open bonfire burning",
      "Regular mechanized sweeping and water sprinkling on society internal roads",
      "Strict prohibition on burning garden waste or dry leaves"
    ],
    schoolMandates: [
      "Minimize prolonged outdoor morning assemblies",
      "Advise children with respiratory sensitivities to avoid vigorous playground sports"
    ],
    workplaceMandates: [
      "Encourage shared employee carpooling and public transit incentives",
      "Ensure DG sets are operated only with approved dual-fuel or emission control devices"
    ],
    citizenDos: [
      "Keep vehicle tires properly inflated to minimize road friction and particulate wear",
      "Avoid open fire heating or waste burning"
    ]
  },
  STAGE_II: {
    stage: "STAGE_II",
    stageName: "GRAP Stage II (Very Poor)",
    aqiThreshold: "AQI 301 – 400",
    cpcbCategory: "Very Poor",
    rwaMandates: [
      "Deploy anti-smog guns or continuous fine-mist water sprayers on unpaved society zones",
      "Zero usage of diesel generator sets (except essential lifts and emergency water pumps)",
      "Strict monitoring of construction dust curtains around maintenance sites"
    ],
    schoolMandates: [
      "Suspend outdoor physical training (PT) sessions and morning sports before 10:00",
      "Keep classroom windows closed during peak morning traffic hours"
    ],
    workplaceMandates: [
      "Implement staggered office arrival and departure timings to flatten traffic peaks",
      "Strict ban on individual DG set operation without retrofitted particulate filters"
    ],
    citizenDos: [
      "Wear certified N95 respirators during transit segments (two-wheelers, open autos)",
      "Avoid morning walks before 09:30 when toxic temperature inversions are densest"
    ]
  },
  STAGE_III: {
    stage: "STAGE_III",
    stageName: "GRAP Stage III (Severe)",
    aqiThreshold: "AQI 401 – 450",
    cpcbCategory: "Severe",
    rwaMandates: [
      "Total ban on non-essential construction, demolition, tiling, and painting work",
      "Intensify mechanical vacuum sweeping and water misting twice daily",
      "Strict vigilance against open waste or biomass burning with society penalties"
    ],
    schoolMandates: [
      "Suspend in-person classes for primary grades (Classes Nursery to V); transition to online mode",
      "Zero outdoor sports or exposure activities for all grades"
    ],
    workplaceMandates: [
      "Mandate work-from-home (WFH) for 50% of staff where operationally feasible",
      "Provide organized staff shuttle vans to eliminate individual private vehicle trips"
    ],
    citizenDos: [
      "Strict ban on BS-III petrol and BS-IV diesel four-wheeler movement across NCR",
      "High-risk individuals (elderly, asthmatic, children) must remain indoors in filtered air"
    ]
  },
  STAGE_IV: {
    stage: "STAGE_IV",
    stageName: "GRAP Stage IV (Severe +)",
    aqiThreshold: "AQI > 450",
    cpcbCategory: "Severe +",
    rwaMandates: [
      "Emergency protocol: Complete cessation of all external repair and maintenance work",
      "Operate indoor air purifiers in community halls and common areas for vulnerable residents",
      "Provide N95 masks to all society maintenance and security staff"
    ],
    schoolMandates: [
      "Complete closure of all physical schools (up to Class XII) and colleges; 100% online learning",
      "Cancellation of all outdoor campus activities"
    ],
    workplaceMandates: [
      "50% mandatory WFH for public and private offices; emergency staff only on premises",
      "Entry of non-essential commercial diesel trucks into NCR prohibited"
    ],
    citizenDos: [
      "Medical emergency travel only; avoid all non-essential outdoor movement",
      "Seal all home door and window perimeter gaps with damp cloths or tape"
    ]
  },
  NONE: {
    stage: "NONE",
    stageName: "Baseline (Moderate)",
    aqiThreshold: "AQI 0 – 200",
    cpcbCategory: "Moderate",
    rwaMandates: ["Routine maintenance and green cover upkeep"],
    schoolMandates: ["Standard outdoor activity permitted"],
    workplaceMandates: ["Routine transit"],
    citizenDos: ["Standard healthy lifestyle"]
  }
};

export function getGrapStageForAqi(aqi: number): GrapStageRule {
  if (aqi > 450) return GRAP_RULES.STAGE_IV;
  if (aqi > 400) return GRAP_RULES.STAGE_III;
  if (aqi > 300) return GRAP_RULES.STAGE_II;
  if (aqi > 200) return GRAP_RULES.STAGE_I;
  return GRAP_RULES.NONE;
}

export function getAllGrapStages(): GrapStageRule[] {
  return [
    GRAP_RULES.STAGE_I,
    GRAP_RULES.STAGE_II,
    GRAP_RULES.STAGE_III,
    GRAP_RULES.STAGE_IV
  ];
}
