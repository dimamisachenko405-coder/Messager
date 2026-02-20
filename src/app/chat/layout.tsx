'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { SidebarProvider } from '@/components/ui/sidebar';
import ChatList from '@/components/chat/chat-list';
import { User } from 'firebase/auth';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const isMobile = useIsMobile();
  const hasChatId = !!params.chatId;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This ensures client-specific logic runs only after mount.
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Redirect to login if user is not authenticated.
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  // Show a loader until both user is authenticated and client-side checks are done.
  if (isUserLoading || !user || !isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // On mobile, show ChatList if no chat is selected, or the ChatView if a chat is selected.
  if (isMobile) {
    const mobileContent = hasChatId ? (
      <main className="h-screen flex flex-col">{children}</main>
    ) : (
      <ChatList currentUser={user} />
    );
    return <SidebarProvider>{mobileContent}</SidebarProvider>;
  }

  // On desktop, show both side-by-side.
  return (
    <SidebarProvider>
      <div className="h-screen w-full flex">
        <ChatList currentUser={user} />
        <main className="flex-1 h-screen flex flex-col">{children}</main>
      </div>
    </SidebarProvider>
  );
}
