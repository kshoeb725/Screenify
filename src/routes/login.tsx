import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mail, Lock, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyLoginCredentials } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Verify credentials on the server first to get detailed error messages
      const check = await verifyLoginCredentials({
        data: {
          email: email.trim(),
          password,
        }
      });

      if (!check.success) {
        toast.error(check.error || "Invalid credentials.");
        setSubmitting(false);
        return;
      }

      // 2. Log in on the client to establish the session
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast.success("Welcome back to Screenify!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error("Login error details:", err);
      // Clean up Error prefix if present
      const cleanMessage = err.message
        ? err.message.replace(/^Error:\s*/i, "")
        : "Invalid credentials.";
      toast.error(cleanMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-[#3ECFB2]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-12 bg-background text-foreground font-sans relative overflow-hidden">
      
      {/* Left side: Pitch / Showcase (hidden on mobile) */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-12 bg-[#0C0C0E] border-r border-border/40 relative">
        {/* Dynamic gradient background */}
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#3ECFB2]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[140px] pointer-events-none" />
        
        {/* Top brand info */}
        <Link to="/" className="flex items-center gap-2.5 z-10 hover:opacity-85 transition mb-8">
          <img
            src="/screenmint-icon.png"
            alt="Screenify logo"
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            Screen<span className="text-[#3ECFB2]">ify</span>
          </span>
        </Link>

        {/* Center Pitch */}
        <div className="flex-1 flex flex-col justify-center py-12 space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-[#3ECFB2] text-xs font-mono tracking-wider uppercase w-fit">
            <Sparkles className="size-3.5" /> High-converting App Store graphics
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white text-balance">
            Generate Premium App Store Assets <span className="italic font-serif text-emerald-400">Instantly</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Upload your screenshots and let Screenify create professional Shopify App Store graphics with smart copy, beautiful layouts, and brand-matched designs—all in minutes.
          </p>

          {/* Clean Glassmorphic Mockup Preview Card */}
          <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-red-500/70" />
              <div className="size-3 rounded-full bg-yellow-500/70" />
              <div className="size-3 rounded-full bg-green-500/70" />
            </div>
            <div className="h-28 rounded-lg bg-[#151518]/80 flex flex-col items-center justify-center border border-white/5 text-center px-4">
              <div className="size-8 rounded bg-[#3ECFB2]/20 flex items-center justify-center text-[#3ECFB2] font-mono text-xs font-bold mb-2">S</div>
              <div className="h-2 w-32 bg-white/10 rounded-full mb-1" />
              <div className="h-1.5 w-24 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="text-xs text-muted-foreground/60 z-10 mt-8">
          &copy; {new Date().getFullYear()} Screenify. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="col-span-12 lg:col-span-6 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24">
        
        {/* Mobile Header (hidden on desktop) */}
        <div className="lg:hidden flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition">
            <img src="/screenmint-icon.png" alt="Screenify Logo" className="h-7 w-7 rounded-lg" />
            <span className="font-display text-lg font-bold">Screen<span className="text-[#3ECFB2]">ify</span></span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowLeft className="size-3" /> Back
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto space-y-8">
          
          <div className="space-y-2 text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your Screenify account to access your dashboard.</p>
          </div>


          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2] focus:ring-1 focus:ring-[#3ECFB2]"
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#3ECFB2] underline hover:opacity-90"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2] focus:ring-1 focus:ring-[#3ECFB2]"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-6 rounded-xl bg-[#3ECFB2] text-ink font-semibold text-sm hover:opacity-95 transition-all shadow-md shadow-[#3ECFB2]/10 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin text-ink" /> Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          {/* Signup link */}
          <div className="text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#3ECFB2] hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
