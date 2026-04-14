# Aktivitus Tester — Projektgranskning, Säkerhet & Utvecklingsplan

## Sammanfattning

Aktivitus Tester är ett Next.js-baserat verktyg för laktattröskel- och VO2max-testning riktat till idrottscoacher. Appen är i ett **MVP-komplett tillstånd** — kärnflödena fungerar — men har ett antal säkerhetsrisker som bör åtgärdas innan externa coacher onboardas.

**Viktigt designval (bekräftat):** Atleter är mobila och delas mellan kliniker. Alla autentiserade coacher kan se och testa alla atleter. Det finns ingen klinik-isolation av data — detta är ett aktivt val.

---

## 1. Vad vi har byggt

### Funktioner som fungerar

| Funktion | Status |
|----------|--------|
| Atlethantering (skapa, redigera, ta bort) | ✅ Komplett |
| Tröskeltestregistrering (LiveRecordingView) | ✅ Komplett |
| VO2max-test (Kuipers-formel + manuell override) | ✅ Komplett |
| Wingatetest (peak/medel/min effekt, FI) | ✅ Komplett |
| Resultatvy (LT1/LT2-interpolation, kurvor, tabeller) | ✅ Komplett |
| Testjämförelse (2+ tester sida vid sida) | ✅ Komplett |
| PDF-rapportgenerering | ✅ Komplett |
| Coachprofil med avatar | ✅ Komplett |
| Filuppladdning (bilagor till atlet) | ✅ Komplett |
| Träningszonsberäkning (Z1–Z8) | ✅ Komplett |
| Cykelinställningar (sadel, styre) | ✅ Komplett |
| Filterfliken i testlista | ✅ Komplett |
| Skeleton-loading medan filer hämtas | ✅ Komplett |

### Delvis implementerat / med kända brister

| Funktion | Problem |
|----------|---------|
| Filistning på atletprofil | Kommenterad rad — kräver Admin SDK men vi kör client-side; måste lösas med Firebase Auth-baserad klientfråga |
| Wingate-redigering | EditTestForm stöder inte Wingatedata |
| Coachprofil felhantering | `catch {}` utan felmeddelande till användaren |
| `updateTestFromView` / `createTest` | Placeholder-actions som bara loggar `console.warn` — oanvända idag |

---

## 2. Säkerhetsanalys

### Säkerhetsmodell (reviderad efter genomgång)

Appen är en **coach-only app** där:
- Alla autentiserade coacher kan se/testa alla atleter (atleterna är mobila)
- Det finns inga athlete-inlogg idag
- I framtiden kanske ett separat API exponeras för en atlet-app

Det viktigaste skyddet är därför: **se till att obehöriga inte alls kan nå data.**

---

### PRIORITET 1 — Åtgärda nu (innan onboarding)

#### ✅ S1 — Firestore + Storage Security Rules
**Åtgärdat 2026-04-14**

- Alla dashboard-sidor konverterade till client-side data-fetching så Firebase Auth-token finns vid varje Firestore-anrop
- Firestore: `athletes`/`tests` kräver `request.auth != null` för läsning; `coach_profiles`/`athlete_files` kräver auth för allt
- Storage: `coach_avatars` skrivskyddat per uid; `athletes` kräver auth
- NavBar + ProfileForm: väntar på `onAuthStateChanged` innan Firestore-queries körs (race condition fixad)

---

#### ✅ S2 — Filuppladdning storleksgräns
**Åtgärdat 2026-04-14** — `app/api/upload-athlete-file/route.ts`

50 MB-gräns tillagd.

---

### PRIORITET 2 — Bra att göra relativt snart

#### ✅ S3 — Sessionstid reducerad till 12 timmar
**Åtgärdat 2026-04-14** — `app/api/session/route.ts`

Reducerat från 14 dagar till 12 timmar. Rullande session (sliding window via middleware) är **inte** implementerat ännu — kräver Edge Runtime-kompatibel HMAC. Praktiskt sett täcker 12h en normal arbetsdag.

