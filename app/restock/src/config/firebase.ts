import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // Only set databaseURL when actually configured; otherwise getDatabase() throws
  // at module-load time and brings down the whole app.
  ...(databaseURL ? { databaseURL } : {}),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Realtime DB is optional — if VITE_FIREBASE_DATABASE_URL isn't set the app
// still works, just without live shopping-list sync (clients fall back to
// manual reload after their own writes).
export const database: Database | null = databaseURL ? getDatabase(app) : null;
if (!database) {
  console.warn(
    "VITE_FIREBASE_DATABASE_URL not set — Realtime DB sync disabled. Live updates won't propagate across clients."
  );
}

export const analyticsPromise: Promise<Analytics | null> = isSupported().then((yes) =>
  yes ? getAnalytics(app) : null
);
