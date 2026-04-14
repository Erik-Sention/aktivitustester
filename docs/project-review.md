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

#### S1 — Firestore Security Rules tillåter vem som helst att läsa/skriva
**Fil:** `firestore.rules`

```javascript
// Nuläge — OSÄKERT
match /{document=**} {
  allow read, write: if true;
}
```

Firebase client SDK är exponerad i webbläsaren (det är ok — det är by design). Men kombinationen med `if true` innebär att vem som helst med API-nyckeln (som finns i klientkoden) kan läsa och skriva all data direkt — utan att logga in.

**Fix:** Kräv att användaren är inloggad med Firebase Auth:
```javascript
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

Firebase Auth-sessionen lever redan kvar på klienten efter inloggning (appen loggar in med `signInWithEmailAndPassword`). Ändringen är minimal och bryter ingenting i det nuvarande flödet.

---

#### S2 — Filuppladdning saknar storleksgräns
**Fil:** `app/api/upload-athlete-file/route.ts`

Filtyp (PDF) kontrolleras men inte storlek. En angripare kan ladda upp godtyckligt stora filer och fylla Firebase Storage.

**Fix:** Lägg till storleksgräns på 50 MB.

---

### PRIORITET 2 — Bra att göra relativt snart

#### S3 — Sessionstid: 14 dagar (för lång), och sessionen förnyas inte
**Filer:** `lib/session.ts`, `middleware.ts`

Om en sessions-cookie stjäls (t.ex. via delad dator) gäller den upp till 14 dagar.

Dessutom: sessionen har fast utgångstid från inloggning. En coach som loggar in kl 08:00 och börjar ett test kl 19:50 (session ut kl 20:00) kan få sparandet att misslyckas när de trycker "Spara" kl 20:10 — trots att sidladdningen fungerade.

**Fix: Rullande session (sliding window)**
Middleware förlänger cookie-expireringstiden vid varje request. Sessionen varar 12 timmar från *senaste aktivitet*, inte från inloggningstillfälle. Man kan alltså aldrig bli utloggad mitt under ett pågående test.

---

#### S4 — Proxy-image-endpoint URL-validering kan kringgås
**Fil:** `app/api/proxy-image/route.ts`

```typescript
// Nuläge — kan kringgås med t.ex. https://firebasestorage.googleapis.com@angripare.com/
if (!url.startsWith("https://firebasestorage.googleapis.com/")) { ... }
```

**Fix:** Parsa URL-en med `new URL()` och kontrollera `hostname`.

---

### INFORMATIONSPUNKTER (inget att åtgärda nu)

| Punkt | Förklaring |
|-------|------------|
| **SESSION_SECRET** | Hårdkodad men säker — OK tills vidare |
| **Firebase Admin /tmp** | Admin SDK skriver credentials till `/tmp/gcp-adc.json`. På Vercel (serverless) är varje anrop isolerat, så risken är låg. |
| **Roller (ADMIN/TRAINER)** | Systemet är en coach-app idag. Roller kan implementeras när vi vet exakt vad vi vill begränsa. |
| **CSP-header (Content Security Policy)** | Skyddar mot XSS. Nice-to-have, inte kritiskt just nu. |
| **Testkredentialer i .env.test.local** | OK — filen commitas inte till git. |

---

## 3. Funktioner att bygga (prioritetsordning)

### Fas 1 — Säkerhet + stabilitet (innan onboarding)

1. **Firestore rules** — `if request.auth != null` (se S1)
2. **Filuppladdning storleksgräns** — 50 MB (se S2)
3. **Rullande session** — 12h från senaste aktivitet (se S3)
4. **Proxy-image fix** — `new URL()` validering (se S4)
5. **Filistning reparerad** — Hämta filer via client-side Firebase Auth istället för Admin SDK

### Fas 2 — UX-polish

6. **Varning om osparade ändringar** — Dialogruta om coach navigerar bort mitt i test
7. **Felhantering globalt** — Error boundaries (`error.tsx`) och toast-notiser
8. **Coachprofil felhantering** — Fyll i `catch`-blocket med felmeddelande
9. **Onboarding-guide** — Hjälptexter/tooltips för ny coach
10. **Wingate-redigering** — Utöka EditTestForm att hantera Wingatedata
11. **Mobile-optimering** — Responsiv data-entry-tabell

### Fas 3 — Avancerade funktioner (post-MVP)

12. **Trendanalys** — Visa hur LT1/LT2 förändrats per atlet över tid
13. **Rapportpaket** — Exportera alla tester för en atlet som ett PDF-häfte
14. **API för atlet-app** — Exponera testdata för extern konsumtion
15. **Bulk CSV-import** — Importera historiska testdata
16. **Mörkt läge**

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
- [ ] Öppna Firebase Console → bekräfta att Firestore rules kräver auth
- [ ] Försök hämta data via Firestore REST API utan token → ska returnera 403
- [ ] Ladda upp 51 MB-fil → ska avvisas med felmeddelande

### Rekommenderade automatiska tester (saknas idag)

- Unit-test för `interpolateLactateThreshold` (kantvärden: all data under 2.0, alla över 4.0, exakt 2.0)
- Unit-test för VO2max Kuipers-formel mot kända värden
- Unit-test för Wingate Fatigue Index

---

## 5. Onboarding-plan för utvalda coacher

### Förutsättningar (måste vara klart)

- [ ] S1 (Firestore rules) åtgärdat
- [ ] S2 (filstorlek) åtgärdat
- [ ] Inga kvarlämnande test-/demo-atleter i databasen
- [ ] Fungerande lösenordsåterställning (Firebase Auth standard)

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

## 6. Kritiska filer att modifiera

| Åtgärd | Filer |
|--------|-------|
| S1 — Firestore rules | `firestore.rules` |
| S2 — Filstorlek | `app/api/upload-athlete-file/route.ts` |
| S3 — Rullande session | `lib/session.ts`, `middleware.ts` |
| S4 — Proxy URL | `app/api/proxy-image/route.ts` |
| Filistning | `app/dashboard/athletes/[id]/page.tsx`, `lib/athlete-files.ts` |
| Coachprofil error | `app/dashboard/profile/profile-form.tsx` |
| Wingate edit | `app/dashboard/tests/[id]/edit/edit-form.tsx` |
