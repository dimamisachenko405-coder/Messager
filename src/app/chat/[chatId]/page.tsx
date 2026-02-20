'use client';

import { use } from 'react';
import ChatView from '@/components/chat/chat-view';

// This page component uses `use(params)` to correctly resolve the chatId,
// which is the modern way to handle params in Next.js App Router.
// It then renders the ChatView, which gets all its necessary data
// (like drafts) from the `DraftsProvider` context.
export default function IndividualChatPage({ params }: { 
    params: Promise<{ chatId: string }>,
}) {
  const { chatId } = use(params);
  return <ChatView chatId={chatId} />;
}
