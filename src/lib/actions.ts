'use server';

import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { z } from 'zod';
import { auth, firestore } from './firebase';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

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
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

export async function login(values: z.infer<typeof loginSchema>) {
  try {
    const validated = loginSchema.safeParse(values);
    if (!validated.success) {
      return 'Invalid input.';
    }
    await signInWithEmailAndPassword(
      auth,
      validated.data.email,
      validated.data.password,
    );
    return null;
  } catch (error) {
    return handleAuthError(error);
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

    await updateProfile(user, { displayName: name });

    await setDoc(doc(firestore, 'users', user.uid), {
      uid: user.uid,
      displayName: name,
      email: user.email,
      photoURL: user.photoURL,
    });

    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}

async function socialSignIn(provider: GoogleAuthProvider | GithubAuthProvider) {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        await setDoc(doc(firestore, 'users', user.uid), {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
        }, { merge: true });

        return null;
    } catch (error) {
        return handleAuthError(error);
    }
}


export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return socialSignIn(provider);
}

export async function signInWithGithub() {
    const provider = new GithubAuthProvider();
    return socialSignIn(provider);
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

export async function sendMessage(
  chatId: string,
  senderId: string,
  messageText: string,
) {
  if (!messageText.trim()) return;

  try {
    const messagesCol = collection(firestore, 'chats', chatId, 'messages');
    await addDoc(messagesCol, {
      senderId,
      text: messageText,
      createdAt: serverTimestamp() as Timestamp,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    // Optionally return an error message to be displayed in a toast
  }
}
