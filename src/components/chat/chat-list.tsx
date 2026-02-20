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

interface ChatListProps {
  currentUser: User;
}

export default function ChatList({ currentUser }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  const auth = useAuth();

  const [otherUsers, setOtherUsers] = useState<UserProfile[]>([]);

  const usersQuery = useMemo(() => {
    if (!firestore) return null;

    if (searchTerm.trim() === '') {
      return null;
    } else {
      return query(
        collection(firestore, 'userProfiles'),
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff')
      );
    }
  }, [firestore, searchTerm]);

  const {
    data: searchedUsers,
    isLoading: loading,
    error,
  } = useCollection<UserProfile>(usersQuery);

  const users = useMemo(() => {
    if (!searchedUsers) return [];
    return searchedUsers.filter((user) => user.uid !== currentUser.uid);
  }, [searchedUsers, currentUser.uid]);

  const chatsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'chats'),
      where('participantIds', 'array-contains', currentUser.uid)
    );
  }, [firestore, currentUser.uid]);

  const { data: chats } = useCollection<Chat>(chatsQuery);

  useEffect(() => {
    if (error) {
      console.error('Error fetching users:', error);
    }
  }, [error]);

  useEffect(() => {
    if (!chats || !firestore) return;

    const fetchOtherUsers = async () => {
      const otherUserIds = chats
        .map((chat) => chat.participantIds.find((id: string) => id !== currentUser.uid))
        .filter((id) => id !== undefined) as string[];

      const uniqueUserIds = [...new Set(otherUserIds)];

      const usersData = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const userDoc = await getDoc(doc(firestore, 'userProfiles', userId));
          return userDoc.data() as UserProfile;
        })
      );
      setOtherUsers(usersData.filter(Boolean));
    };

    fetchOtherUsers();
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

  const displayedUsers = searchTerm.trim() === '' ? otherUsers : users;

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
        {loading ? (
          <div className="p-4 flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {displayedUsers && displayedUsers.length > 0 ? (
              <ul className="p-2 space-y-1">
                {displayedUsers.map((user) => {
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
                          <span className="truncate">{user.username}</span>
                        </Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm.trim() === ''
                  ? 'No recent chats. Search for a user to start a conversation.'
                  : 'No users found.'}
              </div>
            )}
          </>
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
