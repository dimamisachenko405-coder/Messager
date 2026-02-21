'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  LogOut,
  MessageSquare,
  Search,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';

import type { UserProfile, Chat } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useDrafts } from '@/context/drafts-context';
import SearchView from './search-view';
import { Badge } from '@/components/ui/badge'; // 1. Import the Badge component

interface ChatListProps {
  currentUser: User;
}

export interface ChatWithUser extends Chat {
  otherUser: UserProfile;
}

export default function ChatList({ currentUser }: ChatListProps) {
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  const auth = useAuth();
  const { drafts } = useDrafts();

  const [isLoading, setIsLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const chatsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'chats'),
      where('participantIds', 'array-contains', currentUser.uid)
    );
  }, [firestore, currentUser.uid]);

  // The useCollection hook will now expect the unreadCount field in the Chat type
  const { data: chats } = useCollection<Chat>(chatsQuery);

  useEffect(() => {
    if (!chats || !firestore) return;

    const userIdsToFetch = chats
      .map(chat => chat.participantIds.find(id => id !== currentUser.uid))
      .filter((id): id is string => !!id && !userProfiles[id]);

    if (userIdsToFetch.length === 0) {
      if (isLoading) setIsLoading(false);
      return;
    }

    const fetchMissingUsers = async () => {
      const uniqueIds = [...new Set(userIdsToFetch)];
      if (uniqueIds.length === 0) {
        setIsLoading(false);
        return;
      }
      const usersQuery = query(collection(firestore, 'userProfiles'), where('__name__', 'in', uniqueIds));
      const userDocs = await getDocs(usersQuery);
      
      const newProfiles: Record<string, UserProfile> = {};
      userDocs.forEach(doc => {
        newProfiles[doc.id] = doc.data() as UserProfile;
      });

      if (Object.keys(newProfiles).length > 0) {
        setUserProfiles(prev => ({ ...prev, ...newProfiles }));
      }
      if (isLoading) setIsLoading(false);
    };

    fetchMissingUsers();

  }, [chats, firestore, currentUser.uid, userProfiles, isLoading]);

  const chatListData = useMemo(() => {
    if (!chats) return [];

    return (chats
      .map(chat => {
        const otherUserId = chat.participantIds.find(id => id !== currentUser.uid);
        const otherUser = otherUserId ? userProfiles[otherUserId] : null;
        if (!otherUser) return null;

        return { ...chat, otherUser };
      })
      .filter(Boolean) as ChatWithUser[])
      .sort((a, b) => {
        const timeA = a.lastMessage?.createdAt?.toDate().getTime() || 0;
        const timeB = b.lastMessage?.createdAt?.toDate().getTime() || 0;
        return timeB - timeA;
      });
  }, [chats, userProfiles, currentUser.uid]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-card relative">
      {isSearchVisible && (
        <SearchView 
          currentUser={currentUser} 
          onClose={() => setIsSearchVisible(false)} 
          recentChats={chatListData} 
        />
      )}

      <header className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-8 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">ChattyNext</h2>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setIsSearchVisible(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : chatListData.length > 0 ? (
            <ul className="p-2 space-y-1">
                {chatListData.map((chat) => {
                  const draftMessage = drafts[chat.id];
                  // 2. Get the unread count for the current user
                  const unreadCount = chat.unreadCount ? chat.unreadCount[currentUser.uid] : 0;

                  return (
                    <li key={chat.id}>
                      <Link href={`/chat/${chat.id}`} className="block">
                        <div
                          className={cn(
                            'flex items-center p-2 gap-3 rounded-md transition-colors',
                            params.chatId === chat.id ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                                src={chat.otherUser.profilePictureUrl || `https://avatar.vercel.sh/${chat.otherUser.uid}.png`}
                                alt={chat.otherUser.username || 'User'}
                            />
                            <AvatarFallback>{chat.otherUser.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left overflow-hidden">
                            <div className="flex justify-between items-center">
                              <p className="truncate font-semibold">{chat.otherUser.username}</p>
                              {/* 3. Display the time of the last message */}
                              {chat.lastMessage?.createdAt && (
                                <p className="text-xs text-muted-foreground">
                                  {format(chat.lastMessage.createdAt.toDate(), 'HH:mm')}
                                </p>
                              )}
                            </div>
                            <div className="flex justify-between items-start">
                              {
                                draftMessage ? (
                                  <p className="truncate text-xs text-destructive pr-2">
                                    <span className='font-medium'>Draft:</span> {draftMessage}
                                  </p>
                                ) : chat.lastMessage?.text ? (
                                  <p className="truncate text-xs text-muted-foreground pr-2">
                                    {chat.lastMessage.text}
                                  </p>
                                ) : (
                                  <p className="truncate text-xs text-muted-foreground pr-2 italic">No messages yet</p>
                                )
                              }
                              {/* 4. Display the unread count badge */}
                              {unreadCount > 0 && (
                                <Badge className="h-5 w-5 flex items-center justify-center p-0 rounded-full bg-primary text-primary-foreground">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
            </ul>
        ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
                No recent chats. Search for a user to start a conversation.
            </div>
        )}
      </div>
      <footer className="p-2 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.uid}.png`}
              alt={currentUser.displayName || 'User'}
            />
            <AvatarFallback>{currentUser.displayName?.[0] || <UserIcon />}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate flex-1">{currentUser.displayName || currentUser.email}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
