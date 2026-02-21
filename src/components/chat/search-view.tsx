'use client';

import { useMemo, useState, Fragment } from 'react'; // Import Fragment
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import { ArrowLeft, Search, X } from 'lucide-react';

import type { UserProfile, Chat, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore } from '@/firebase';
import { User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useMessages } from '@/context/messages-context';

// 1. Create the new HighlighedText component
interface HighlightedTextProps {
  text: string;
  highlight: string;
}

function HighlightedText({ text, highlight }: HighlightedTextProps) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          // Use a more prominent color for the highlight
          <span key={i} className="text-primary font-semibold">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </span>
  );
}

interface SearchViewProps {
  currentUser: User;
  onClose: () => void;
  recentChats: (Chat & { otherUser: UserProfile })[];
}

interface MessageResult {
  chatId: string;
  message: Message;
  otherUser: UserProfile;
}

export default function SearchView({ currentUser, onClose, recentChats }: SearchViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { messagesCache } = useMessages();

  const usersQuery = useMemo(() => {
    if (!firestore || searchTerm.trim().length < 2) return null;
    const debouncedSearch = searchTerm.trim();
    return query(
      collection(firestore, 'userProfiles'),
      where('username', '>=', debouncedSearch),
      where('username', '<=', debouncedSearch + '\uf8ff')
    );
  }, [firestore, searchTerm]);

  const { data: searchedUsers, isLoading: loadingUsers } = useCollection<UserProfile>(usersQuery);
  const filteredSearchedUsers = useMemo(() => {
    if (!searchedUsers) return [];
    return searchedUsers.filter((user) => user.uid !== currentUser.uid);
  }, [searchedUsers, currentUser.uid]);

  const messageResults = useMemo<MessageResult[]>(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 2) return [];

    const results: MessageResult[] = [];
    const userProfilesMap = new Map<string, UserProfile>();
    recentChats.forEach(chat => {
      userProfilesMap.set(chat.otherUser.uid, chat.otherUser);
    });

    for (const chatId in messagesCache) {
      const otherUserId = chatId.split('_').find(id => id !== currentUser.uid);
      const otherUser = otherUserId ? userProfilesMap.get(otherUserId) : undefined;
      if (!otherUser) continue;

      const chatMessages = messagesCache[chatId];
      for (const message of chatMessages) {
        if (message.text && message.text.toLowerCase().includes(term)) {
          results.push({ chatId, message, otherUser });
        }
      }
    }
    
    results.sort((a, b) => b.message.createdAt.toMillis() - a.message.createdAt.toMillis());

    return results;
  }, [searchTerm, messagesCache, currentUser.uid, recentChats]);
  
  const getChatId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  };

  const termExists = searchTerm.trim().length > 0;

  return (
    <div className="flex flex-col h-full w-full bg-card absolute top-0 left-0 z-10">
      <header className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft />
          </Button>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search messages or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {termExists && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                onClick={() => setSearchTerm('')}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!termExists && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-primary mb-2">Recent Chats</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {recentChats.slice(0, 8).map(chat => (
                <Link href={`/chat/${chat.id}`} key={chat.id} onClick={onClose} className="block">
                    <div className="flex flex-col items-center gap-2 w-16">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={chat.otherUser.profilePictureUrl || `https://avatar.vercel.sh/${chat.otherUser.uid}.png`} />
                            <AvatarFallback>{chat.otherUser.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-center truncate w-full">{chat.otherUser.username}</p>
                    </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {termExists && (
          <div className="pt-2">
            {messageResults.length > 0 && (
              <div className="mb-4">
                <h3 className="px-4 mb-1 text-sm font-semibold text-primary">Messages</h3>
                <ul>
                  {messageResults.map(({ chatId, message, otherUser }) => (
                    <li key={message.id}>
                        <Link href={`/chat/${chatId}#${message.id}`} onClick={onClose} className="block">
                            <div className="px-4 py-2 hover:bg-accent flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={otherUser.profilePictureUrl || `https://avatar.vercel.sh/${otherUser.uid}.png`} />
                                    <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between">
                                        <p className="font-semibold truncate">{otherUser.username}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {/* 2. Use the new component for the message text */}
                                    <p className="text-sm text-muted-foreground truncate">
                                      <HighlightedText text={message.text || ''} highlight={searchTerm} />
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {filteredSearchedUsers.length > 0 && (
              <div>
                <h3 className="px-4 mb-1 text-sm font-semibold text-primary">Contacts</h3>
                <ul>
                  {filteredSearchedUsers.map(user => (
                     <li key={user.uid}>
                        <Link href={`/chat/${getChatId(currentUser.uid, user.uid)}`} onClick={onClose} className="block">
                            <div className="px-4 py-2 hover:bg-accent flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.profilePictureUrl || `https://avatar.vercel.sh/${user.uid}.png`} />
                                    <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <p className="font-semibold truncate flex-1">{user.username}</p>
                           </div>
                        </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {!loadingUsers && messageResults.length === 0 && filteredSearchedUsers.length === 0 && (
                 <p className="p-4 text-center text-sm text-muted-foreground">No results found for '{searchTerm}'.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
