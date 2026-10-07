import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken as readAppCheckToken, type AppCheck } from 'firebase/app-check'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId)
export const firebaseApp = firebaseConfigured ? initializeApp(config) : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? getFirestore(firebaseApp) : null


const DEFAULT_APPCHECK_SITE_KEY = '6LcpY-EtAAAAAElqBbIL_K7nAkm2wpuF6fbhsggG'
let nestAiAppCheck: AppCheck | null = null

export async function getJourneyAppCheckToken(): Promise<string> {
  if (!firebaseApp) throw new Error('NESTJOURNEY_FIREBASE_NOT_CONFIGURED')
  const siteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || DEFAULT_APPCHECK_SITE_KEY).trim()
  if (!siteKey) throw new Error('NESTJOURNEY_APPCHECK_NOT_CONFIGURED')
  if (!nestAiAppCheck) {
    nestAiAppCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
  }
  return (await readAppCheckToken(nestAiAppCheck, false)).token
}
