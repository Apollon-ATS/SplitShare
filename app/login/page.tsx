"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PhantomLogin } from "@/components/phantom-login"
import { createClientComponentClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = useCallback(async () => {
    const supabase = createClientComponentClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
      },
    });
    if (error) {
      alert("Google sign-in error");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClientComponentClient();

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        router.push("/dashboard");
        setLoading(false);
        return;
      }
      setError(signInError.message);
      setLoading(false);
      return;
    }
    // Register mode
    if (!name) {
      setError("Please enter your name");
      setLoading(false);
      return;
    }
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (!signUpError) {
      router.push("/dashboard");
    } else {
      setError(signUpError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-12 bg-white overflow-hidden">
      <div className="absolute inset-0 geometric-bg"></div>
      <div className="w-full max-w-md z-10">
        <Tabs defaultValue="email" className="w-full">
          <TabsContent value="email">
            <Card className="rounded-2xl shadow-xl border border-gray-100 bg-white/95">
              <CardHeader className="flex flex-col items-center gap-2 pb-2">
                <Image src="/images/ats-logo.png" alt="ATS Logo" width={48} height={48} className="object-contain mb-2" priority />
                <CardTitle className="text-2xl font-bold ats-accent">Sign in to ATS</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  {mode === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" type="text" required value={name} onChange={e => setName(e.target.value)} />
                    </div>
                  )}
                  {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                  <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={loading}>
                    {loading ? "Loading..." : mode === "register" ? "Create account" : "Sign in"}
                  </Button>
                  <div className="flex items-center my-2">
                    <div className="flex-grow border-t border-gray-200" />
                    <span className="mx-2 text-gray-400 text-xs">or</span>
                    <div className="flex-grow border-t border-gray-200" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm text-gray-700 font-semibold text-base py-2"
                    onClick={handleGoogleLogin}
                  >
                    <Image src="/images/google-logo.png" alt="Google" width={18} height={18} style={{ width: 'auto', height: 'auto' }} />
                    Sign in with Google
                  </Button>
                  <div className="w-full flex justify-between mt-2 text-xs">
                    {mode === "login" ? (
                      <>
                        <span>
                          New here?{' '}
                          <button type="button" className="text-primary hover:underline" onClick={() => { setMode("register"); setError(""); }}>
                            Create an account
                          </button>
                        </span>
                        <Link href="#" className="text-primary hover:underline">Forgot password?</Link>
                      </>
                    ) : (
                      <span>
                        Already have an account?{' '}
                        <button type="button" className="text-primary hover:underline" onClick={() => { setMode("login"); setError(""); }}>
                          Sign in
                        </button>
                      </span>
                    )}
                  </div>
                </form>
                <div className="mt-6 text-xs text-center text-gray-400">
                  By continuing, you agree to our <Link href="#" className="underline">Terms</Link> and <Link href="#" className="underline">Privacy Policy</Link>.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
