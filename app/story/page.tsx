"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const tokens = [
  { name: "--background",          value: "hsl(0 0% 96%)",      label: "background" },
  { name: "--foreground",          value: "hsl(240 6% 10%)",     label: "foreground" },
  { name: "--card",                value: "hsl(0 0% 100%)",      label: "card" },
  { name: "--primary",             value: "hsl(211 100% 50%)",   label: "primary (#007AFF)" },
  { name: "--secondary",           value: "hsl(240 5% 94%)",     label: "secondary" },
  { name: "--muted",               value: "hsl(240 5% 94%)",     label: "muted" },
  { name: "--muted-foreground",    value: "hsl(240 4% 52%)",     label: "muted-foreground" },
  { name: "--accent",              value: "hsl(211 100% 50%)",   label: "accent" },
  { name: "--destructive",         value: "hsl(0 75% 55%)",      label: "destructive" },
  { name: "--border",              value: "hsl(240 5% 90%)",     label: "border" },
  { name: "--input",               value: "hsl(240 5% 90%)",     label: "input" },
  { name: "--ring",                value: "hsl(211 100% 50%)",   label: "ring" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#86868B] mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1D1D1F] mb-1">Component Story</h1>
        <p className="text-sm text-[#86868B] mb-10">Alla UI-komponenter och design tokens på ett ställe.</p>

        {/* TYPOGRAPHY */}
        <Section title="Typografi">
          <div className="bg-white rounded-3xl p-8 border border-black/[0.05] shadow-sm space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] mb-2">Playfair Display — rubriker</p>
              <h1 className="text-5xl font-bold text-[#1D1D1F]">H1 Aktivitus</h1>
              <h2 className="text-4xl font-bold text-[#1D1D1F]">H2 Tröskeltest</h2>
              <h3 className="text-3xl font-semibold text-[#1D1D1F]">H3 Resultatöversikt</h3>
              <h4 className="text-2xl font-semibold text-[#1D1D1F]">H4 Rådata per steg</h4>
            </div>
            <div className="border-t border-[hsl(var(--border))] pt-6 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] mb-2">Rajdhani — brödtext</p>
              <p className="text-base text-[#1D1D1F]">Regular — Laktattröskel 1 (LT1) mäter aerob förmåga vid 2.0 mmol/L.</p>
              <p className="text-base font-medium text-[#1D1D1F]">Medium — VO₂ max representerar maximal syreupptagningsförmåga.</p>
              <p className="text-base font-semibold text-[#1D1D1F]">Semibold — Testresultat sparas direkt i Firebase.</p>
              <p className="text-base font-bold text-[#1D1D1F]">Bold — Atlet: Erik Hansson · 240W · 3 min/steg</p>
              <p className="text-sm text-[#86868B]">Small muted — testdatum, protokollinfo, sidokommentarer</p>
            </div>
          </div>
        </Section>

        {/* DESIGN TOKENS */}
        <Section title="Design Tokens — Färger">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tokens.map((t) => (
              <div key={t.name} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-black/[0.05]">
                <div
                  className="w-10 h-10 rounded-xl shrink-0 border border-black/[0.08]"
                  style={{ background: t.value }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1D1D1F] truncate">{t.label}</p>
                  <p className="text-[10px] text-[#86868B] truncate">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* BUTTON */}
        <Section title="Button — Varianter">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-sm space-y-6">
            {(["default", "destructive", "outline", "secondary", "ghost", "link"] as const).map((variant) => (
              <div key={variant}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] mb-2">{variant}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={variant} size="sm">Small</Button>
                  <Button variant={variant} size="default">Default</Button>
                  <Button variant={variant} size="lg">Large</Button>
                  <Button variant={variant} size="icon">⚡</Button>
                  <Button variant={variant} disabled>Disabled</Button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* CARD */}
        <Section title="Card">
          <Card>
            <CardHeader>
              <CardTitle>Korthuvud</CardTitle>
              <CardDescription>En kortbeskrivning visas här under titeln.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#1D1D1F]">Kortets innehåll — formulär, text, tabeller eller vad som helst.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Spara</Button>
              <Button variant="ghost" size="sm" className="ml-2">Avbryt</Button>
            </CardFooter>
          </Card>
        </Section>

        {/* INPUT */}
        <Section title="Input">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-sm space-y-4 max-w-sm">
            <div>
              <Label htmlFor="input-normal">Normal</Label>
              <Input id="input-normal" defaultValue="Erik Hansson" />
            </div>
            <div>
              <Label htmlFor="input-placeholder">Med placeholder</Label>
              <Input id="input-placeholder" placeholder="Skriv något här..." />
            </div>
            <div>
              <Label htmlFor="input-disabled">Disabled</Label>
              <Input id="input-disabled" defaultValue="Inaktivt fält" disabled />
            </div>
          </div>
        </Section>

        {/* LABEL */}
        <Section title="Label">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-sm space-y-2 max-w-sm">
            <Label>Ensam label</Label>
            <div>
              <Label htmlFor="label-pair">Kopplad till input</Label>
              <Input id="label-pair" placeholder="Klicka på label ovan..." />
            </div>
          </div>
        </Section>

        {/* SELECT */}
        <Section title="Select">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-sm space-y-4 max-w-sm">
            <div>
              <Label htmlFor="select-normal">Normal</Label>
              <Select id="select-normal" defaultValue="cykel">
                <option value="cykel">Cykel</option>
                <option value="lopning">Löpning</option>
                <option value="simning">Simning</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="select-disabled">Disabled</Label>
              <Select id="select-disabled" defaultValue="cykel" disabled>
                <option value="cykel">Cykel</option>
              </Select>
            </div>
          </div>
        </Section>

        {/* TEXTAREA */}
        <Section title="Textarea">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-sm space-y-4 max-w-sm">
            <div>
              <Label htmlFor="textarea-normal">Normal</Label>
              <Textarea id="textarea-normal" placeholder="Skriv anteckningar här..." />
            </div>
            <div>
              <Label htmlFor="textarea-disabled">Disabled</Label>
              <Textarea id="textarea-disabled" defaultValue="Inaktivt textfält" disabled />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
