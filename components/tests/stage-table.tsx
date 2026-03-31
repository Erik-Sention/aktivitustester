"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { TestStage } from "@/types";

type StageRow = Omit<TestStage, "id" | "testId">;

interface StageTableProps {
  stages: StageRow[];
  onChange?: (stages: StageRow[]) => void;
  readOnly?: boolean;
  testType?: string;
  /** Keys to hide from the column list */
  excludeKeys?: (keyof StageRow)[];
  /** Additional keys to show as locked (read-only) text */
  lockedKeys?: (keyof StageRow)[];
  /** Use running column set (Speed instead of Watts) */
  isRunning?: boolean;
  /** Show optional Borg Central/Local columns */
  showBorgOptional?: boolean;
  /** Show optional PaO2/PaCO2/BE columns for VO2Max */
  showVo2Extended?: boolean;
  /** Use smaller inputs for compact display */
  dense?: boolean;
  /**
   * When set, activates running per-minute mode:
   * - Uses speed-based columns (loadSpeedKmh locked/pre-filled)
   * - stageNumber is treated as minute index
   * - Lactate, RPE, Borg columns are only editable on step-end rows
   */
  runningStepMinutes?: number;
  /**
   * When set, activates cycling per-minute mode:
   * - Uses watts-based columns (loadWatts locked/pre-filled)
   * - stageNumber is treated as minute index
   * - Lactate, RPE, Borg columns are only editable on step-end rows
   */
  cyclingStepMinutes?: number;
}

const lactateCols: { key: keyof StageRow; label: string }[] = [
  { key: "stageNumber", label: "#" },
  { key: "loadWatts", label: "Watts" },
  { key: "heartRate", label: "HR (bpm)" },
  { key: "lactateMmol", label: "Lac (mmol/L)" },
  { key: "rpe", label: "Borg RPE" },
  { key: "cadenceRpm", label: "RPM" },
  { key: "durationSeconds", label: "Sec" },
];

/** Running lactate: per-minute rows. Speed is pre-filled/locked. */
const runningCols: { key: keyof StageRow; label: string }[] = [
  { key: "stageNumber", label: "Min" },
  { key: "loadSpeedKmh", label: "Speed (km/h)" },
  { key: "heartRate", label: "HR (bpm)" },
  { key: "lactateMmol", label: "Lac (mmol/L)" },
  { key: "rpe", label: "Borg RPE" },
];

/** Running lactate: per-step rows (one row per stage). Speed is pre-filled/locked. */
const runningStepCols: { key: keyof StageRow; label: string }[] = [
  { key: "stageNumber", label: "#" },
  { key: "loadSpeedKmh", label: "Speed (km/h)" },
  { key: "heartRate", label: "HR (bpm)" },
  { key: "lactateMmol", label: "Lac (mmol/L)" },
  { key: "rpe", label: "Borg RPE" },
];

/** Cycling lactate: per-minute rows. Watts is pre-filled/locked. */
const cyclingPerMinuteCols: { key: keyof StageRow; label: string }[] = [
  { key: "stageNumber", label: "Min" },
  { key: "loadWatts", label: "Watts" },
  { key: "heartRate", label: "HR (bpm)" },
  { key: "lactateMmol", label: "Lac (mmol/L)" },
  { key: "rpe", label: "Borg RPE" },
];

/** Columns that are only enterable at step-end rows in running mode */
const RUNNING_STEP_END_ONLY = new Set<keyof StageRow>([
  "lactateMmol", "rpe", "borgCentral", "borgLocal",
]);

const borgOptionalCols: { key: keyof StageRow; label: string }[] = [
  { key: "borgCentral", label: "Borg C/CV" },
  { key: "borgLocal", label: "Borg L/M" },
];

const vo2Cols: { key: keyof StageRow; label: string }[] = [
  { key: "stageNumber", label: "#" },
  { key: "loadWatts", label: "WR (W)" },
  { key: "heartRate", label: "HR (bpm)" },
  { key: "vo2MlKgMin", label: "VO2/kg (ml/kg/min)" },
  { key: "vo2Absolute", label: "VO2 (ml/min)" },
  { key: "veO2", label: "VE/O2" },
  { key: "veCo2", label: "VE/CO2" },
  { key: "respiratoryFreq", label: "RF (b/min)" },
  { key: "fatGh", label: "FAT (g/h)" },
  { key: "choGh", label: "CHO (g/h)" },
  { key: "energyExpenditure", label: "EE (kcal/h)" },
];

