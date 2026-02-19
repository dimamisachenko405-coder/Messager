'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { LogOut, MessageSquare, Search } from 'lucide-react';
import { signOut } from 'firebase/auth';

import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
} from '../ui/sidebar';
import { useAuth, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { User } from 'firebase/auth';

interface ChatListProps {
  currentUser: User;
}

export default function ChatList({ currentUser }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const params = useParams();
  const firestore = useFirestore();
  const auth = useAuth();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    if (searchTerm.trim() === '') {
      return query(collection(firestore, 'userProfiles'));
    } else {
      return query(
        collection(firestore, 'userProfiles'),
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff')
      );
    }
  }, [firestore, searchTerm]);

  const { data: allUsers, isLoading: loading, error } = useCollection<UserProfile>(usersQuery);

  const users = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((user) => user.uid !== currentUser.uid);
  }, [allUsers, currentUser.uid]);

  useEffect(() => {
    if (error) {
      console.error('Error fetching users:', error);
      // You could add a toast notification here if you want to show the error to the user
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
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="size-8 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">ChattyNext</h2>
        </div>
        <SidebarInput
          placeholder="Search contacts..."
          icon={<Search className="size-4" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <div className="p-2 space-y-2">
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </div>
        ) : (
          <SidebarMenu>
            {users.map((user) => {
              const chatId = getChatId(currentUser.uid, user.uid);
              return (
                <SidebarMenuItem key={user.uid}>
                  <Link
                    href={`/chat/${chatId}`}
                    className="w-full"
                    onClick={() => setOpenMobile(false)}
                  >
                    <SidebarMenuButton
                      size="lg"
                      isActive={params.chatId === chatId}
                    >
                      <Avatar className="h-8 w-8">
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
                      <span>{user.username}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 p-2">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={
                currentUser.photoURL ||
                `https://avatar.vercel.sh/${currentUser.uid}.png`
              }
              alt={currentUser.displayName || 'User'}
            />
            <AvatarFallback>
              {currentUser.displayName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            {currentUser.displayName || currentUser.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
