"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTest } from "@/app/actions/tests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StageTable } from "@/components/tests/stage-table";
import { LactateChart } from "@/components/tests/lactate-chart";
import {
  calcPulseZones,
  calcPaceZones,
  speedToPace,
  interpolateHrAtWatts,
  interpolateHrAtLactate,
  interpolateSpeedAtLactate,
  interpolateWattsAtLactate,
  dMaxWatts,
  dMaxLt1Watts,
  dMaxSpeed,
  dMaxLt1Speed,
  interpolateHrAtSpeed,
} from "@/lib/zones";

// ── Types ──────────────────────────────────────────────────────────────

type StageRow = {
  stageNumber: number;
  loadWatts: number | null;
  loadSpeedKmh: number | null;
  heartRate: number | null;
  lactateMmol: number | null;
  vo2MlKgMin: number | null;
  rpe: number | null;
  borgCentral: number | null;
  borgLocal: number | null;
  cadenceRpm: number | null;
  durationSeconds: number | null;
  vo2Absolute: number | null;
  fatGh: number | null;
  choGh: number | null;
  veO2: number | null;
  veCo2: number | null;
  respiratoryFreq: number | null;
  paO2: number | null;
  paCo2: number | null;
  baseExcess: number | null;
  energyExpenditure: number | null;
};

interface TestData {
  id: string;
  clientId: string;
  testType: string;
  testDate: Date;
  protocol: string | null;
  sportProtocol: string | null;
  testFacility: string | null;
  testLeader: string | null;
  temperature: number | null;
  humidity: number | null;
  notes: string | null;
  terminationReason: string | null;
  calculationsMethod: string | null;
  functionalCapacity: string | null;
  vo2TestType: string | null;
  ergometerType: string | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  stages: StageRow[];
  summary: {
    bodyWeightKg: number | null;
    heightCm: number | null;
    vo2Max: number | null;
    lt1Watts: number | null;
    lt2Watts: number | null;
    maxHr: number | null;
    maxWatts: number | null;
    maxMeasuredHr: number | null;
    maxEstimatedHr: number | null;
    lt1SpeedKmh: number | null;
    lt2SpeedKmh: number | null;
    lt1Pulse: number | null;
    lt2Pulse: number | null;
    lowerLimitSpeed: number | null;
    lowerLimitPulse: number | null;
    cardioRespFitness: number | null;
  } | null;
}

const TERMINATION_REASONS = [
  "Muskulär utmattning",
  "Andningsbegränsning",
  "Tekniskt fel",
  "Patientbegäran",
  "Annat",
];

// ── ThField helper ─────────────────────────────────────────────────────

