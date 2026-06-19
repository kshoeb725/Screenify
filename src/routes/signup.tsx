import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mail, Lock, User, Sparkles, ArrowLeft, Check, X, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSignUpUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password rules validation states
  const isMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  // Handle URL errors (like canceled OAuth flows)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get("error_description");
      const errorMsg = params.get("error");
      if (errorDescription || errorMsg) {
        toast.error(errorDescription?.replace(/\+/g, " ") || errorMsg || "Google login failed.");
        
        // Clean URL params without page refresh
        const cleanUrl = window.location.pathname + (window.location.hash || "");
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Google signup.");
      setGoogleLoading(false);
    }
  };

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
      // Create user via server function to auto-confirm email
      const signUpRes = await adminSignUpUser({
        data: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        }
      });

      if (!signUpRes.success) {
        toast.error(signUpRes.error || "Failed to create account.");
        setSubmitting(false);
        return;
      }

      // Sign in immediately to establish session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      toast.success("Account created successfully! Welcome to Screenify.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error("Signup error details:", err);
      const cleanMessage = err.message
        ? err.message.replace(/^Error:\s*/i, "")
        : "Failed to create account.";
      toast.error(cleanMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6-4.53z" fill="#EA4335"/>
    </svg>
  );

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

        <div className="flex-1 flex flex-col justify-center py-12 space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-[#3ECFB2] text-xs font-mono tracking-wider uppercase w-fit">
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

        <div className="text-xs text-muted-foreground/60 z-10 mt-8">
          &copy; 2026 Screenify. All rights reserved
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

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-3.5 rounded-xl border border-border/80 bg-card/45 hover:bg-card/90 text-foreground font-semibold text-xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border/40"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-[10px] uppercase font-mono tracking-widest">or</span>
              <div className="flex-grow border-t border-border/40"></div>
            </div>
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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 py-4 rounded-xl border-border bg-[#101012]/50 text-xs focus:border-[#3ECFB2]"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-9 py-4 rounded-xl border-border bg-[#101012]/50 text-xs focus:border-[#3ECFB2]"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
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
