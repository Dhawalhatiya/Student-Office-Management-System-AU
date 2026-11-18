import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export interface AppFirebaseConfig extends FirebaseOptions {
  firestoreDatabaseId?: string;
}

export function getFirebaseConfig(): AppFirebaseConfig {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
    projectId: env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
    messagingSenderId:
      env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
    appId: env.VITE_FIREBASE_APP_ID || appletConfig.appId,
    firestoreDatabaseId:
      env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId,
  };
}

const config = getFirebaseConfig();

export const firebaseApp = initializeApp(config);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = config.firestoreDatabaseId
  ? getFirestore(firebaseApp, config.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export async function testFirestoreConnection(): Promise<{
  ok: boolean;
  offline: boolean;
}> {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    return { ok: true, offline: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return { ok: false, offline: true };
    }
    // Permission-denied before sign-in simply indicates Firestore is reachable and rules are active
    return { ok: true, offline: false };
  }
}

void testFirestoreConnection();
