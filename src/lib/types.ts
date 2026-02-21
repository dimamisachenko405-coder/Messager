import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  profilePictureUrl?: string | null;
  lastActive: Timestamp;
};

export type Message = {
  id: string;
  chatId: string;
  text?: string;
  imageUrl?: string;
  senderId: string;
  createdAt: Timestamp;
  isRead: boolean;
};

export type Chat = {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  // Add the unreadCount field
  // It's a map where the key is a user's UID and the value is their unread count
  unreadCount?: { [key: string]: number };
};
