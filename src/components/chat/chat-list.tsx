'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import {
  LogOut,
  MessageSquare,
  Search,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import type { UserProfile } from '@/lib/types';
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
    data: allUsers,
    isLoading: loading,
    error,
  } = useCollection<UserProfile>(usersQuery);

  const users = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((user) => user.uid !== currentUser.uid);
  }, [allUsers, currentUser.uid]);

  useEffect(() => {
    if (error) {
      console.error('Error fetching users:', error);
    }
  }, [error]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const getChatId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  };

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
            {users && users.length > 0 ? (
              <ul className="p-2 space-y-1">
                {users.map((user) => {
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
                  ? 'Enter a username to search for contacts.'
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
