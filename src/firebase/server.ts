// NOTE: This is for server-side usage (e.g., in Server Actions)
// It uses the Firebase CLIENT SDK, which is fine in Next.js Server Components/Actions.
// DO NOT USE THIS ON THE CLIENT.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };
