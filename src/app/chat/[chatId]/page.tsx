import ChatView from '@/components/chat/chat-view';

export default function IndividualChatPage({
  params,
}: {
  params: { chatId: string };
}) {
  return <ChatView chatId={params.chatId} />;
}
