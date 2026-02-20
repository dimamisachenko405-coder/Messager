'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import {
  LogOut,
  MessageSquare,
  Search,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import type { UserProfile, Chat } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useDrafts } from '@/context/drafts-context'; // Import the context hook

interface ChatListProps {
  currentUser: User;
}

interface ChatWithUser extends Chat {
  otherUser: UserProfile;
}

export default function ChatList({ currentUser }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  const auth = useAuth();
  const { drafts } = useDrafts(); // Use the context hook
  const [chatListData, setChatListData] = useState<ChatWithUser[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  // Search logic
  const usersQuery = useMemo(() => {
    if (!firestore || searchTerm.trim() === '') return null;
    return query(
      collection(firestore, 'userProfiles'),
      where('username', '>=', searchTerm),
      where('username', '<=', searchTerm + '\uf8ff')
    );
  }, [firestore, searchTerm]);

  const { data: searchedUsers, isLoading: loadingSearch } = useCollection<UserProfile>(usersQuery);
  const searchedOtherUsers = useMemo(() => {
    if (!searchedUsers) return [];
    return searchedUsers.filter((user) => user.uid !== currentUser.uid);
  }, [searchedUsers, currentUser.uid]);

  // Chat list logic
  const chatsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'chats'),
      where('participantIds', 'array-contains', currentUser.uid)
    );
  }, [firestore, currentUser.uid]);

  const { data: chats } = useCollection<Chat>(chatsQuery);

  useEffect(() => {
    if (!chats || !firestore) return;

    const fetchChatUsers = async () => {
      setLoadingChats(true);
      const chatsWithUsers = await Promise.all(
        chats.map(async (chat) => {
          const otherUserId = chat.participantIds.find(id => id !== currentUser.uid);
          if (!otherUserId) return null;

          const userDoc = await getDoc(doc(firestore, 'userProfiles', otherUserId));
          if (!userDoc.exists()) return null;
          
          return {
            ...chat,
            otherUser: userDoc.data() as UserProfile
          };
        })
      );
      
      const filteredAndSorted = (chatsWithUsers.filter(Boolean) as ChatWithUser[])
        .sort((a, b) => {
          const timeA = a.lastMessage?.createdAt?.toDate().getTime() || 0;
          const timeB = b.lastMessage?.createdAt?.toDate().getTime() || 0;
          return timeB - timeA;
        });

      setChatListData(filteredAndSorted);
      setLoadingChats(false);
    };

    fetchChatUsers();
  }, [chats, firestore, currentUser.uid]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const getChatId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  };

  const renderChatList = () => {
    if (chatListData.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                No recent chats. Search for a user to start a conversation.
            </div>
        );
    }

    return (
        <ul className="p-2 space-y-1">
            {chatListData.map((chat) => {
              const draftMessage = drafts[chat.id];
              return (
                <li key={chat.id}>
                    <Link href={`/chat/${chat.id}`} className="block">
                    <Button
                        variant="ghost"
                        className={cn(
                        'w-full justify-start h-auto p-2 gap-3',
                        params.chatId === chat.id && 'bg-accent'
                        )}
                    >
                        <Avatar className="h-9 w-9">
                        <AvatarImage
                            src={
                            chat.otherUser.profilePictureUrl ||
                            `https://avatar.vercel.sh/${chat.otherUser.uid}.png`
                            }
                            alt={chat.otherUser.username || 'User'}
                        />
                        <AvatarFallback>
                            {chat.otherUser.username?.[0]}
                        </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left overflow-hidden">
                            <p className="truncate font-semibold">{chat.otherUser.username}</p>
                            {draftMessage ? (
                                <p className="truncate text-xs text-destructive">
                                    <span className='font-medium'>Draft:</span> {draftMessage}
                                </p>
                            ) : chat.lastMessage?.text && (
                                <p className="truncate text-xs text-muted-foreground">
                                    {chat.lastMessage.text}
                                </p>
                            )}
                        </div>
                    </Button>
                    </Link>
                </li>
              );
            })}
        </ul>
    );
  };

  const renderSearchResults = () => {
      if (searchedOtherUsers.length === 0) {
          return (
              <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found.
              </div>
          );
      }
      return (
          <ul className="p-2 space-y-1">
              {searchedOtherUsers.map((user) => {
              const chatId = getChatId(currentUser.uid, user.uid);
              return (
                  <li key={user.uid}>
                  <Link href={`/chat/${chatId}`} className="block">
                      <Button
                      variant="ghost"
                      className={cn(
                          'w-full justify-start h-auto p-2 gap-3',
                          params.chatId === chatId && 'bg-accent'
                      )}
                      >
                      <Avatar className="h-9 w-9">
                          <AvatarImage
                          src={
                              user.profilePictureUrl ||
                              `https://avatar.vercel.sh/${user.uid}.png`
                          }
                          alt={user.username || 'User'}
                          />
                          <AvatarFallback>
                          {user.username?.[0]}
                          </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="truncate font-semibold">{user.username}</p>
                      </div>
                      </Button>
                  </Link>
                  </li>
              );
              })}
          </ul>
      );
  }

  return (
    <div className="flex flex-col h-full w-full bg-card">
      <header className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-8 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">ChattyNext</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {(loadingSearch || loadingChats) ? (
          <div className="p-4 flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
            searchTerm.trim() === '' ? renderChatList() : renderSearchResults()
        )}
      </div>
      <footer className="p-2 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={
                currentUser.photoURL ||
                `https://avatar.vercel.sh/${currentUser.uid}.png`
              }
              alt={currentUser.displayName || 'User'}
            />
            <AvatarFallback>
              {currentUser.displayName?.[0] || <UserIcon />}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate flex-1">
            {currentUser.displayName || currentUser.email}
          </span>
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
