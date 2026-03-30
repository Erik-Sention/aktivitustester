// Zone and threshold calculation utilities for Aktivitus Performance Diagnostic

/** Convert speed (km/h) to pace string "M:SS /km" */
export function speedToPace(speedKmh: number): string {
  if (speedKmh <= 0) return "—";
  const totalSeconds = (60 / speedKmh) * 60;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export interface PulseZone {
  label: string;
  description: string;
  lo: number | null;
  hi: number | null;
}

export interface PaceZone {
  label: string;
  description: string;
  loSpeed: number | null;
  hiSpeed: number | null;
  loPace: string;
  hiPace: string;
}

/**
 * Calculate pulse (HR) training zones.
 * lt1Pulse, lt2Pulse, llPulse (lower limit), eMaxPulse (estimated max HR)
 */
export function calcPulseZones(
  lt1Pulse: number,
  lt2Pulse: number,
  llPulse: number,
  eMaxPulse: number
): PulseZone[] {
  const span = lt2Pulse - lt1Pulse;
  const z3Hi = Math.round(lt2Pulse - span * 0.15);
  const z4pLo = z3Hi;
  const z4pHi = lt2Pulse;
  const z5Span = eMaxPulse - lt2Pulse;
  const z4plusHi = Math.round(lt2Pulse + z5Span * 0.15);

  return [
    { label: "Z1", description: "Regeneration", lo: null, hi: llPulse },
    { label: "Z2", description: "Basic endurance", lo: llPulse, hi: lt1Pulse },
    { label: "Z3", description: "Aerobic development", lo: lt1Pulse, hi: z3Hi },
    { label: "Z4−", description: "LT threshold approach", lo: z4pLo, hi: z4pHi },
    { label: "Z4+", description: "Threshold", lo: lt2Pulse, hi: z4plusHi },
    { label: "Z5", description: "VO2max / Anaerobic", lo: z4plusHi, hi: eMaxPulse },
  ];
}

/**
 * Calculate pace training zones.
 * All speeds in km/h. Paces displayed as min/km strings.
 */
export function calcPaceZones(
  lt1Speed: number,
  lt2Speed: number,
  llSpeed: number
): PaceZone[] {
  const span = lt2Speed - lt1Speed;
  const z3Hi = lt2Speed - span * 0.33;
  const z4pHi = lt2Speed;
  const z4plusHi = lt2Speed * 1.07;
  const z5Hi = lt2Speed * 1.15;
  const z6Hi = lt2Speed * 1.25;

  function zone(
    label: string,
    desc: string,
    loSpeed: number | null,
    hiSpeed: number | null
  ): PaceZone {
    return {
      label,
      description: desc,
      loSpeed,
      hiSpeed,
      loPace: loSpeed != null ? speedToPace(loSpeed) : "—",
      hiPace: hiSpeed != null ? speedToPace(hiSpeed) : "—",
    };
  }

  return [
    zone("Z1", "Regeneration", null, llSpeed),
    zone("Z2", "Basic endurance", llSpeed, lt1Speed),
    zone("Z3", "Aerobic development", lt1Speed, z3Hi),
    zone("Z4−", "Threshold approach", z3Hi, z4pHi),
    zone("Z4+", "Threshold", lt2Speed, z4plusHi),
    zone("Z5", "VO2max", z4plusHi, z5Hi),
    zone("Z6", "Anaerobic capacity", z5Hi, z6Hi),
    zone("Z7", "Speed endurance", z6Hi, null),
    zone("Z8", "Max speed / Sprint", null, null),
  ];
}

export interface StagePoint {
  loadWatts?: number | null;
  loadSpeedKmh?: number | null;
  heartRate?: number | null;
  lactateMmol?: number | null;
}

/** Linear interpolation of HR at a given lactate level */
export function interpolateHrAtLactate(
  stages: StagePoint[],
  targetMmol: number
): number | null {
  const valid = stages
    .filter((s) => s.lactateMmol != null && s.heartRate != null)
    .sort((a, b) => (a.lactateMmol ?? 0) - (b.lactateMmol ?? 0));
  if (valid.length < 2) return null;
  for (let i = 0; i < valid.length - 1; i++) {
    const lo = valid[i], hi = valid[i + 1];
    if (lo.lactateMmol! <= targetMmol && hi.lactateMmol! >= targetMmol) {
      const ratio = (targetMmol - lo.lactateMmol!) / (hi.lactateMmol! - lo.lactateMmol!);
      return Math.round(lo.heartRate! + ratio * (hi.heartRate! - lo.heartRate!));
    }
  }
  return null;
}

/** Linear interpolation of speed at a given lactate level */
export function interpolateSpeedAtLactate(
  stages: StagePoint[],
  targetMmol: number
): number | null {
  const valid = stages
    .filter((s) => s.lactateMmol != null && s.loadSpeedKmh != null)
    .sort((a, b) => (a.lactateMmol ?? 0) - (b.lactateMmol ?? 0));
  if (valid.length < 2) return null;
  for (let i = 0; i < valid.length - 1; i++) {
    const lo = valid[i], hi = valid[i + 1];
    if (lo.lactateMmol! <= targetMmol && hi.lactateMmol! >= targetMmol) {
      const ratio = (targetMmol - lo.lactateMmol!) / (hi.lactateMmol! - lo.lactateMmol!);
      return +(lo.loadSpeedKmh! + ratio * (hi.loadSpeedKmh! - lo.loadSpeedKmh!)).toFixed(2);
    }
  }
  return null;
}

/** Linear interpolation of watts at a given lactate level */
export function interpolateWattsAtLactate(
  stages: StagePoint[],
  targetMmol: number
): number | null {
  const valid = stages
    .filter((s) => s.lactateMmol != null && s.loadWatts != null)
    .sort((a, b) => (a.loadWatts ?? 0) - (b.loadWatts ?? 0));
  if (valid.length < 2) return null;
  for (let i = 0; i < valid.length - 1; i++) {
    const lo = valid[i], hi = valid[i + 1];
    if (lo.lactateMmol! <= targetMmol && hi.lactateMmol! >= targetMmol) {
      const ratio = (targetMmol - lo.lactateMmol!) / (hi.lactateMmol! - lo.lactateMmol!);
      return Math.round(lo.loadWatts! + ratio * (hi.loadWatts! - lo.loadWatts!));
    }
  }
  return null;
}

/** Linear interpolation of HR at a given wattage */
export function interpolateHrAtWatts(
  stages: StagePoint[],
  targetWatts: number
): number | null {
  const valid = stages
    .filter((s) => s.heartRate != null && s.loadWatts != null)
    .sort((a, b) => (a.loadWatts ?? 0) - (b.loadWatts ?? 0));
  if (valid.length < 2) return null;
  for (let i = 0; i < valid.length - 1; i++) {
    const lo = valid[i], hi = valid[i + 1];
    if (lo.loadWatts! <= targetWatts && hi.loadWatts! >= targetWatts) {
      const ratio = (targetWatts - lo.loadWatts!) / (hi.loadWatts! - lo.loadWatts!);
      return Math.round(lo.heartRate! + ratio * (hi.heartRate! - lo.heartRate!));
    }
  }
  return null;
}

/**
 * D-max method: finds the point on the lactate curve with the maximum
 * perpendicular distance from the line connecting the first and last points.
 * Returns the x-value (watts) at that point, representing LT2.
 */
export function dMaxWatts(stages: StagePoint[]): number | null {
  const valid = stages
    .filter((s) => s.lactateMmol != null && s.loadWatts != null)
    .sort((a, b) => (a.loadWatts ?? 0) - (b.loadWatts ?? 0));
  if (valid.length < 3) return null;

  const first = valid[0];
  const last = valid[valid.length - 1];
  const x0 = first.loadWatts!, y0 = first.lactateMmol!;
  const x1 = last.loadWatts!, y1 = last.lactateMmol!;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  let maxDist = -1;
  let maxWatts: number | null = null;

  for (const p of valid.slice(1, -1)) {
    const dist = Math.abs(dy * p.loadWatts! - dx * p.lactateMmol! + x1 * y0 - y1 * x0) / len;
    if (dist > maxDist) {
      maxDist = dist;
      maxWatts = p.loadWatts!;
    }
  }
  return maxWatts;
}

/**
 * D-max for LT1: apply D-max to the sub-curve up to the LT2 D-max point.
 * Returns watts at estimated LT1.
 */
export function dMaxLt1Watts(stages: StagePoint[]): number | null {
  const lt2W = dMaxWatts(stages);
  if (lt2W == null) return null;
  const subStages = stages.filter(
    (s) => s.loadWatts != null && s.loadWatts <= lt2W
  );
  return dMaxWatts(subStages);
}

/**
 * D-max method on speed axis (running lactate).
 * Finds the point on the lactate-vs-speed curve with maximum perpendicular distance
 * from the line connecting the first and last measured points.
 * Returns the speed (km/h) at that point, representing LT2.
 */
export function dMaxSpeed(stages: StagePoint[]): number | null {
  const valid = stages
    .filter((s) => s.lactateMmol != null && s.loadSpeedKmh != null)
    .sort((a, b) => (a.loadSpeedKmh ?? 0) - (b.loadSpeedKmh ?? 0));
  if (valid.length < 3) return null;

  const first = valid[0];
  const last = valid[valid.length - 1];
  const x0 = first.loadSpeedKmh!, y0 = first.lactateMmol!;
  const x1 = last.loadSpeedKmh!, y1 = last.lactateMmol!;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  let maxDist = -1;
  let maxSpeed: number | null = null;

  for (const p of valid.slice(1, -1)) {
    const dist = Math.abs(dy * p.loadSpeedKmh! - dx * p.lactateMmol! + x1 * y0 - y1 * x0) / len;
    if (dist > maxDist) {
      maxDist = dist;
      maxSpeed = p.loadSpeedKmh!;
    }
  }
  return maxSpeed;
}

/**
 * D-max for LT1 on speed axis: apply D-max to the sub-curve up to the LT2 D-max point.
 * Returns speed (km/h) at estimated LT1.
 */
export function dMaxLt1Speed(stages: StagePoint[]): number | null {
  const lt2S = dMaxSpeed(stages);
  if (lt2S == null) return null;
  const subStages = stages.filter(
    (s) => s.loadSpeedKmh != null && s.loadSpeedKmh <= lt2S
  );
  return dMaxSpeed(subStages);
}

/** Linear interpolation of HR at a given speed (km/h) */
export function interpolateHrAtSpeed(
  stages: StagePoint[],
  targetSpeed: number
): number | null {
  const valid = stages
    .filter((s) => s.heartRate != null && s.loadSpeedKmh != null)
    .sort((a, b) => (a.loadSpeedKmh ?? 0) - (b.loadSpeedKmh ?? 0));
  if (valid.length < 2) return null;
  for (let i = 0; i < valid.length - 1; i++) {
    const lo = valid[i], hi = valid[i + 1];
    if (lo.loadSpeedKmh! <= targetSpeed && hi.loadSpeedKmh! >= targetSpeed) {
      const ratio = (targetSpeed - lo.loadSpeedKmh!) / (hi.loadSpeedKmh! - lo.loadSpeedKmh!);
      return Math.round(lo.heartRate! + ratio * (hi.heartRate! - lo.heartRate!));
    }
  }
  return null;
}
