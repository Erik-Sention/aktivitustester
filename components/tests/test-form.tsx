"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createTest } from "@/app/actions/tests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { StageTable } from "@/components/tests/stage-table";
import { fullName } from "@/lib/utils";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface TestFormProps {
  clients: Client[];
  defaultClientId?: string;
  defaultTestType?: string;
}

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

function interpolateWattsAtLactate(stages: StageRow[], targetMmol: number): number | null {
  const valid = stages
    .filter((s) => s.lactateMmol != null && s.loadWatts != null)
    .sort((a, b) => (a.loadWatts ?? 0) - (b.loadWatts ?? 0));

  if (valid.length < 2) return null;

  for (let i = 0; i < valid.length - 1; i++) {
    const lo = valid[i];
    const hi = valid[i + 1];
    if (lo.lactateMmol! <= targetMmol && hi.lactateMmol! >= targetMmol) {
      const ratio = (targetMmol - lo.lactateMmol!) / (hi.lactateMmol! - lo.lactateMmol!);
      return Math.round(lo.loadWatts! + ratio * (hi.loadWatts! - lo.loadWatts!));
    }
  }
  return null;
}

const SAMPLE_STAGES: StageRow[] = [
  { stageNumber: 1, loadWatts: 100, loadSpeedKmh: null, heartRate: 118, lactateMmol: 0.8, vo2MlKgMin: null, rpe: 9,  cadenceRpm: 90, durationSeconds: 4 },
  { stageNumber: 2, loadWatts: 125, loadSpeedKmh: null, heartRate: 131, lactateMmol: 1.0, vo2MlKgMin: null, rpe: 11, cadenceRpm: 90, durationSeconds: 4 },
  { stageNumber: 3, loadWatts: 150, loadSpeedKmh: null, heartRate: 143, lactateMmol: 1.3, vo2MlKgMin: null, rpe: 12, cadenceRpm: 90, durationSeconds: 4 },
  { stageNumber: 4, loadWatts: 175, loadSpeedKmh: null, heartRate: 155, lactateMmol: 1.7, vo2MlKgMin: null, rpe: 13, cadenceRpm: 90, durationSeconds: 4 },
  { stageNumber: 5, loadWatts: 200, loadSpeedKmh: null, heartRate: 162, lactateMmol: 2.2, vo2MlKgMin: null, rpe: 14, cadenceRpm: 89, durationSeconds: 4 },
  { stageNumber: 6, loadWatts: 225, loadSpeedKmh: null, heartRate: 170, lactateMmol: 3.1, vo2MlKgMin: null, rpe: 16, cadenceRpm: 88, durationSeconds: 4 },
  { stageNumber: 7, loadWatts: 250, loadSpeedKmh: null, heartRate: 177, lactateMmol: 5.2, vo2MlKgMin: null, rpe: 18, cadenceRpm: 87, durationSeconds: 4 },
  { stageNumber: 8, loadWatts: 275, loadSpeedKmh: null, heartRate: 183, lactateMmol: 8.4, vo2MlKgMin: null, rpe: 19, cadenceRpm: 85, durationSeconds: 4 },
];

const TERMINATION_REASONS = [
  "Muskulär utmattning",
  "Andningsbegränsning",
  "Tekniskt fel",
  "Patientbegäran",
  "Annat",
];

