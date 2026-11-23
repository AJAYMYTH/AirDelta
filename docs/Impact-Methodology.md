# AirDelta — Impact Methodology & Constants Registry

**Project:** AirDelta  
**Hackathon Event:** PromptWars  
**Registry Version:** `2026-11-a` · **Engine Version:** `1.0.0` · **Status:** Validated

---

## 1. Mathematical Framework

### 1.1 Inhaled Particulate Matter Dose ($D$)
The total mass of fine particulate matter ($PM_{2.5}$) inhaled over a 24-hour day across $N$ routine segments is given by:

$$D = \sum_{i=1}^{N} C_{seg, i} \times VE_{seg, i} \times \Delta t_{seg, i}$$

Where:
- $D$ is the total daily inhaled dose in micrograms ($\mu g$).
- $C_{seg, i}$ is the effective particulate concentration in microenvironment $i$ ($\mu g / m^3$).
- $VE_{seg, i}$ is the minute ventilation (breathing rate) for the individual during segment $i$ ($m^3 / h$).
- $\Delta t_{seg, i}$ is the duration of the activity segment in hours ($h$).

### 1.2 Microenvironment Infiltration & Masking
$$C_{seg, i} = C_{out}(t) \times F_{micro, i} \times (1 - \eta_{mask})$$
Where:
- $C_{out}(t)$ is the ambient outdoor $PM_{2.5}$ concentration at time $t$ ($\mu g / m^3$).
- $F_{micro, i}$ is the dimensionless microenvironment concentration factor (infiltration or penetration ratio relative to ambient air).
- $\eta_{mask}$ is the effective mask filtration factor ($\eta_{mask} = 0.85$ for certified well-fitted N95; $0.00$ for unmasked).

### 1.3 Indoor Single-Compartment Mass-Balance Model
For indoor residential and classroom settings, the temporal evolution of indoor concentration $C_{in}(t)$ is governed by:

$$\frac{dC_{in}}{dt} = P \lambda C_{out} - \left( \lambda + k + \frac{\text{CADR}}{V} \right) C_{in} + \frac{S}{V}$$

At steady state:
$$C_{in, ss} = \frac{P \lambda C_{out} + \frac{S}{V}}{\lambda + k + \frac{\text{CADR}}{V}}$$

Where:
- $P$: Penetration coefficient of the building envelope ($0.80$ for typical Indian brick residential structures).
- $\lambda$: Air exchange rate per hour ($h^{-1}$) — e.g., $1.2\text{ }h^{-1}$ natural leakage, $4.0\text{ }h^{-1}$ open windows.
- $k$: Surface deposition rate constant for $PM_{2.5}$ ($0.25\text{ }h^{-1}$).
- $\text{CADR}$: Clean Air Delivery Rate of filtration equipment ($m^3/h$) — e.g., $250\text{ }m^3/h$ for DIY Corsi-Rosenthal / budget purifier; $450\text{ }m^3/h$ for HEPA unit.
- $V$: Volume of the room ($m^3$) — baseline room volume $45\text{ }m^3$ ($15\times 12\times 9\text{ ft}$).
- $S$: Indoor emission rate ($\mu g/h$) — e.g., unvented LPG gas cooking produces $\approx 18,000\text{ }\mu g/h$; active incense burning produces $\approx 22,000\text{ }\mu g/h$.

---

## 2. Versioned Constants Registry (`2026-11-a`)

Every constant utilized in calculation has an explicit key, unit, value, confidence rating, and literature citation.

### 2.1 Minute Ventilation Rates ($VE$)

