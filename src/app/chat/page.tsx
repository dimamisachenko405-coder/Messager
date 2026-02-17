import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-background/50 text-center">
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <MessageSquare className="w-12 h-12 text-primary" />
        </div>
      <h2 className="text-2xl font-bold tracking-tight">Welcome to ChattyNext</h2>
      <p className="text-muted-foreground">
        Select a conversation from the sidebar to start messaging.
      </p>
    </div>
  );
}
