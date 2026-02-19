import ChatView from '@/components/chat/chat-view';

export default async function IndividualChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return <ChatView chatId={chatId} />;
}
