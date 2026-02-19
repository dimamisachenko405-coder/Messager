'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  LogOut,
  MessageSquare,
  Search,
} from 'lucide-react';
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
import { useAuth, useFirestore } from '@/firebase';
import { User } from 'firebase/auth';

interface ChatListProps {
  currentUser: User;
}

export default function ChatList({ currentUser }: ChatListProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const params = useParams();
  const firestore = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    let q;
    // If search term is empty, fetch all users.
    // Otherwise, query users whose username starts with the search term.
    if (searchTerm.trim() === '') {
      q = query(collection(firestore, 'userProfiles'));
    } else {
      q = query(
        collection(firestore, 'userProfiles'),
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff')
      );
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        // Exclude current user from the list
        if (doc.data().uid !== currentUser.uid) {
          usersData.push(doc.data() as UserProfile);
        }
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.uid, firestore, searchTerm]); // Rerun effect when searchTerm changes

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
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
            {users.map((user) => { // Use 'users' which is now the filtered list from Firestore
              const chatId = getChatId(currentUser.uid, user.uid);
              return (
                <SidebarMenuItem key={user.uid}>
                  <Link href={`/chat/${chatId}`} className="w-full" onClick={() => setOpenMobile(false)}>
                    <SidebarMenuButton size="lg" isActive={params.chatId === chatId}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profilePictureUrl || `https://avatar.vercel.sh/${user.uid}.png`} alt={user.username || 'User'} />
                        <AvatarFallback>{user.username?.[0]}</AvatarFallback>
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
         <div className='flex items-center gap-3 p-2'>
            <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.uid}.png`} alt={currentUser.displayName || 'User'} />
                <AvatarFallback>{currentUser.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{currentUser.displayName || currentUser.email}</span>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
            </Button>
         </div>
      </SidebarFooter>
    </Sidebar>
  );
}
