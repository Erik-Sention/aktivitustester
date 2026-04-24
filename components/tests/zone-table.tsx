import { calculateNineZones } from "@/lib/zones"

interface ZoneTableProps {
  atHR?: number | null
  ltHR?: number | null
  maxHR?: number | null
  atWatt?: number | null
  ltWatt?: number | null
  isSpeed?: boolean
}

export function ZoneTable({ atHR, ltHR, maxHR, atWatt, ltWatt, isSpeed }: ZoneTableProps) {
  const zones = calculateNineZones({ atHR, ltHR, maxHR, atWatt, ltWatt, isSpeed })
  const hasHR   = atHR != null || ltHR != null || maxHR != null
  const hasWatt = atWatt != null || ltWatt != null

  if (!hasHR && !hasWatt) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm">
      <div className="px-5 py-3 bg-[#F5F5F7]/50 border-b border-[hsl(var(--border))]">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Intensitetszoner</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))]">
            <th className="px-4 py-2 text-left text-xs font-black uppercase tracking-wider text-[#515154]">Zon</th>
            {hasHR   && <th className="px-4 py-2 text-right text-xs font-black uppercase tracking-wider text-[#515154]">Puls</th>}
            {hasWatt && <th className="px-4 py-2 text-right text-xs font-black uppercase tracking-wider text-[#515154]">{isSpeed ? "Fart" : "Effekt"}</th>}
          </tr>
        </thead>
        <tbody>
          {[...zones].reverse().map((z) => {
            const dark = z.textColor === "dark"
            const textCls = dark ? "text-[#1D1D1F]" : "text-white"
            return (
              <tr key={z.id} style={{ backgroundColor: z.color }}>
                <td className={`px-4 py-2.5 font-bold ${textCls}`}>{z.label}</td>
                {hasHR   && <td className={`px-4 py-2.5 text-right tabular-nums ${textCls} ${dark ? "opacity-80" : "opacity-90"}`}>{z.hrRange ?? "—"}</td>}
                {hasWatt && <td className={`px-4 py-2.5 text-right tabular-nums ${textCls} ${dark ? "opacity-80" : "opacity-90"}`}>{z.wattRange ?? "—"}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
