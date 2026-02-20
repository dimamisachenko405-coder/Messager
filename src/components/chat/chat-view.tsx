'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
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
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Send,
  MoreVertical,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

import { useUser, useFirestore } from '@/firebase';
import type { Message, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDrafts } from '@/context/drafts-context';

interface ChatViewProps {
  chatId: string;
}

function formatLastActive(timestamp: Timestamp): string {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate();
  const now = new Date();

  if (now.getTime() - date.getTime() < 5 * 60 * 1000) {
    return 'Online';
  }
  
  if (isToday(date)) {
    return `last seen today at ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `last seen yesterday at ${format(date, 'HH:mm')}`;
  }

  return `last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export default function ChatView({ chatId }: ChatViewProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { drafts, setDrafts } = useDrafts();
  
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageText = drafts[chatId] || '';

  const handleBack = () => {
    router.push('/chat');
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDrafts(prev => ({ ...prev, [chatId]: e.target.value }));
  }

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
    if (!firestore || !user || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(
        (msg) => msg.senderId !== user.uid && !msg.isRead
      );

      if (unreadMessages.length === 0) return;

      await Promise.all(
        unreadMessages.map((msg) => {
          const msgRef = doc(firestore, 'chats', chatId, 'messages', msg.id);
          return updateDoc(msgRef, { isRead: true });
        })
      );
    };

    markMessagesAsRead().catch(console.error);
}, [messages, firestore, user, chatId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !firestore) return;

    const currentMessageText = messageText;
    setDrafts(prev => ({ ...prev, [chatId]: ''}));
    const createdTimestamp = serverTimestamp() as Timestamp;

    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const messagesCol = collection(chatRef, 'messages');
      const userIds = chatId.split('_');

      await setDoc(chatRef, { id: chatId, participantIds: userIds }, { merge: true });

      const newDoc = await addDoc(messagesCol, {
        senderId: user.uid,
        text: currentMessageText,
        createdAt: createdTimestamp,
        chatId: chatId,
        isRead: false,
      });

      await updateDoc(chatRef, {
        lastMessage: {
          id: newDoc.id,
          text: currentMessageText,
          createdAt: createdTimestamp,
          senderId: user.uid,
        },
      });

      const userProfileRef = doc(firestore, 'userProfiles', user.uid);
      await updateDoc(userProfileRef, { lastActive: serverTimestamp() });
    } catch (error) {
      console.error('Error sending message:', error);
      setDrafts(prev => ({ ...prev, [chatId]: currentMessageText }));
      toast({ title: 'Error sending message', description: 'Could not send your message.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="flex h-screen flex-col bg-card">
      <header className="flex items-center gap-3 border-b p-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={handleBack}>
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
              <p className="text-xs text-muted-foreground">
                {formatLastActive(otherUser.lastActive)}
              </p>
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
          
          let showDateSeparator = false;
          // We can only show a separator if the current message has a valid timestamp.
          if (message.createdAt) {
            const currentDate = message.createdAt.toDate();
            const prevMessage = messages[index - 1];

            // Show separator if it's the first message, or if the previous message
            // doesn't have a timestamp, or if the dates are different.
            if (!prevMessage || !prevMessage.createdAt || !isSameDay(prevMessage.createdAt.toDate(), currentDate)) {
              showDateSeparator = true;
            }
          }

          return (
            <Fragment key={message.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <div className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                    {/* This is safe because showDateSeparator is only true if message.createdAt exists */}
                    {format(message.createdAt.toDate(), 'd MMMM', { locale: ru })}
                  </div>
                </div>
              )}
              <div
                className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}
              >
                {!isCurrentUser && otherUser && (
                   <Avatar className="h-8 w-8">
                      <AvatarImage src={otherUser.profilePictureUrl || `https://avatar.vercel.sh/${otherUser.uid}.png`} />
                      <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    'max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2',
                    isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none'
                )}>
                  <p className="text-sm break-words">{message.text}</p>
                  <div className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    isCurrentUser ? "text-primary-foreground/70 justify-end" : "text-muted-foreground justify-end"
                  )}>
                    {/* Also guard the time display for optimistic updates */}
                    {message.createdAt && (
                        <span>
                            {format(message.createdAt.toDate(), 'HH:mm')}
                        </span>
                    )}
                    {isCurrentUser &&
                      (message.isRead ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      ))}
                  </div>
                </div>
                  {isCurrentUser && user && (
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || `https://avatar.vercel.sh/${user.uid}.png`} />
                          <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                  )}
              </div>
            </Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Input
                value={messageText}
                onChange={handleMessageChange}
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
