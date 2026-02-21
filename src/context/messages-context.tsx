'use client';

import type { Message } from '@/lib/types';
import React, { createContext, useContext, useState } from 'react';

// 1. Define the shape of the context data
interface MessagesContextType {
  // The cache will be an object where keys are chatIds and values are arrays of messages.
  messagesCache: Record<string, Message[]>;
  // Function to set or update the messages for a specific chat.
  setMessagesForChat: (chatId: string, messages: Message[]) => void;
}

// 2. Create the context with a default value (usually undefined or null for client components)
const MessagesContext = createContext<MessagesContextType | undefined>(
  undefined
);

// 3. Create the Provider component
export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messagesCache, setMessagesCache] = useState<
    Record<string, Message[]>
  >({});

  const setMessagesForChat = (chatId: string, messages: Message[]) => {
    setMessagesCache((prevCache) => ({
      ...prevCache,
      [chatId]: messages,
    }));
  };

  const value = {
    messagesCache,
    setMessagesForChat,
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

// 4. Create a custom hook for easy access to the context
export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
