'use client';

import ChatView from '@/components/chat/chat-view';

// This is the page component that will be rendered for each individual chat.
// It receives the chatId from the URL params, and the drafts/setDrafts
// props from the ChatLayout component.
export default function IndividualChatPage({ params, drafts, setDrafts }: { 
    params: { chatId: string },
    drafts: { [key: string]: string };
    setDrafts: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}) {
  return <ChatView chatId={params.chatId} drafts={drafts} setDrafts={setDrafts} />;
}