export function TestForm({ clients, defaultClientId, defaultTestType }: TestFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: defaultClientId ?? "",
    testType: defaultTestType ?? "LACTATE_THRESHOLD",
    testDate: new Date().toISOString().split("T")[0],
    testLeader: "",
    protocol: "",
    notes: "",
    terminationReason: "",
    // VO2Max-specific
    calculationsMethod: "",
    functionalCapacity: "",
    vo2TestType: "",
    ergometerType: "",
    startIncline: "",
    startSpeed: "",
    finalIncline: "",
    finalSpeed: "",
    bpSystolic: "",
    bpDiastolic: "",
  });

  const [stages, setStages] = useState<StageRow[]>([
    {
      stageNumber: 1,
      loadWatts: null,
      loadSpeedKmh: null,
      heartRate: null,
      lactateMmol: null,
      vo2MlKgMin: null,
      rpe: null,
      borgCentral: null,
      borgLocal: null,
      cadenceRpm: null,
      durationSeconds: null,
      vo2Absolute: null,
      fatGh: null,
      choGh: null,
      veO2: null,
      veCo2: null,
      respiratoryFreq: null,
      paO2: null,
      paCo2: null,
      baseExcess: null,
      energyExpenditure: null,
    },
  ]);

  const [summary, setSummary] = useState({
    bodyWeightKg: "",
    vo2Max: "",
    lt1Watts: "",
    lt2Watts: "",
    maxHr: "",
    maxWatts: "",
    cardioRespFitness: "",
  });

  useEffect(() => {
    if (form.testType !== "LACTATE_THRESHOLD") return;

    const lt1 = interpolateWattsAtLactate(stages, 2.0);
    const lt2 = interpolateWattsAtLactate(stages, 4.0);

    setSummary((s) => ({
      ...s,
      lt1Watts: lt1 != null ? String(lt1) : s.lt1Watts,
      lt2Watts: lt2 != null ? String(lt2) : s.lt2Watts,
    }));
  }, [stages, form.testType]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) { setError("Please select a client"); return; }
    setSaving(true);
    setError(null);

    try {
      await createTest(
        {
          clientId: form.clientId,
          testType: form.testType,
          testDate: form.testDate,
          testLeader: form.testLeader || undefined,
          protocol: form.protocol || undefined,
          notes: form.notes || undefined,
          terminationReason: form.terminationReason || undefined,
          calculationsMethod: form.calculationsMethod || undefined,
          functionalCapacity: form.functionalCapacity || undefined,
          vo2TestType: form.vo2TestType || undefined,
          ergometerType: form.ergometerType || undefined,
          startIncline: form.startIncline ? parseFloat(form.startIncline) : undefined,
          startSpeed: form.startSpeed ? parseFloat(form.startSpeed) : undefined,
          finalIncline: form.finalIncline ? parseFloat(form.finalIncline) : undefined,
          finalSpeed: form.finalSpeed ? parseFloat(form.finalSpeed) : undefined,
          bpSystolic: form.bpSystolic ? parseInt(form.bpSystolic) : undefined,
          bpDiastolic: form.bpDiastolic ? parseInt(form.bpDiastolic) : undefined,
        },
        stages,
        {
          bodyWeightKg: summary.bodyWeightKg ? parseFloat(summary.bodyWeightKg) : null,
          vo2Max: summary.vo2Max ? parseFloat(summary.vo2Max) : null,
          lt1Watts: summary.lt1Watts ? parseFloat(summary.lt1Watts) : null,
          lt2Watts: summary.lt2Watts ? parseFloat(summary.lt2Watts) : null,
          maxHr: summary.maxHr ? parseInt(summary.maxHr) : null,
          maxWatts: summary.maxWatts ? parseFloat(summary.maxWatts) : null,
          cardioRespFitness: summary.cardioRespFitness ? parseFloat(summary.cardioRespFitness) : null,
        }
      );
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  function fillSampleData() {
    setStages(SAMPLE_STAGES.map((s) => ({ ...s })));
    setSummary({
      bodyWeightKg: "80",
      vo2Max: "",
      lt1Watts: "",
      lt2Watts: "",
      maxHr: "183",
      maxWatts: "275",
    });
    setForm((f) => ({ ...f, protocol: "Ramp 25W/4min", testType: "LACTATE_THRESHOLD" }));
  }

  const isLactate = form.testType === "LACTATE_THRESHOLD";
  const isVo2 = form.testType === "VO2MAX";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Test info</h2>
          <div className="space-y-1">
            <Label htmlFor="client">Client *</Label>
            <Select id="client" value={form.clientId} onChange={(e) => update("clientId", e.target.value)} required>
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{fullName(c.firstName, c.lastName)}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type">Test type *</Label>
              <Select id="type" value={form.testType} onChange={(e) => update("testType", e.target.value)}>
                <option value="LACTATE_THRESHOLD">Lactate Threshold</option>
                <option value="VO2MAX">VO2 max</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={form.testDate} onChange={(e) => update("testDate", e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="testLeader">Testledare</Label>
            <Input id="testLeader" placeholder="Namn på testledare" value={form.testLeader} onChange={(e) => update("testLeader", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="protocol">Protocol</Label>
            <Input id="protocol" placeholder="e.g. Ramp 25W/3min..." value={form.protocol} onChange={(e) => update("protocol", e.target.value)} />
          </div>
          {isVo2 && (
            <div className="space-y-1">
              <Label htmlFor="termination">Termination reason</Label>
              <Select
                id="termination"
                value={form.terminationReason}
                onChange={(e) => update("terminationReason", e.target.value)}
              >
                <option value="">Not specified</option>
                {TERMINATION_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>
          )}
          {isVo2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="calcMethod">Calculations method</Label>
                  <Select id="calcMethod" value={form.calculationsMethod} onChange={(e) => update("calculationsMethod", e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Maximum">Maximum</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="funcCapacity">Functional capacity</Label>
                  <Select id="funcCapacity" value={form.functionalCapacity} onChange={(e) => update("functionalCapacity", e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Maximum">Maximum</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="vo2TestType">Test type (VO2)</Label>
                  <Select id="vo2TestType" value={form.vo2TestType} onChange={(e) => update("vo2TestType", e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Maximum">Maximum</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ergometerType">Ergometer type</Label>
                  <Select id="ergometerType" value={form.ergometerType} onChange={(e) => update("ergometerType", e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Bike Not Interfaced">Bike Not Interfaced</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startSpeed">Start speed (km/h)</Label>
                  <Input id="startSpeed" type="number" step="0.1" value={form.startSpeed} onChange={(e) => update("startSpeed", e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="startIncline">Start incline (%)</Label>
                  <Input id="startIncline" type="number" step="0.1" value={form.startIncline} onChange={(e) => update("startIncline", e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="finalSpeed">Final speed (km/h)</Label>
                  <Input id="finalSpeed" type="number" step="0.1" value={form.finalSpeed} onChange={(e) => update("finalSpeed", e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="finalIncline">Final incline (%)</Label>
                  <Input id="finalIncline" type="number" step="0.1" value={form.finalIncline} onChange={(e) => update("finalIncline", e.target.value)} placeholder="—" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Start/final speed and incline are not included in reports.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="bpSystolic">BPs — systolic (mmHg)</Label>
                  <Input id="bpSystolic" type="number" step="1" value={form.bpSystolic} onChange={(e) => update("bpSystolic", e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bpDiastolic">BPd — diastolic (mmHg)</Label>
                  <Input id="bpDiastolic" type="number" step="1" value={form.bpDiastolic} onChange={(e) => update("bpDiastolic", e.target.value)} placeholder="—" />
                </div>
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Stage data</h2>
            <Button type="button" variant="ghost" size="sm" onClick={fillSampleData} className="text-xs">
              Fill sample data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tab / Enter moves between cells
          </p>
          <StageTable stages={stages} onChange={setStages} testType={form.testType} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
            Summary / key metrics
            {isLactate && (
              <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                LT1 and LT2 are calculated automatically from stage data
              </span>
            )}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bodyWeight">Body weight (kg)</Label>
              <Input
                id="bodyWeight"
                type="number"
                step="0.1"
                value={summary.bodyWeightKg}
                onChange={(e) => setSummary((s) => ({ ...s, bodyWeightKg: e.target.value }))}
                placeholder="e.g. 75"
              />
            </div>
            {!isLactate && (
              <div className="space-y-1">
                <Label htmlFor="vo2Max">VO2 max (ml/kg/min)</Label>
                <Input
                  id="vo2Max"
                  type="number"
                  step="any"
                  value={summary.vo2Max}
                  onChange={(e) => setSummary((s) => ({ ...s, vo2Max: e.target.value }))}
                  placeholder="--"
                />
              </div>
            )}
            {isVo2 && (
              <div className="space-y-1">
                <Label htmlFor="cardioRespFitness">Cardio-respiratory fitness (0–100)</Label>
                <Input
                  id="cardioRespFitness"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={summary.cardioRespFitness}
                  onChange={(e) => setSummary((s) => ({ ...s, cardioRespFitness: e.target.value }))}
                  placeholder="--"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="lt1Watts">
                LT1 (watts)
                {isLactate && <span className="ml-1 text-xs text-[#007AFF]">@ 2 mmol/L</span>}
              </Label>
              <Input
                id="lt1Watts"
                type="number"
                step="any"
                value={summary.lt1Watts}
                onChange={(e) => setSummary((s) => ({ ...s, lt1Watts: e.target.value }))}
                placeholder={isLactate ? "auto" : "--"}
                className={isLactate && summary.lt1Watts ? "border-[#007AFF]/40 bg-[#007AFF]/[0.04]" : ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lt2Watts">
                LT2 / MLSS (watts)
                {isLactate && <span className="ml-1 text-xs text-[#007AFF]">@ 4 mmol/L</span>}
              </Label>
              <Input
                id="lt2Watts"
                type="number"
                step="any"
                value={summary.lt2Watts}
                onChange={(e) => setSummary((s) => ({ ...s, lt2Watts: e.target.value }))}
                placeholder={isLactate ? "auto" : "--"}
                className={isLactate && summary.lt2Watts ? "border-[#007AFF]/40 bg-[#007AFF]/[0.04]" : ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxHr">Max HR (bpm)</Label>
              <Input
                id="maxHr"
                type="number"
                step="1"
                value={summary.maxHr}
                onChange={(e) => setSummary((s) => ({ ...s, maxHr: e.target.value }))}
                placeholder="--"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxWatts">Max watts</Label>
              <Input
                id="maxWatts"
                type="number"
                step="any"
                value={summary.maxWatts}
                onChange={(e) => setSummary((s) => ({ ...s, maxWatts: e.target.value }))}
                placeholder="--"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save test"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
