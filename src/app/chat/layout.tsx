'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import ChatList from '@/components/chat/chat-list';
import type { User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { DraftsProvider } from '@/context/drafts-context';
import { MessagesProvider } from '@/context/messages-context'; // Import the new provider

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const hasChatId = /\/chat\/.+/.test(pathname);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      const userProfileRef = doc(firestore, 'userProfiles', user.uid);
      const updateLastActive = () => {
        updateDoc(userProfileRef, { lastActive: serverTimestamp() }).catch(console.error);
      };
      updateLastActive();
      const intervalId = setInterval(updateLastActive, 60000);
      return () => clearInterval(intervalId);
    }
  }, [user, firestore]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    // Wrap both providers. The order doesn't strictly matter here,
    // but it's good to be consistent.
    <MessagesProvider>
      <DraftsProvider>
        <div className="flex h-screen w-full">
          <aside
            className={cn(
              'flex-col bg-card',
              hasChatId
                ? 'hidden md:flex md:w-[340px] md:border-r'
                : 'flex w-full md:w-[340px] md:border-r'
            )}
          >
            <ChatList currentUser={user as User} />
          </aside>
          <main
            className={cn(
              'flex-1 flex-col',
              hasChatId ? 'flex' : 'hidden md:flex'
            )}
          >
            {children}
          </main>
        </div>
      </DraftsProvider>
    </MessagesProvider>
  );
}