function ThField({
  label, unit, value, onChange, suggestion, onApplySuggestion,
}: {
  label: string; unit: string; value: string;
  onChange: (v: string) => void;
  suggestion?: string | null;
  onApplySuggestion?: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label} <span className="text-slate-400 font-normal">({unit})</span></Label>
        {suggestion && onApplySuggestion && (
          <button
            type="button"
            onClick={onApplySuggestion}
            className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
          >
            D-max: {suggestion} →
          </button>
        )}
      </div>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
        placeholder="—"
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function EditTestView({ test, clientDateOfBirth }: { test: TestData; clientDateOfBirth?: Date | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = test.summary;
  const isLactate = test.testType === "LACTATE_THRESHOLD";
  const isVo2 = test.testType === "VO2MAX";
  const isRunning = isLactate && (test.sportProtocol === "Running" || test.stages.some((st) => st.loadSpeedKmh != null && st.loadWatts == null));

  const [form, setForm] = useState({
    testDate: test.testDate.toISOString().split("T")[0],
    protocol: test.protocol ?? "",
    sportProtocol: test.sportProtocol ?? "",
    testFacility: test.testFacility ?? "",
    testLeader: test.testLeader ?? "",
    temperature: test.temperature != null ? String(test.temperature) : "",
    humidity: test.humidity != null ? String(test.humidity) : "",
    notes: test.notes ?? "",
    terminationReason: test.terminationReason ?? "",
    calculationsMethod: test.calculationsMethod ?? "",
    functionalCapacity: test.functionalCapacity ?? "",
    vo2TestType: test.vo2TestType ?? "",
    ergometerType: test.ergometerType ?? "",
    bpSystolic: test.bpSystolic != null ? String(test.bpSystolic) : "",
    bpDiastolic: test.bpDiastolic != null ? String(test.bpDiastolic) : "",
    // Key metrics
    bodyWeightKg: s?.bodyWeightKg != null ? String(s.bodyWeightKg) : "",
    heightCm: s?.heightCm != null ? String(s.heightCm) : "",
    vo2Max: s?.vo2Max != null ? String(s.vo2Max) : "",
    cardioRespFitness: s?.cardioRespFitness != null ? String(s.cardioRespFitness) : "",
  });

  const [stages, setStages] = useState<StageRow[]>(test.stages);

  const [th, setTh] = useState({
    maxMeasuredHr: s?.maxMeasuredHr != null ? String(s.maxMeasuredHr) : "",
    maxEstimatedHr: s?.maxEstimatedHr != null ? String(s.maxEstimatedHr) : "",
    lt1SpeedKmh: s?.lt1SpeedKmh != null ? String(s.lt1SpeedKmh) : "",
    lt1Pulse: s?.lt1Pulse != null ? String(s.lt1Pulse) : "",
    lt2SpeedKmh: s?.lt2SpeedKmh != null ? String(s.lt2SpeedKmh) : "",
    lt2Pulse: s?.lt2Pulse != null ? String(s.lt2Pulse) : "",
    lowerLimitSpeed: s?.lowerLimitSpeed != null ? String(s.lowerLimitSpeed) : "",
    lowerLimitPulse: s?.lowerLimitPulse != null ? String(s.lowerLimitPulse) : "",
  });

  function updateTh(key: keyof typeof th, val: string) {
    setTh((t) => ({ ...t, [key]: val }));
  }

  // ── Auto-calculated values ─────────────────────────────────────────

  const lt1Watts = isLactate && !isRunning ? interpolateWattsAtLactate(stages, 2.0) : null;
  const lt2Watts = isLactate && !isRunning ? interpolateWattsAtLactate(stages, 4.0) : null;

  const stepEndStages = stages;

  const dmax2Watts = !isRunning ? dMaxWatts(stepEndStages) : null;
  const dmax1Watts = !isRunning ? dMaxLt1Watts(stepEndStages) : null;
  const dmax2Speed = isRunning ? dMaxSpeed(stepEndStages) : null;
  const dmax1Speed = isRunning ? dMaxLt1Speed(stepEndStages) : null;

  const dmax2Hr = isRunning
    ? (dmax2Speed != null ? interpolateHrAtSpeed(stepEndStages, dmax2Speed) : null)
    : (dmax2Watts != null ? interpolateHrAtWatts(stepEndStages, dmax2Watts) : null);
  const dmax1Hr = isRunning
    ? (dmax1Speed != null ? interpolateHrAtSpeed(stepEndStages, dmax1Speed) : null)
    : (dmax1Watts != null ? interpolateHrAtWatts(stepEndStages, dmax1Watts) : null);

  const obla2Hr    = interpolateHrAtLactate(stages, 2.0);
  const obla4Hr    = interpolateHrAtLactate(stages, 4.0);
  const obla2Speed = interpolateSpeedAtLactate(stages, 2.0);
  const obla4Speed = interpolateSpeedAtLactate(stages, 4.0);

  const bodyWeight = form.bodyWeightKg ? parseFloat(form.bodyWeightKg) : null;
  const lt1Wkg = lt1Watts != null && bodyWeight ? +(lt1Watts / bodyWeight).toFixed(2) : null;
  const lt2Wkg = lt2Watts != null && bodyWeight ? +(lt2Watts / bodyWeight).toFixed(2) : null;
  const lt1Hr  = lt1Watts != null ? interpolateHrAtWatts(stepEndStages, lt1Watts) : null;
  const lt2Hr  = lt2Watts != null ? interpolateHrAtWatts(stepEndStages, lt2Watts) : null;

  const autoLt1Hr   = isRunning ? obla2Hr : lt1Hr;
  const autoLt2Hr   = isRunning ? obla4Hr : lt2Hr;
  const autoLt1Load = isRunning ? obla2Speed : lt1Watts;
  const autoLt2Load = isRunning ? obla4Speed : lt2Watts;

  // ── Auto-fill max HR and max watts from stages ─────────────────────
  const maxWattsFromStages = stages.reduce<number | null>((max, st) => {
    if (st.loadWatts == null) return max;
    return max == null || st.loadWatts > max ? st.loadWatts : max;
  }, null);
  const maxHrFromStages = stages.reduce<number | null>((max, st) => {
    if (st.heartRate == null) return max;
    return max == null || st.heartRate > max ? st.heartRate : max;
  }, null);

  const clientAge = (() => {
    if (!clientDateOfBirth) return null;
    const today = new Date();
    const birth = new Date(clientDateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  })();
  const autoEstimatedMaxHr = clientAge != null ? 220 - clientAge : null;

  const lt1PulseNum = th.lt1Pulse ? parseInt(th.lt1Pulse) : autoLt1Hr;
  const lt2PulseNum = th.lt2Pulse ? parseInt(th.lt2Pulse) : autoLt2Hr;
  const lt1SpeedNum = th.lt1SpeedKmh ? parseFloat(th.lt1SpeedKmh) : (isRunning ? obla2Speed : null);
  const lt2SpeedNum = th.lt2SpeedKmh ? parseFloat(th.lt2SpeedKmh) : (isRunning ? obla4Speed : null);
  const llPulseNum  = th.lowerLimitPulse ? parseInt(th.lowerLimitPulse) : null;
  const llSpeedNum  = th.lowerLimitSpeed ? parseFloat(th.lowerLimitSpeed) : null;
  const eMaxPulse   = th.maxEstimatedHr ? parseInt(th.maxEstimatedHr) : (th.maxMeasuredHr ? parseInt(th.maxMeasuredHr) : (autoEstimatedMaxHr ?? maxHrFromStages ?? null));

  const pulseZones = lt1PulseNum && lt2PulseNum && llPulseNum && eMaxPulse
    ? calcPulseZones(lt1PulseNum, lt2PulseNum, llPulseNum, eMaxPulse)
    : null;

  const paceZones = lt1SpeedNum && lt2SpeedNum && llSpeedNum
    ? calcPaceZones(lt1SpeedNum, lt2SpeedNum, llSpeedNum)
    : null;

  // ── Save ──────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateTest(
        test.id,
        {
          testDate: form.testDate,
          protocol: form.protocol || undefined,
          sportProtocol: form.sportProtocol || undefined,
          testFacility: form.testFacility || undefined,
          testLeader: form.testLeader || undefined,
          temperature: form.temperature ? parseFloat(form.temperature) : undefined,
          humidity: form.humidity ? parseFloat(form.humidity) : undefined,
          notes: form.notes || undefined,
          terminationReason: form.terminationReason || undefined,
          calculationsMethod: form.calculationsMethod || undefined,
          functionalCapacity: form.functionalCapacity || undefined,
          vo2TestType: form.vo2TestType || undefined,
          ergometerType: form.ergometerType || undefined,
          bpSystolic: form.bpSystolic ? parseInt(form.bpSystolic) : undefined,
          bpDiastolic: form.bpDiastolic ? parseInt(form.bpDiastolic) : undefined,
        },
        stages,
        {
          bodyWeightKg: form.bodyWeightKg ? parseFloat(form.bodyWeightKg) : null,
          heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
          vo2Max: form.vo2Max ? parseFloat(form.vo2Max) : null,
          lt1Watts: lt1Watts ?? (s?.lt1Watts ?? null),
          lt2Watts: lt2Watts ?? (s?.lt2Watts ?? null),
          maxHr: maxHrFromStages ?? s?.maxHr ?? null,
          maxWatts: maxWattsFromStages ?? s?.maxWatts ?? null,
          maxMeasuredHr: th.maxMeasuredHr ? parseInt(th.maxMeasuredHr) : null,
          maxEstimatedHr: th.maxEstimatedHr ? parseInt(th.maxEstimatedHr) : null,
          lt1SpeedKmh: th.lt1SpeedKmh ? parseFloat(th.lt1SpeedKmh) : null,
          lt2SpeedKmh: th.lt2SpeedKmh ? parseFloat(th.lt2SpeedKmh) : null,
          lt1Pulse: th.lt1Pulse ? parseInt(th.lt1Pulse) : null,
          lt2Pulse: th.lt2Pulse ? parseInt(th.lt2Pulse) : null,
          lowerLimitSpeed: th.lowerLimitSpeed ? parseFloat(th.lowerLimitSpeed) : null,
          lowerLimitPulse: th.lowerLimitPulse ? parseInt(th.lowerLimitPulse) : null,
          cardioRespFitness: form.cardioRespFitness ? parseFloat(form.cardioRespFitness) : null,
        }
      );
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Test</h1>
          <p className="text-sm text-slate-400 mt-0.5">{test.testType.replace("_", " ")} · {test.testDate.toISOString().split("T")[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-red-500">{error}</span>}
          <Link
            href={`/dashboard/tests/${test.id}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Test info ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Test Info</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.testDate} onChange={(e) => setForm((f) => ({ ...f, testDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Facility</Label>
            <Input value={form.testFacility} onChange={(e) => setForm((f) => ({ ...f, testFacility: e.target.value }))} placeholder="—" />
          </div>
          <div className="space-y-1">
            <Label>Test Leader</Label>
            <Input value={form.testLeader} onChange={(e) => setForm((f) => ({ ...f, testLeader: e.target.value }))} placeholder="—" />
          </div>
          <div className="space-y-1">
            <Label>Temperature (°C)</Label>
            <Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))} placeholder="—" />
          </div>
          <div className="space-y-1">
            <Label>Humidity (%)</Label>
            <Input type="number" step="0.1" value={form.humidity} onChange={(e) => setForm((f) => ({ ...f, humidity: e.target.value }))} placeholder="—" />
          </div>
          {isVo2 && (
            <>
              <div className="space-y-1">
                <Label>Calc. method</Label>
                <Select value={form.calculationsMethod} onChange={(e) => setForm((f) => ({ ...f, calculationsMethod: e.target.value }))}>
                  <option value="">Not specified</option>
                  <option value="Maximum">Maximum</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ergometer type</Label>
                <Select value={form.ergometerType} onChange={(e) => setForm((f) => ({ ...f, ergometerType: e.target.value }))}>
                  <option value="">Not specified</option>
                  <option value="Bike Not Interfaced">Bike Not Interfaced</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>BP Systolic (mmHg)</Label>
                <Input type="number" step="1" value={form.bpSystolic} onChange={(e) => setForm((f) => ({ ...f, bpSystolic: e.target.value }))} placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label>BP Diastolic (mmHg)</Label>
                <Input type="number" step="1" value={form.bpDiastolic} onChange={(e) => setForm((f) => ({ ...f, bpDiastolic: e.target.value }))} placeholder="—" />
              </div>
            </>
          )}
        </div>

        {isVo2 && (
          <div className="space-y-1">
            <Label>Termination reason</Label>
            <Select value={form.terminationReason} onChange={(e) => setForm((f) => ({ ...f, terminationReason: e.target.value }))}>
              <option value="">Not specified</option>
              {TERMINATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </section>

      {/* ── Key metrics ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Key Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Body weight (kg)</Label>
            <Input type="number" step="0.1" value={form.bodyWeightKg} onChange={(e) => setForm((f) => ({ ...f, bodyWeightKg: e.target.value }))} placeholder="—" />
          </div>
          <div className="space-y-1">
            <Label>Height (cm)</Label>
            <Input type="number" step="1" value={form.heightCm} onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))} placeholder="—" />
          </div>
          {!isLactate && (
            <div className="space-y-1">
              <Label>VO₂ max (ml/kg/min)</Label>
              <Input type="number" step="any" value={form.vo2Max} onChange={(e) => setForm((f) => ({ ...f, vo2Max: e.target.value }))} placeholder="—" />
            </div>
          )}
          {isVo2 && (
            <div className="space-y-1">
              <Label>Cardio-resp. fitness (0–100)</Label>
              <Input type="number" step="1" min="0" max="100" value={form.cardioRespFitness} onChange={(e) => setForm((f) => ({ ...f, cardioRespFitness: e.target.value }))} placeholder="—" />
            </div>
          )}
          {isLactate && !isRunning && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">LT1 Watts (W) <span className="text-blue-500 font-normal ml-1">auto @ 2 mmol</span></Label>
                <Input type="number" value={lt1Watts ?? ""} readOnly className="bg-blue-50 border-blue-200 text-sm h-8" placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">LT2 Watts (W) <span className="text-blue-500 font-normal ml-1">auto @ 4 mmol</span></Label>
                <Input type="number" value={lt2Watts ?? ""} readOnly className="bg-blue-50 border-blue-200 text-sm h-8" placeholder="—" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Stage data ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Stage Data</h2>
        <StageTable
          stages={stages}
          onChange={setStages}
          testType={test.testType}
          isRunning={isRunning && isLactate}
          lockedKeys={isLactate ? [isRunning ? "loadSpeedKmh" : "loadWatts"] : undefined}
          showBorgOptional={stages.some((st) => st.borgCentral != null || st.borgLocal != null)}
          showVo2Extended={stages.some((st) => st.paO2 != null || st.paCo2 != null || st.baseExcess != null)}
        />
      </section>

      {/* ── Chart ─────────────────────────────────────────────────────── */}
      {(isLactate
        ? stages.filter((st) => st.lactateMmol != null).length >= 2
        : stages.filter((st) => st.loadWatts != null).length >= 2
      ) && (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Performance Chart</h2>
          <LactateChart
            stages={stages}
            bodyWeightKg={isRunning ? null : bodyWeight}
            lt1Watts={isRunning ? null : lt1Watts}
            lt2Watts={isRunning ? null : lt2Watts}
            lt1Speed={isRunning ? (th.lt1SpeedKmh ? parseFloat(th.lt1SpeedKmh) : obla2Speed) : null}
            lt2Speed={isRunning ? (th.lt2SpeedKmh ? parseFloat(th.lt2SpeedKmh) : obla4Speed) : null}
            maxHr={null}
            testType={test.testType}
            height={320}
          />
        </section>
      )}

      {/* ── Thresholds ────────────────────────────────────────────────── */}
      {isLactate && (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Thresholds &amp; Zones</h2>

          {/* Max HR */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Max Heart Rate</h3>
              {autoEstimatedMaxHr != null && (
                <span className="text-xs text-slate-400">220 − age ({clientAge}): {autoEstimatedMaxHr} bpm</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ThField label="Max measured HR" unit="bpm"
                value={th.maxMeasuredHr || (maxHrFromStages != null ? String(maxHrFromStages) : "")}
                onChange={(v) => updateTh("maxMeasuredHr", v)} />
              <ThField label="Known/estimated Max HR" unit="bpm"
                value={th.maxEstimatedHr || (autoEstimatedMaxHr != null ? String(autoEstimatedMaxHr) : "")}
                onChange={(v) => updateTh("maxEstimatedHr", v)} />
            </div>
          </div>

          {/* LT1 */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-green-700">iLT1 (Aerobic Threshold)</h3>
              {isRunning
                ? <span className="text-xs text-slate-400">OBLA 2 mmol: {obla2Speed != null ? `${obla2Speed} km/h · ${speedToPace(obla2Speed)} /km` : "—"} {obla2Hr ? `· ${obla2Hr} bpm` : ""}</span>
                : <span className="text-xs text-slate-400">OBLA 2 mmol: {lt1Watts ?? "—"} W {lt1Hr ? `· ${lt1Hr} bpm` : ""}</span>
              }
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ThField
                label={isRunning ? "iLT1 Speed" : "iLT1 Watts"}
                unit={isRunning ? "km/h" : "W"}
                value={th.lt1SpeedKmh || (autoLt1Load != null ? String(autoLt1Load) : "")}
                onChange={(v) => updateTh("lt1SpeedKmh", v)}
                suggestion={isRunning ? (dmax1Speed != null ? `${dmax1Speed} km/h` : null) : (dmax1Watts != null ? `${dmax1Watts} W` : null)}
                onApplySuggestion={isRunning
                  ? () => updateTh("lt1SpeedKmh", String(dmax1Speed ?? ""))
                  : () => updateTh("lt1SpeedKmh", String(dmax1Watts ?? ""))} />
              <ThField
                label="iLT1 Pulse"
                unit="bpm"
                value={th.lt1Pulse || (autoLt1Hr != null ? String(autoLt1Hr) : "")}
                onChange={(v) => updateTh("lt1Pulse", v)}
                suggestion={dmax1Hr != null ? `${dmax1Hr}` : null}
                onApplySuggestion={() => updateTh("lt1Pulse", String(dmax1Hr ?? ""))} />
            </div>
          </div>

          {/* LT2 */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-700">iAT / LT2 (Anaerobic Threshold)</h3>
              {isRunning
                ? <span className="text-xs text-slate-400">OBLA 4 mmol: {obla4Speed != null ? `${obla4Speed} km/h · ${speedToPace(obla4Speed)} /km` : "—"} {obla4Hr ? `· ${obla4Hr} bpm` : ""}</span>
                : <span className="text-xs text-slate-400">OBLA 4 mmol: {lt2Watts ?? "—"} W {lt2Hr ? `· ${lt2Hr} bpm` : ""}</span>
              }
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ThField
                label={isRunning ? "iAT/LT2 Speed" : "iAT/LT2 Watts"}
                unit={isRunning ? "km/h" : "W"}
                value={th.lt2SpeedKmh || (autoLt2Load != null ? String(autoLt2Load) : "")}
                onChange={(v) => updateTh("lt2SpeedKmh", v)}
                suggestion={isRunning ? (dmax2Speed != null ? `${dmax2Speed} km/h` : null) : (dmax2Watts != null ? `${dmax2Watts} W` : null)}
                onApplySuggestion={isRunning
                  ? () => updateTh("lt2SpeedKmh", String(dmax2Speed ?? ""))
                  : () => updateTh("lt2SpeedKmh", String(dmax2Watts ?? ""))} />
              <ThField
                label="iAT/LT2 Pulse"
                unit="bpm"
                value={th.lt2Pulse || (autoLt2Hr != null ? String(autoLt2Hr) : "")}
                onChange={(v) => updateTh("lt2Pulse", v)}
                suggestion={dmax2Hr != null ? `${dmax2Hr}` : null}
                onApplySuggestion={() => updateTh("lt2Pulse", String(dmax2Hr ?? ""))} />
            </div>
          </div>

          {/* Lower limit */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold">Lower Limit</h3>
            <div className="grid grid-cols-2 gap-3">
              <ThField label="Lower limit Speed" unit="km/h" value={th.lowerLimitSpeed}
                onChange={(v) => updateTh("lowerLimitSpeed", v)} />
              <ThField label="Lower limit Pulse" unit="bpm" value={th.lowerLimitPulse}
                onChange={(v) => updateTh("lowerLimitPulse", v)} />
            </div>
          </div>

          {/* OBLA computed */}
          {(obla2Hr || obla4Hr || obla2Speed || obla4Speed) && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-600">OBLA (from stage data)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {obla2Hr != null && <div><p className="text-xs text-slate-400">OBLA 2 mmol — HR</p><p className="font-bold">{obla2Hr} bpm</p></div>}
                {obla2Speed != null && <div><p className="text-xs text-slate-400">OBLA 2 mmol — Pace</p><p className="font-bold">{speedToPace(obla2Speed)} /km</p></div>}
                {obla4Hr != null && <div><p className="text-xs text-slate-400">OBLA 4 mmol — HR</p><p className="font-bold">{obla4Hr} bpm</p></div>}
                {obla4Speed != null && <div><p className="text-xs text-slate-400">OBLA 4 mmol — Pace</p><p className="font-bold">{speedToPace(obla4Speed)} /km</p></div>}
              </div>
            </div>
          )}

          {/* HR Zones */}
          {pulseZones && (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">HR Training Zones</h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="text-left px-4 py-2 font-medium">Zone</th>
                    <th className="text-left px-4 py-2 font-medium">Description</th>
                    <th className="text-right px-4 py-2 font-medium">HR (bpm)</th>
                  </tr>
                </thead>
                <tbody>
                  {pulseZones.map((z) => (
                    <tr key={z.label} className="border-b last:border-0">
                      <td className="px-4 py-2 font-bold">{z.label}</td>
                      <td className="px-4 py-2 text-slate-500">{z.description}</td>
                      <td className="px-4 py-2 text-right font-mono">{z.lo ?? "—"} – {z.hi ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pace Zones */}
          {paceZones && (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pace Training Zones</h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="text-left px-4 py-2 font-medium">Zone</th>
                    <th className="text-left px-4 py-2 font-medium">Description</th>
                    <th className="text-right px-4 py-2 font-medium">Pace (min/km)</th>
                  </tr>
                </thead>
                <tbody>
                  {paceZones.map((z) => (
                    <tr key={z.label} className="border-b last:border-0">
                      <td className="px-4 py-2 font-bold">{z.label}</td>
                      <td className="px-4 py-2 text-slate-500">{z.description}</td>
                      <td className="px-4 py-2 text-right font-mono">{z.hiPace} – {z.loPace !== "—" ? z.loPace : "∞"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Save button (bottom) */}
      <div className="flex items-center justify-end gap-3 pb-6">
        {error && <span className="text-sm text-red-500">{error}</span>}
        <Link
          href={`/dashboard/tests/${test.id}`}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
