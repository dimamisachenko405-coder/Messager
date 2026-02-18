'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Send,
  MoreVertical,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useUser, useFirestore } from '@/firebase';
import type { Message, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SmartReplies from './smart-replies';
import { useSidebar } from '../ui/sidebar';

interface ChatViewProps {
  chatId: string;
}

export default function ChatView({ chatId }: ChatViewProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();
  
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !chatId || !firestore) return;

    const userIds = chatId.split('_');
    const otherUserId = userIds.find((id) => id !== user.uid);

    if (!otherUserId) {
        router.push('/chat');
        return;
    }

    const unsubUser = onSnapshot(doc(firestore, 'userProfiles', otherUserId), (doc) => {
      if (doc.exists()) {
        setOtherUser(doc.data() as UserProfile);
      } else {
        toast({ title: 'Error', description: 'Could not find user.', variant: 'destructive' });
        router.push('/chat');
      }
    });

    const messagesQuery = query(
      collection(firestore, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Message),
      );
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubMessages();
    };
  }, [chatId, user, router, toast, firestore]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !firestore) return;

    const currentMessageText = messageText;
    setMessageText('');

    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const messagesCol = collection(chatRef, 'messages');

      // This is crucial for security rules and for the chat to be "joinable".
      const userIds = chatId.split('_');
      await setDoc(chatRef, {
        id: chatId,
        participantIds: userIds,
      }, { merge: true });

      // Add the new message to the messages subcollection.
      await addDoc(messagesCol, {
        senderId: user.uid,
        text: currentMessageText,
        createdAt: serverTimestamp() as Timestamp,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Could not send your message. Please try again.',
        variant: 'destructive',
      });
      // Restore the message text if sending failed
      setMessageText(currentMessageText);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessageText(suggestion);
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const lastMessageFromOtherUser = [...messages].reverse().find(m => m.senderId === otherUser?.uid);

  return (
    <div className="flex h-screen flex-col bg-card">
      <header className="flex items-center gap-3 border-b p-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        {otherUser && (
          <>
            <Avatar>
              <AvatarImage src={otherUser.profilePictureUrl || `https://avatar.vercel.sh/${otherUser.uid}.png`} />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{otherUser.username}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </>
        )}
        <Button variant="ghost" size="icon" className="ml-auto">
            <MoreVertical />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.senderId === user?.uid;
          return (
            <div
              key={message.id}
              className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}
            >
              {!isCurrentUser && otherUser && (
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={otherUser.profilePictureUrl || `https://avatar.vercel.sh/${otherUser.uid}.png`} />
                    <AvatarFallback>{otherUser.username[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                  'max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2',
                  isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none'
              )}>
                <p className="text-sm">{message.text}</p>
                 {message.createdAt && (
                    <p className={cn(
                        "text-xs mt-1",
                        isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                        {formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })}
                    </p>
                )}
              </div>
                {isCurrentUser && user && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || `https://avatar.vercel.sh/${user.uid}.png`} />
                        <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <SmartReplies 
          lastMessage={lastMessageFromOtherUser ?? null}
          onSuggestionClick={handleSuggestionClick}
          chatHistory={messages.map(m => `${m.senderId === user?.uid ? 'Me' : 'Them'}: ${m.text}`)}
        />
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-2">
            <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!messageText.trim()}>
                <Send className="h-5 w-5" />
            </Button>
        </form>
      </div>
    </div>
  );
}
