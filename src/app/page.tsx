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
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { useAuth, useFirestore } from '@/firebase';
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
import { login } from '@/lib/actions';
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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<null | 'google' | 'github'>(
    null,
  );
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!auth || !firestore) {
      return;
    }

    const processRedirectResult = async () => {
      // Set a loading indicator as we might be processing a redirect.
      setSocialLoading('google'); // Can be any generic value
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in.
          const user = result.user;

          // Create or update user profile in Firestore
          await setDoc(
            doc(firestore, 'userProfiles', user.uid),
            {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            },
            { merge: true },
          );

          router.push('/chat');
        } else {
          // No redirect result, so we're not in a redirect flow.
          setSocialLoading(null);
        }
      } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        switch (error.code) {
          case 'auth/account-exists-with-different-credential':
            description =
              'An account with this email already exists using a different sign-in method.';
            break;
          default:
            description = error.message;
        }
        toast({
          title: `Error with social login`,
          description,
          variant: 'destructive',
        });
        setSocialLoading(null);
      }
    };

    processRedirectResult();
  }, [auth, firestore, router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const error = await login(values);

    if (error) {
      toast({
        title: 'Error logging in',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success!',
        description: 'You have been logged in.',
      });
      router.push('/chat');
    }
    setLoading(false);
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
    // This will navigate the user away; the useEffect will handle the result on return.
    await signInWithRedirect(auth, provider);
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
