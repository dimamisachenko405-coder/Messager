'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Github, Loader2, Lock, Mail } from 'lucide-react';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { useAuth, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/logo';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

const GoogleIcon = () => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-4"
  >
    <title>Google</title>
    <path
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.02 2.25-4.55 0-8.23-3.73-8.23-8.29s3.68-8.29 8.23-8.29c2.49 0 4.09.98 5.27 2.05l2.6-2.58C18.07.73 15.49 0 12.48 0 5.88 0 .42 5.51.42 12.3s5.46 12.3 12.06 12.3c3.42 0 6.17-1.12 8.22-3.21 2.1-2.1 2.85-5.05 2.85-8.22 0-.75-.08-1.48-.21-2.18h-10.6z"
      fill="currentColor"
    />
  </svg>
);

const handleAuthError = (error: any): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/api-key-not-valid':
      return 'The API key is invalid. Please check your configuration.';
    case 'auth/requests-to-this-api-are-blocked':
      return 'Identity Toolkit API is not enabled. Please enable it in the Google Cloud console.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<null | 'google' | 'github'>(
    null,
  );
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/chat');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!auth || !firestore) {
      return;
    }

    const processRedirectResult = async () => {
      setSocialLoading('google'); // Generic loading state
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          await setDoc(
            doc(firestore, 'userProfiles', user.uid),
            {
              uid: user.uid,
              username: user.displayName || user.email!,
              email: user.email!,
              profilePictureUrl: user.photoURL,
              lastActive: serverTimestamp(),
            },
            { merge: true },
          );
          router.push('/chat');
        } else {
          setSocialLoading(null);
        }
      } catch (error: any) {
        toast({
          title: `Error with social login`,
          description: handleAuthError(error),
          variant: 'destructive',
        });
        setSocialLoading(null);
      }
    };

    processRedirectResult();
  }, [auth, firestore, router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (!auth) {
      toast({
        title: 'Error',
        description: 'Firebase not initialized.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password,
      );
      
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        await auth.signOut();
        toast({
          title: 'Verification Required',
          description: 'Please verify your email to log in. A new verification link has been sent.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success!',
          description: 'You have been logged in.',
        });
        router.push('/chat');
      }
    } catch (error) {
      toast({
        title: 'Error logging in',
        description: handleAuthError(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(providerName: 'google' | 'github') {
    setSocialLoading(providerName);
    const provider =
      providerName === 'google'
        ? new GoogleAuthProvider()
        : new GithubAuthProvider();

    if (!auth) {
      toast({
        title: 'Initialization Error',
        description: 'Firebase is not ready. Please try again in a moment.',
        variant: 'destructive',
      });
      setSocialLoading(null);
      return;
    }
    await signInWithRedirect(auth, provider);
  }

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle>Welcome Back!</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Email</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          placeholder="Email"
                          {...field}
                          className="pl-10"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Password</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password"
                          {...field}
                          className="pl-10"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading}
            >
              {socialLoading === 'google' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('github')}
              disabled={!!socialLoading}
            >
              {socialLoading === 'github' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Github className="mr-2 size-4" />
              )}
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
