'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { SidebarProvider } from '@/components/ui/sidebar';
import ChatList from '@/components/chat/chat-list';
import { User } from 'firebase/auth';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

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
    <SidebarProvider>
      <div className="h-screen w-full flex">
        <ChatList currentUser={user as User} />
        <main className="flex-1 h-screen flex flex-col">{children}</main>
      </div>
    </SidebarProvider>
  );
}
