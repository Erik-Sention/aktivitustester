Klart
Ny stack: Firebase Firestore + Firebase Auth (session cookies) — Prisma/SQLite/NextAuth helt borttagna.

Nya filer
Fil	Vad den gör
lib/firebase.ts	Firebase client (Firestore + Auth)
lib/firebase-admin.ts	Firebase Admin (server-side)
lib/calculations.ts	LT1/LT2 linjär interpolering
lib/athletes.ts	Firestore CRUD för athletes
lib/tests.ts	Firestore CRUD för tests + auto-beräkning
lib/session.ts	Server-side sessionsverifiering
app/api/session/route.ts	POST: skapa session-cookie, DELETE: logout
app/api/tests/save/route.ts	Spara test med server-side LT-beräkning
components/athletes/	AthleteForm + DeleteAthleteButton
app/dashboard/athletes/	Alla athlete-sidor
Nästa steg för dig
Skapa ett Firebase-projekt på console.firebase.google.com
Aktivera Firestore och Authentication → Email/Password
Skapa en Service Account under Project Settings → Service accounts → Generate new private key
Fyll i .env.local med alla Firebase-nycklar
Skapa din första användare direkt i Firebase Authentication Console
Kör npm run dev