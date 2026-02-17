import { MessageSquare } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <MessageSquare className="size-8 text-primary" />
      <h1 className="text-2xl font-bold text-primary">ChattyNext</h1>
    </div>
  );
}