---

#### ✅ S4 — Proxy-image URL-validering
**Åtgärdat 2026-04-14** — `app/api/proxy-image/route.ts`

`startsWith`-check ersatt med `new URL()` + `hostname`-kontroll.

---

### INFORMATIONSPUNKTER (inget att åtgärda nu)

| Punkt | Förklaring |
|-------|------------|
| **SESSION_SECRET** | Hårdkodad men säker — OK tills vidare |
| **Firebase Admin /tmp** | Admin SDK skriver credentials till `/tmp/gcp-adc.json`. På Vercel (serverless) är varje anrop isolerat, så risken är låg. |
| **Roller (ADMIN/TRAINER)** | Systemet är en coach-app idag. Roller kan implementeras när vi vet exakt vad vi vill begränsa. |
| **CSP-header (Content Security Policy)** | Skyddar mot XSS. Nice-to-have, inte kritiskt just nu. |
| **Testkredentialer i .env.test.local** | OK — filen commitas inte till git. |
| **writes på athletes/tests** | Server actions skriver utan Firebase Auth (klient-SDK på server). Skrivningar skyddas av HMAC-session på applagret. Proper fix: Admin SDK när credentials finns. |

---

## 3. Funktioner att bygga (prioritetsordning)

### Fas 1 — Säkerhet + stabilitet (innan onboarding)

1. ✅ **Firestore + Storage rules** — `request.auth != null` för läsning (S1)
2. ✅ **Filuppladdning storleksgräns** — 50 MB (S2)
3. ✅ **Sessionstid** — reducerad till 12h (S3, rullande session kvar att göra)
4. ✅ **Proxy-image fix** — `new URL()` validering (S4)
5. ✅ **Filistning reparerad** — `athlete-tests-panel.tsx` hämtar filer direkt från Firestore client-side; fungerar efter refaktorn till client components

### Fas 2 — UX-polish

6. ✅ **Varning om osparade ändringar** — `beforeunload`-handler i LiveRecordingView när `isDirty`
7. ✅ **Felhantering globalt** — `sonner` installerat, `<Toaster>` i root layout, `error.tsx` i root + dashboard
8. ✅ **Coachprofil felhantering** — `toast.error()` i båda catch-blocken i `profile-form.tsx`
9. ✅ **Onboarding-guide** — `InfoTooltip`-komponent + tooltips på nyckelkfält i setup-formuläret
10. ✅ **Wingate-redigering** — EditTestForm med full Wingate-sektion + Fatigue Index preview
11. ✅ **Mobile-optimering** — `overflow-x-auto` + `min-w-[420px]` på datainmatningstabellen

### Fas 3 — Avancerade funktioner (post-MVP)

12. ⬜ **Trendanalys** — Visa hur LT1/LT2 förändrats per atlet över tid
13. ⬜ **Rapportpaket** — Exportera alla tester för en atlet som ett PDF-häfte
14. ⬜ **API för atlet-app** — Exponera testdata för extern konsumtion
15. ⬜ **Bulk CSV-import** — Importera historiska testdata
16. ⬜ **Mörkt läge**

---

## 4. Testplan

### Manuell testplan inför onboarding

**Flöde 1: Ny coach-inloggning**
- [ ] Logga in → startsida med atletlista
- [ ] Coachprofil: sätt namn + avatar → visas i nav och PDF
- [ ] Verifiera att man bara ser aktiva coaches testdata (inte gamla testsystem)

**Flöde 2: Atlethantering**
- [ ] Skapa atlet med personnummer → födelsedag auto-fylls
- [ ] Redigera atlet → ändringar sparas
- [ ] Ta bort atlet → bekräftelsedialog, atlet försvinner

**Flöde 3: Tröskeltest (cykel)**
- [ ] Skapa nytt test → välj cykel/tröskeltest/3min-protokoll
- [ ] Fyll i data rad för rad → kurvan uppdateras live
- [ ] Spara → resultatvy med LT1/LT2 visas korrekt
- [ ] Redigera test → ändringar sparas
- [ ] Ladda ned PDF → korrekt innehåll