const vo2ExtendedCols: { key: keyof StageRow; label: string }[] = [
  { key: "paO2", label: "PaO2 (mmHg)" },
  { key: "paCo2", label: "PaCO2 (mmHg)" },
  { key: "baseExcess", label: "BE (mmol/L)" },
];

const defaultCols: { key: keyof StageRow; label: string }[] = [
  { key: "stageNumber", label: "#" },
  { key: "loadWatts", label: "Watts" },
  { key: "heartRate", label: "HR (bpm)" },
  { key: "lactateMmol", label: "Lac (mmol/L)" },
  { key: "vo2MlKgMin", label: "VO2" },
  { key: "durationSeconds", label: "Sec" },
];

function toDisplayStrings(stages: StageRow[], columns: { key: keyof StageRow }[]): string[][] {
  return stages.map((s) =>
    columns.map((col) => {
      const v = s[col.key];
      return v == null ? "" : String(v);
    })
  );
}

export function StageTable({
  stages,
  onChange,
  readOnly = false,
  testType,
  excludeKeys,
  lockedKeys,
  isRunning = false,
  showBorgOptional = false,
  showVo2Extended = false,
  dense = false,
  runningStepMinutes,
  cyclingStepMinutes,
}: StageTableProps) {
  const isRunningMode = !!runningStepMinutes;
  const isCyclingMinuteMode = !!cyclingStepMinutes;
  const isPerMinuteMode = isRunningMode || isCyclingMinuteMode;
  const activeStepMinutes = runningStepMinutes ?? cyclingStepMinutes;

  let baseCols: { key: keyof StageRow; label: string }[];
  if (isRunningMode) {
    baseCols = runningCols;
  } else if (isCyclingMinuteMode) {
    baseCols = cyclingPerMinuteCols;
  } else if (isRunning && testType === "LACTATE_THRESHOLD") {
    baseCols = runningStepCols;
  } else if (testType === "LACTATE_THRESHOLD") {
    baseCols = lactateCols;
  } else if (testType === "VO2MAX") {
    baseCols = vo2Cols;
  } else {
    baseCols = defaultCols;
  }
  let withOptional = baseCols;
  if (showBorgOptional && (testType === "LACTATE_THRESHOLD" || isPerMinuteMode)) {
    withOptional = [...baseCols, ...borgOptionalCols];
  } else if (showVo2Extended && testType === "VO2MAX") {
    withOptional = [...baseCols, ...vo2ExtendedCols];
  }
  const columns = excludeKeys
    ? withOptional.filter((c) => !excludeKeys.includes(c.key))
    : withOptional;

  const [displayValues, setDisplayValues] = useState<string[][]>(() =>
    toDisplayStrings(stages, columns)
  );

  useEffect(() => {
    setDisplayValues(toDisplayStrings(stages, columns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length, columns.length, testType, showBorgOptional]);

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  function setRef(rowIdx: number, colIdx: number, el: HTMLInputElement | null) {
    const key = `${rowIdx}-${colIdx}`;
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  }

  function focusCell(rowIdx: number, colIdx: number) {
    inputRefs.current.get(`${rowIdx}-${colIdx}`)?.focus();
  }

  const firstEditableCol = 1;

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rowIdx + 1 < stages.length) focusCell(rowIdx + 1, colIdx);
    } else if (e.key === "Tab" && !e.shiftKey) {
      const nextCol = colIdx + 1;
      if (nextCol < columns.length) {
        e.preventDefault();
        focusCell(rowIdx, nextCol);
      } else if (rowIdx + 1 < stages.length) {
        e.preventDefault();
        focusCell(rowIdx + 1, firstEditableCol);
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      const prevCol = colIdx - 1;
      if (prevCol >= firstEditableCol) {
        e.preventDefault();
        focusCell(rowIdx, prevCol);
      } else if (rowIdx > 0) {
        e.preventDefault();
        focusCell(rowIdx - 1, columns.length - 1);
      }
    }
  }

  function handleChange(rowIdx: number, colIdx: number, raw: string) {
    if (!/^-?\d*\.?\d*$/.test(raw)) return;

    setDisplayValues((prev) => {
      const next = prev.map((r) => [...r]);
      next[rowIdx][colIdx] = raw;
      return next;
    });

    if (raw === "" || /^-?\d+(\.\d+)?$/.test(raw)) {
      const col = columns[colIdx];
      const numericValue = raw === "" ? null : Number(raw);
      const nextStages = stages.map((s, i) => {
        if (i !== rowIdx) return s;
        return { ...s, [col.key]: numericValue };
      });
      onChange?.(nextStages);
    }
  }

  function handleBlur(rowIdx: number, colIdx: number) {
    const raw = displayValues[rowIdx]?.[colIdx] ?? "";
    const cleaned = raw.replace(/\.$/, "").replace(/^-$/, "");
    if (cleaned !== raw) {
      setDisplayValues((prev) => {
        const next = prev.map((r) => [...r]);
        next[rowIdx][colIdx] = cleaned;
        return next;
      });
      const col = columns[colIdx];
      const nextStages = stages.map((s, i) => {
        if (i !== rowIdx) return s;
        return { ...s, [col.key]: cleaned === "" ? null : Number(cleaned) };
      });
      onChange?.(nextStages);
    }
  }

  function addStage() {
    onChange?.([
      ...stages,
      {
        stageNumber: stages.length + 1,
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
  }

  function removeStage(index: number) {
    const next = stages
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stageNumber: i + 1 }));
    onChange?.(next);
  }

  const inputCls = dense ? "h-10 w-16 text-sm" : "h-11 w-24 text-sm";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left py-4 px-3 text-sm font-black text-[#1D1D1F] uppercase tracking-wide whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              {!readOnly && !isPerMinuteMode && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, rowIdx) => {
              const isStepEnd = isPerMinuteMode
                ? (stage.stageNumber === 0 || (stage.stageNumber > 0 && stage.stageNumber % activeStepMinutes! === 0))
                : true;
              const rowBg = isPerMinuteMode
                ? (isStepEnd ? "border-b bg-[#007AFF]/[0.04] last:border-0" : "border-b last:border-0")
                : "border-b last:border-0";
              return (
                <tr key={rowIdx} className={rowBg + " [&_td]:py-4 [&_td]:px-3"}>
                  {columns.map((col, colIdx) => {
                    const isLockedCol = (isPerMinuteMode && (
                      col.key === "stageNumber" ||
                      (isRunningMode && col.key === "loadSpeedKmh") ||
                      (isCyclingMinuteMode && col.key === "loadWatts")
                    )) || !!lockedKeys?.includes(col.key);
                    const isStepEndOnly = isPerMinuteMode && RUNNING_STEP_END_ONLY.has(col.key);
                    const isDisabled = isStepEndOnly && !isStepEnd;
                    return (
                      <td key={col.key} className="">
                        {readOnly || isLockedCol ? (
                          <span className={`px-2 text-secondary ${isLockedCol ? "tabular-nums" : ""}`}>
                            {stage[col.key] ?? "—"}
                          </span>
                        ) : col.key === "stageNumber" ? (
                          <span className="px-2 text-muted-foreground font-medium">{stage.stageNumber}</span>
                        ) : isDisabled ? (
                          <span className="px-2 text-secondary/40 text-sm">—</span>
                        ) : (
                          <Input
                            ref={(el) => setRef(rowIdx, colIdx, el)}
                            type="text"
                            inputMode="decimal"
                            className={inputCls}
                            value={displayValues[rowIdx]?.[colIdx] ?? ""}
                            onChange={(e) => handleChange(rowIdx, colIdx, e.target.value)}
                            onBlur={() => handleBlur(rowIdx, colIdx)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                          />
                        )}
                      </td>
                    );
                  })}
                  {!readOnly && !isPerMinuteMode && (
                    <td className="py-1 px-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeStage(rowIdx)}
                        disabled={stages.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && !isPerMinuteMode && (
        <Button type="button" variant="outline" size="sm" onClick={addStage}>
          <Plus className="h-4 w-4" />
          Add stage
        </Button>
      )}
    </div>
  );
}
