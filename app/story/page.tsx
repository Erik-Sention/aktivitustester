import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default async function StoryPage() {
  // Auth temporarily disabled for local review — re-enable before prod
  // const user = await getSessionUser()
  // if (!user || user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-1">Component Story</h1>
        <p className="text-sm text-primary mb-2">Alla UI-komponenter och design tokens på ett ställe.</p>

        {/* TYPOGRAPHY RULES */}
        <div className="mb-10 rounded-2xl bg-[#007AFF] p-5 text-white">
          <p className="text-sm font-black uppercase tracking-wider mb-3">Typografiregler</p>
          <ul className="text-sm space-y-1.5">
            <li>• Minsta textstorlek för brödtext: <strong>text-sm (14px)</strong> — aldrig text-xs för viktig data</li>
            <li>• Primär text: <strong>text-primary</strong> (#1D1D1F) — all brödtext, etiketter, rubriker, viktig data</li>
            <li>• Sekundär text: <strong>text-secondary</strong> (#515154) — tidsstämplar, enheter, underordnad info</li>
            <li>• Interaktiv text: <strong>text-interactive</strong> (#007AFF) — länktext och knappar endast</li>
          </ul>
        </div>

        {/* TYPOGRAPHY */}
        <Section title="Typografi">
          <div className="bg-white rounded-3xl p-8 border border-black/[0.05] shadow-apple space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Playfair Display — rubriker</p>
              <h1 className="text-5xl font-bold text-primary">H1 Aktivitus</h1>
              <h2 className="text-4xl font-bold text-primary">H2 Tröskeltest</h2>
              <h3 className="text-3xl font-semibold text-primary">H3 Resultatöversikt</h3>
              <h4 className="text-2xl font-semibold text-primary">H4 Rådata per steg</h4>
            </div>
            <div className="border-t border-[hsl(var(--border))] pt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Rajdhani — brödtext</p>
              <p className="text-base text-primary">Regular — Laktattröskel 1 (LT1) mäter aerob förmåga vid 2.0 mmol/L.</p>
              <p className="text-base font-medium text-primary">Medium — VO₂ max representerar maximal syreupptagningsförmåga.</p>
              <p className="text-base font-semibold text-primary">Semibold — Testresultat sparas direkt i Firebase.</p>
              <p className="text-base font-bold text-primary">Bold — Atlet: Erik Hansson · 240W · 3 min/steg</p>
              <p className="text-sm text-secondary">Small (secondary) — testdatum, protokollinfo, sidokommentarer</p>
            </div>
          </div>
        </Section>

        {/* DESIGN TOKENS */}
        <Section title="Design Tokens — Färger">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tokens.map((t) => (
              <div key={t.name} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-apple border border-black/[0.05]">
                <div
                  className="w-10 h-10 rounded-xl shrink-0 border border-black/[0.08]"
                  style={{ background: t.value }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary truncate">{t.label}</p>
                  <p className="text-xs text-primary/60 truncate">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* BUTTON */}
        <Section title="Button — Varianter">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-apple space-y-6">
            {(["default", "destructive", "outline", "secondary", "ghost", "link"] as const).map((variant) => (
              <div key={variant}>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">{variant}</p>
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
              <p className="text-sm text-primary">Kortets innehåll — formulär, text, tabeller eller vad som helst.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Spara</Button>
              <Button variant="ghost" size="sm" className="ml-2">Avbryt</Button>
            </CardFooter>
          </Card>
        </Section>

        {/* INPUT */}
        <Section title="Input">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-apple space-y-4 max-w-sm">
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
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-apple space-y-2 max-w-sm">
            <Label>Ensam label</Label>
            <div>
              <Label htmlFor="label-pair">Kopplad till input</Label>
              <Input id="label-pair" placeholder="Klicka på label ovan..." />
            </div>
          </div>
        </Section>

        {/* SELECT */}
        <Section title="Select">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-apple space-y-4 max-w-sm">
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
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-apple space-y-4 max-w-sm">
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

        {/* FILTER PILLS */}
        <Section title="Filter Pills">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.05] shadow-apple space-y-4">
            <p className="text-sm text-secondary">
              Används för att filtrera listor. Använd <code className="text-xs bg-[#F5F5F7] px-1.5 py-0.5 rounded">buttonVariants(&#123; variant: &quot;default&quot;, size: &quot;sm&quot; &#125;)</code> för aktiv och <code className="text-xs bg-[#F5F5F7] px-1.5 py-0.5 rounded">variant: &quot;outline&quot;</code> för inaktiv.
            </p>
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Aktiv</p>
              <div className="flex flex-wrap gap-2">
                <button className={cn(buttonVariants({ variant: "default", size: "sm" }))}>Alla</button>
                <button className={cn(buttonVariants({ variant: "default", size: "sm" }))}>Tröskeltest</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Inaktiv</p>
              <div className="flex flex-wrap gap-2">
                <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>VO₂ max</button>
                <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Wingate</button>
                <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Dokument</button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
