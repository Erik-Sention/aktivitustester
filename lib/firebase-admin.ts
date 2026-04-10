import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { writeFileSync } from 'fs'

function ensureADCCredentials() {
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (json && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const path = '/tmp/gcp-adc.json'
    writeFileSync(path, json)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path
  }
}

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  ensureADCCredentials()

  // Use service account key if configured, otherwise use Application Default Credentials
  // (run: gcloud auth application-default login)
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

const adminApp = getAdminApp()

export const adminDb = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)
