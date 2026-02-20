'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import ChatList from '@/components/chat/chat-list';
import type { User } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const hasChatId = !!params.chatId;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
  );
}
