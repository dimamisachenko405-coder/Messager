import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

export type Message = {
  id: string;
  text?: string;
  imageUrl?: string;
  senderId: string;
  createdAt: Timestamp;
};

export type Chat = {
  id: string;
  users: string[];
  lastMessage?: Message;
};
