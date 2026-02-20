'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { SidebarProvider } from '@/components/ui/sidebar';
import ChatList from '@/components/chat/chat-list';
import { User } from 'firebase/auth';
import { useIsMobile } from '@/hooks/use-mobile';

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const params = useParams();
  const isMobile = useIsMobile();
  const hasChatId = !!params.chatId;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // On mobile, show ChatList if no chat is selected, or the ChatView if a chat is selected.
  if (isMobile) {
    return hasChatId ? (
      <main className="h-screen flex flex-col">{children}</main>
    ) : (
      <ChatList currentUser={user as User} />
    );
  }

  // On desktop, show both side-by-side.
  return (
    <div className="h-screen w-full flex">
      <ChatList currentUser={user as User} />
      <main className="flex-1 h-screen flex flex-col">{children}</main>
    </div>
  );
}

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
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </SidebarProvider>
  );
}
