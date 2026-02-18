'use server';

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { z } from 'zod';
import { auth, firestore } from '@/firebase/server';

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

async function handleAuthError(error: any): Promise<string> {
  console.error(error);
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/api-key-not-valid':
      return 'The API key is invalid. Please check your configuration.';
    case 'auth/requests-to-this-api-are-blocked':
      return 'Identity Toolkit API is not enabled. Please enable it in the Google Cloud console.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

export async function signup(values: z.infer<typeof signupSchema>) {
  try {
    const validated = signupSchema.safeParse(values);
    if (!validated.success) {
      return 'Invalid input.';
    }
    const { name, email, password } = validated.data;
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    await sendEmailVerification(user);

    await updateProfile(user, { displayName: name });

    // This operation is now allowed by the updated security rules
    await setDoc(doc(firestore, 'userProfiles', user.uid), {
      uid: user.uid,
      username: name,
      email: user.email!,
      profilePictureUrl: user.photoURL,
      lastActive: serverTimestamp(),
    });

    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return null;
  } catch (error) {
    console.error('Error signing out:', error);
    return 'Failed to sign out.';
  }
}