**Flöde 4: VO2max-test**
- [ ] Kör test till utmattning → fyll i Kuipers-data
- [ ] Verifiera VO2max-beräkning och zonklassning

**Flöde 5: Wingate**
- [ ] Fyll i peak/medel/min → Fatigue Index beräknas korrekt

**Flöde 6: Testjämförelse**
- [ ] Välj 2 tester → komparationsvy visar kurvor och tröskelmarkeringar

**Flöde 7: Säkerhetstester (dev utför)**
- [x] Firestore rules uppdaterade — reads kräver Firebase Auth ✅
- [x] Storage rules uppdaterade ✅
- [ ] Försök hämta data via Firestore REST API utan token → ska returnera 403
- [x] Filstorlek begränsad till 50 MB ✅

### Rekommenderade automatiska tester (saknas idag)

- Unit-test för `interpolateLactateThreshold` (kantvärden: all data under 2.0, alla över 4.0, exakt 2.0)
- Unit-test för VO2max Kuipers-formel mot kända värden
- Unit-test för Wingate Fatigue Index

---

## 5. Onboarding-plan för utvalda coacher

### Förutsättningar (måste vara klart)

- [x] S1 (Firestore + Storage rules) åtgärdat ✅
- [x] S2 (filstorlek) åtgärdat ✅
- [ ] Inga kvarlämnande test-/demo-atleter i databasen
- [ ] Fungerande lösenordsåterställning (Firebase Auth standard — verifiera)

### Steg för upplägg av ny coach

**1. Kontoupplägg (admin-uppgift)**
- Skapa Firebase Auth-konto: e-post + temporärt lösenord
- Informera coachen via e-post

**2. Första inloggning (coach)**
- Logga in → uppmanas byta lösenord (Firebase standard)
- Fyll i coachprofil (namn + avatar) → visas i nav och PDF automatiskt

**3. Bekanta sig med appen**
- Skapa en eller två testatleter
- Kör ett testtest med mock-data för att bekanta sig med LiveRecordingView
- Utforska resultatvy, PDF-export och testjämförelse

**4. Supportresurser (att ta fram)**
- Kort video-walkthrough (~3 min) av testregistreringsflödet
- Referensguide: vad LT1 (2.0 mmol) och LT2 (4.0 mmol) innebär
- Kontaktkanal (e-post/Slack) för support under pilotperiod

### Pilotperiod

| Period | Aktivitet |
|--------|-----------|
| Vecka 1–2 | 2–3 utvalda coacher, tät uppföljning, notera buggar |
| Vecka 3–4 | Samla feedback, åtgärda UX-problem |
| Vecka 5+ | Bredare utrullning |

---

## 6. Kritiska filer (status)

| Åtgärd | Filer | Status |
|--------|-------|--------|
| S1 — Firestore rules | `firestore.rules` | ✅ Klart |
| S1 — Storage rules | `storage.rules` | ✅ Klart |
| S1 — Client-side refactor | `app/dashboard/*/_*-client.tsx` | ✅ Klart |
| S2 — Filstorlek | `app/api/upload-athlete-file/route.ts` | ✅ Klart |
| S3 — Sessionstid 12h | `app/api/session/route.ts` | ✅ Klart |
| S3 — Rullande session | `middleware.ts` (saknas) | ⬜ Kvar |
| S4 — Proxy URL | `app/api/proxy-image/route.ts` | ✅ Klart |
| Filistning | `app/dashboard/athletes/[id]/_athlete-detail-client.tsx` | ✅ Klart (via client-side panel fetch) |
| Coachprofil error | `app/dashboard/profile/profile-form.tsx` | ✅ Klart |
| Wingate edit | `app/dashboard/tests/[id]/edit/edit-form.tsx` | ✅ Klart |