| Key | Value | Unit | Confidence | Source Citation |
|---|---|---|---|---|
| `VE.sleep.child` | `0.30` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Table 6-1, Child 3-6y) |
| `VE.rest.child` | `0.42` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Table 6-1) |
| `VE.light_exercise.child`| `0.85` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Light play) |
| `VE.moderate_exercise.child`| `1.40` | $m^3/h$ | Medium | US EPA Exposure Factors Handbook (Outdoor sport) |
| `VE.sleep.adult` | `0.45` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Table 6-2, Adult 18-60y) |
| `VE.rest.adult` | `0.55` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Sedentary / Desk) |
| `VE.light_exercise.adult`| `1.25` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Walking 3-4 km/h) |
| `VE.moderate_exercise.adult`| `2.10` | $m^3/h$ | High | US EPA Exposure Factors Handbook (Brisk cycling, jogging) |
| `VE.rest.senior` | `0.50` | $m^3/h$ | Medium | US EPA Exposure Factors Handbook (Elderly >65y sedentary) |
| `VE.light_exercise.senior`| `1.10` | $m^3/h$ | Medium | US EPA Exposure Factors Handbook (Slow walking) |

### 2.2 Microenvironment Infiltration Factors ($F_{micro}$)

| Key | Value | Unit | Confidence | Source Citation |
|---|---|---|---|---|
| `F_micro.indoor.unsealed` | `0.75` | ratio | High | EPIC India IAQ Study (Indo-Gangetic Plain residential baseline) |
| `F_micro.indoor.sealed` | `0.50` | ratio | Medium | CPWD / BEE building envelope infiltration guidelines |
| `F_micro.indoor.purifier_active` | `0.20` | ratio | High | Real-world HEPA filtration trials in Delhi apartments |
| `F_micro.transit.walking` | `1.00` | ratio | High | Direct ambient roadside exposure |
| `F_micro.transit.cycle` | `1.00` | ratio | High | Direct ambient roadside exposure |
| `F_micro.transit.two_wheeler` | `1.15` | ratio | High | IIT Delhi In-transit Exposure Study (Tailpipe vortex factor) |
| `F_micro.transit.auto` | `0.90` | ratio | Medium | Semi-open cabin microenvironment (IIT Delhi) |
| `F_micro.transit.bus_non_ac` | `0.85` | ratio | Medium | Urban transport IAQ evaluations |
| `F_micro.transit.car_ac_recirc` | `0.30` | ratio | High | Cabin filter with AC recirculation mode enabled |
| `F_micro.transit.metro` | `0.25` | ratio | High | DMRC Delhi Metro underground/elevated station & car study |

### 2.3 Protection & Emission Factors

| Key | Value | Unit | Confidence | Source Citation |
|---|---|---|---|---|
| `mask.n95.effective` | `0.85` | ratio | High | NIOSH / WHO practical wearing efficiency (fit-adjusted) |
| `mask.surgical.effective` | `0.35` | ratio | Medium | Practical loose-fitting surgical mask leakage baseline |
| `EF.CO2e.two_wheeler` | `42.0` | $gCO_2e/km$| High | ARAI / CPCB Indian Automotive Emission Baseline |
| `EF.CO2e.car_petrol` | `145.0`| $gCO_2e/km$| High | CPCB Indian passenger vehicle emission factors |
| `EF.CO2e.bus_urban` | `28.0` | $gCO_2e/km$| Medium | Per-passenger average occupancy (BEST / DTC fleet data) |
| `EF.CO2e.metro` | `12.0` | $gCO_2e/km$| High | DMRC carbon footprint disclosure per passenger-km |

---

## 3. Parameter Uncertainty & Confidence Bounds

To reflect real-world biological and physical variability, all dose calculations output a 3-point estimate:
- **Mid Estimate ($D_{mid}$):** Nominal parameters from the registry above.
- **Low Estimate ($D_{low}$):** $D_{low} = 0.80 \times D_{mid}$ (reflects tighter home envelope, lower breathing minute volume).
- **High Estimate ($D_{high}$):** $D_{high} = 1.25 \times D_{mid}$ (reflects higher exertion, roadside micro-plumes).

Both the mid estimate and uncertainty range are presented to the user to prevent false precision.
