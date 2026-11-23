-- AirDelta Seed Data
-- Version: 1.0.0 · Date: 2026-11-23

-- =========================================================================
-- 1. Constants Registry (Version: 2026-11-a)
-- =========================================================================

insert into constants_registry (key, version, value, unit, confidence, source_url, description) values
  ('VE.sleep.child', '2026-11-a', 0.30, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Child (3-6y) sleeping breathing rate'),
  ('VE.rest.child', '2026-11-a', 0.42, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Child sedentary / indoor play breathing rate'),
  ('VE.light_exercise.child', '2026-11-a', 0.85, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Child light outdoor activity breathing rate'),
  ('VE.moderate_exercise.child', '2026-11-a', 1.40, 'm3/h', 'Medium', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Child active sports / running breathing rate'),
  ('VE.sleep.adult', '2026-11-a', 0.45, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Adult (18-60y) sleeping breathing rate'),
  ('VE.rest.adult', '2026-11-a', 0.55, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Adult sedentary / desk work breathing rate'),
  ('VE.light_exercise.adult', '2026-11-a', 1.25, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Adult walking 3-4 km/h breathing rate'),
  ('VE.moderate_exercise.adult', '2026-11-a', 2.10, 'm3/h', 'High', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Adult brisk walking / cycling breathing rate'),
  ('VE.rest.senior', '2026-11-a', 0.50, 'm3/h', 'Medium', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Senior (>65y) sedentary breathing rate'),
  ('VE.light_exercise.senior', '2026-11-a', 1.10, 'm3/h', 'Medium', 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6', 'Senior slow walking breathing rate'),
  ('F_micro.indoor.unsealed', '2026-11-a', 0.75, 'ratio', 'High', 'https://epic.uchicago.edu/wp-content/uploads/sites/5/2025/06/IAQ-Research-Highlight.pdf', 'Standard unsealed Indian home envelope penetration'),
  ('F_micro.indoor.sealed', '2026-11-a', 0.50, 'ratio', 'Medium', 'https://cpwd.gov.in/Publication/GreenBuildingGuidelines.pdf', 'Weather-stripped doors/windows envelope'),
  ('F_micro.indoor.purifier_active', '2026-11-a', 0.20, 'ratio', 'High', 'https://epic.uchicago.edu/wp-content/uploads/sites/5/2025/06/IAQ-Research-Highlight.pdf', 'Indoor space with active HEPA filtration'),
  ('F_micro.transit.walking', '2026-11-a', 1.00, 'ratio', 'High', 'https://www.nature.com/articles/s41370-020-0255-4', 'Direct ambient roadside pedestrian exposure'),
  ('F_micro.transit.cycle', '2026-11-a', 1.00, 'ratio', 'High', 'https://www.nature.com/articles/s41370-020-0255-4', 'Direct ambient roadside cyclist exposure'),
  ('F_micro.transit.two_wheeler', '2026-11-a', 1.15, 'ratio', 'High', 'https://www.sciencedirect.com/science/article/pii/S135223101930456X', 'Two-wheeler rider in tailpipe vortex concentration'),
  ('F_micro.transit.auto', '2026-11-a', 0.90, 'ratio', 'Medium', 'https://www.sciencedirect.com/science/article/pii/S135223101930456X', 'Semi-open auto-rickshaw passenger exposure'),
  ('F_micro.transit.bus_non_ac', '2026-11-a', 0.85, 'ratio', 'Medium', 'https://www.sciencedirect.com/science/article/pii/S135223101930456X', 'Standard city bus passenger exposure'),
  ('F_micro.transit.car_ac_recirc', '2026-11-a', 0.30, 'ratio', 'High', 'https://www.sciencedirect.com/science/article/pii/S135223101830501X', 'AC passenger car cabin with recirculation mode'),
  ('F_micro.transit.metro', '2026-11-a', 0.25, 'ratio', 'High', 'https://www.nature.com/articles/s41598-021-99884-6', 'Delhi Metro train car and underground platform'),
  ('mask.n95.effective', '2026-11-a', 0.85, 'ratio', 'High', 'https://www.cdc.gov/niosh/npptl/topics/respirators/factsheets/respfact.html', 'Certified N95 mask real-world fit filtration efficiency'),
  ('mask.surgical.effective', '2026-11-a', 0.35, 'ratio', 'Medium', 'https://www.cdc.gov/niosh/npptl/topics/respirators/factsheets/respfact.html', 'Loose-fitting surgical mask leakage baseline'),
  ('EF.CO2e.two_wheeler', '2026-11-a', 42.0, 'gCO2e/km', 'High', 'https://cpcb.nic.in/vehicular-exhaust-emission-standards/', 'Indian average 2-wheeler emissions per km'),
  ('EF.CO2e.car_petrol', '2026-11-a', 145.0, 'gCO2e/km', 'High', 'https://cpcb.nic.in/vehicular-exhaust-emission-standards/', 'Indian passenger car petrol baseline per vehicle-km'),
  ('EF.CO2e.bus_urban', '2026-11-a', 28.0, 'gCO2e/km', 'Medium', 'https://cpcb.nic.in/emission-factors-for-indian-vehicles/', 'City public bus per passenger-km average'),
  ('EF.CO2e.metro', '2026-11-a', 12.0, 'gCO2e/km', 'High', 'https://www.delhimetrorail.com/corporate/sustainability', 'Delhi Metro electricity grid carbon factor per passenger-km')
on conflict (key, version) do update set
  value = excluded.value,
  unit = excluded.unit,
  confidence = excluded.confidence,
  source_url = excluded.source_url,
  description = excluded.description;

-- =========================================================================
-- 2. Demo Community Groups
-- =========================================================================

insert into groups (id, kind, name, city_code, join_code) values
  ('00000000-0000-0000-0000-000000000001', 'rwa', 'Sector 14 RWA - Gurugram', 'DELHI', 'SEC14RWA'),
  ('00000000-0000-0000-0000-000000000002', 'community', 'Dwarka Sec 6 Residents', 'DELHI', 'DWRKSEC6'),
  ('00000000-0000-0000-0000-000000000003', 'workplace', 'Cyber City Green Commuters', 'DELHI', 'CYBERGRN')
on conflict (id) do nothing;

-- =========================================================================
-- 3. Demo Air Snapshots (Nov 2026 Smog Episode Baseline)
-- =========================================================================

insert into air_snapshots (cell, ts, provider, pm25, pm10, index_value, index_standard, category, badge, license, attribution, station_distance_km) values
  ('28.61:77.21', '2026-11-07T07:00:00Z', 'cpcb', 320.0, 480.0, 385, 'ind_cpcb', 'severe', 'measured', 'Open Data (CPCB)', 'CPCB Anand Vihar CAAQMS', 1.4),
  ('28.61:77.21', '2026-11-07T08:00:00Z', 'google', 315.0, 470.0, 380, 'ind_cpcb', 'severe', 'measured', 'Google Air Quality API terms', 'Google Air Quality API', 0.8),
  ('28.61:77.21', '2026-11-07T12:00:00Z', 'openmeteo', 210.0, 310.0, 260, 'ind_cpcb', 'poor', 'forecast', 'CC-BY 4.0 (Open-Meteo)', 'Open-Meteo CAMS Ensemble', null),
  ('28.61:77.21', '2026-11-07T14:00:00Z', 'openmeteo', 145.0, 220.0, 195, 'ind_cpcb', 'moderate', 'forecast', 'CC-BY 4.0 (Open-Meteo)', 'Open-Meteo CAMS Ensemble', null),
  ('28.61:77.21', '2026-11-07T20:00:00Z', 'cpcb', 290.0, 410.0, 350, 'ind_cpcb', 'very_poor', 'measured', 'Open Data (CPCB)', 'CPCB Mandir Marg CAAQMS', 2.1)
on conflict (cell, ts, provider) do nothing;
