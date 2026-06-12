import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mail, Lock, User, Sparkles, ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signInWithApple } = useAuth();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Password rules validation states
  const isMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!isMinLength || !hasNumber || !hasSpecialChar) {
      toast.error("Please meet all password strength requirements.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      // Supabase returns a session if email confirmation is disabled, otherwise session is null
      if (data?.session) {
        toast.success("Account created successfully! Welcome to Screenify.");
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Registration successful! Please check your email to verify your account.");
        navigate({ to: "/login" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account.");
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
      
      {/* Left side: Pitch (hidden on mobile) */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-12 bg-[#0C0C0E] border-r border-border/40 relative">
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#3ECFB2]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[140px] pointer-events-none" />
        
        <Link to="/" className="flex items-center gap-2.5 z-10 hover:opacity-85 transition">
          <img
            src="/screenmint-icon.png"
            alt="Screenify logo"
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            Screen<span className="text-[#3ECFB2]">ify</span>
          </span>
        </Link>

        <div className="my-auto space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-[#3ECFB2] text-xs font-mono tracking-wider uppercase">
            <Sparkles className="size-3.5" /> Start for free
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white text-balance">
            Design assets in <span className="italic font-serif text-emerald-400">minutes</span> instead of hours
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create an account to save your styling presets, customize layout sequences, and download unwatermarked high-resolution creatives for your store.
          </p>

          <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Sequence Preview</span>
              <span className="text-[#3ECFB2]">6 slides ready</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[16/9] rounded border border-white/5 bg-[#151518] flex items-center justify-center text-[9px] font-mono text-white/20">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground z-10">
          &copy; {new Date().getFullYear()} Screenify. All rights reserved.
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="col-span-12 lg:col-span-6 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24">
        
        {/* Mobile Header (hidden on desktop) */}
        <div className="lg:hidden flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition">
            <img src="/screenmint-icon.png" alt="Screenify Logo" className="h-7 w-7 rounded-lg" />
            <span className="font-display text-lg font-bold">Screen<span className="text-[#3ECFB2]">ify</span></span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowLeft className="size-3" /> Back
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto space-y-6">
          
          <div className="space-y-1 text-left">
            <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
            <p className="text-sm text-muted-foreground">Sign up to get started designing screenshots.</p>
          </div>


          {/* Email/Password Form */}
          <form onSubmit={handleSignUp} className="space-y-4 text-left">
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9 py-4 rounded-xl border-border bg-[#101012]/50 text-xs focus:border-[#3ECFB2]"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 py-4 rounded-xl border-border bg-[#101012]/50 text-xs focus:border-[#3ECFB2]"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 py-4 rounded-xl border-border bg-[#101012]/50 text-xs focus:border-[#3ECFB2]"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 py-4 rounded-xl border-border bg-[#101012]/50 text-xs focus:border-[#3ECFB2]"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>
            </div>

            {/* Password Validation Requirements */}
            {password && (
              <div className="rounded-xl border border-border bg-[#101012]/30 p-3.5 space-y-2 text-xs font-sans">
                <p className="font-semibold text-white/80">Password Requirements:</p>
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {isMinLength ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                    <span className={isMinLength ? "text-white" : "text-muted-foreground"}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasNumber ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                    <span className={hasNumber ? "text-white" : "text-muted-foreground"}>Contains a number</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasSpecialChar ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                    <span className={hasSpecialChar ? "text-white" : "text-muted-foreground"}>Contains a special symbol</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordsMatch ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                    <span className={passwordsMatch ? "text-white" : "text-muted-foreground"}>Passwords match</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-5 rounded-xl bg-[#3ECFB2] text-ink font-semibold text-xs hover:opacity-95 transition-all shadow-md shadow-[#3ECFB2]/10 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-ink" /> Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-[#3ECFB2] hover:underline font-semibold">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
