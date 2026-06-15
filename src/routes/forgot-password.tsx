import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, Sparkles, CheckCircle2, Lock, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { adminResetPassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email" | "direct">("email");

  // Direct reset password states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password rules validation states
  const isMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const getAppUrl = () => {
    let url = "";
    if (typeof window !== "undefined") {
      url = window.location.origin;
    } else {
      url = import.meta.env.VITE_APP_URL || import.meta.env.VITE_SITE_URL || "http://localhost:8080";
    }
    return url.replace(/\/$/, "");
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${getAppUrl()}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Password reset email sent successfully!");
    } catch (err: any) {
      console.error("Password reset request error:", err);
      
      const errorMessage = err.message || "";
      const isRateLimit = err.status === 429 || 
                          errorMessage.toLowerCase().includes("rate limit") || 
                          errorMessage.toLowerCase().includes("60 seconds") ||
                          errorMessage.toLowerCase().includes("too many requests") ||
                          errorMessage.toLowerCase().includes("rate limit exceeded");
      
      if (isRateLimit) {
        toast.error(errorMessage || "Too many requests. Please wait before trying again.");
      } else {
        toast.error(errorMessage || "Failed to request password reset.");
      }
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!password || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (!isMinLength || !hasNumber || !hasSpecialChar) {
      toast.error("Password does not meet the complexity requirements.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminResetPassword({
        data: {
          email: trimmedEmail,
          password: password,
        },
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to reset password directly.");
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err: any) {
      console.error("Direct reset error:", err);
      toast.error(err.message || "Failed to reset password directly.");
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-6 relative overflow-hidden font-sans grain">
      
      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#3ECFB2]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-[#C8E84A]/5 to-transparent blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl relative z-10 space-y-6">
        
        {/* Brand logo header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition">
            <img src="/screenmint-icon.png" alt="Screenify Logo" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-xl font-bold text-foreground">
              Screen<span className="text-[#3ECFB2]">ify</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-[#3ECFB2] text-[10px] font-mono tracking-wider uppercase">
            <Sparkles className="size-3" /> Account Recovery
          </div>
        </div>

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="size-16 text-[#3ECFB2] animate-bounce" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {resetMethod === "direct" ? "Password Reset" : "Email Sent"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed text-balance">
                {resetMethod === "direct"
                  ? "Your password has been successfully updated. You can now log in."
                  : "If an account exists with this email address, a password reset link has been sent."}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-xs text-[#3ECFB2] hover:underline pt-4 font-semibold"
            >
              <ArrowLeft className="size-3.5" /> Go to Log In
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-foreground">Reset password</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Recover access to your account by requesting a link or resetting directly.
              </p>
            </div>

            {/* Custom Premium Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#101012]/80 border border-border/40">
              <button
                type="button"
                onClick={() => setResetMethod("email")}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  resetMethod === "email"
                    ? "bg-[#3ECFB2] text-ink font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                Email Reset Link
              </button>
              <button
                type="button"
                onClick={() => setResetMethod("direct")}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  resetMethod === "direct"
                    ? "bg-[#3ECFB2] text-ink font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                Direct Reset (Bypass)
              </button>
            </div>

            {/* Supabase SMTP warning info banner */}
            {resetMethod === "email" && (
              <div className="flex gap-2.5 p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-400 text-xs leading-relaxed text-left">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Having trouble receiving emails?</p>
                  <p className="text-muted-foreground text-[11px]">
                    Supabase's default email sender is rate-limited to 3 emails/hour and may land in spam. If it doesn't arrive, use the <strong>Direct Reset</strong> tab to change your password instantly.
                  </p>
                </div>
              </div>
            )}

            {resetMethod === "email" ? (
              <form onSubmit={handleResetRequest} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2]"
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 rounded-xl bg-[#3ECFB2] text-ink font-semibold text-sm hover:opacity-95 transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-ink" /> Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleDirectReset} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2]"
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2]"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2]"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Password complexity details */}
                {password && (
                  <div className="rounded-xl border border-border bg-[#101012]/30 p-3.5 space-y-2 text-xs font-sans">
                    <p className="font-semibold text-foreground/80">New Password Requirements:</p>
                    <div className="space-y-1.5 font-mono text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {isMinLength ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                        <span className={isMinLength ? "text-foreground" : "text-muted-foreground"}>At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasNumber ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                        <span className={hasNumber ? "text-foreground" : "text-muted-foreground"}>Contains a number</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasSpecialChar ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                        <span className={hasSpecialChar ? "text-foreground" : "text-muted-foreground"}>Contains a special symbol</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {passwordsMatch ? <Check className="size-3.5 text-[#3ECFB2]" /> : <X className="size-3.5 text-red-500" />}
                        <span className={passwordsMatch ? "text-foreground" : "text-muted-foreground"}>Passwords match</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 rounded-xl bg-[#3ECFB2] text-ink font-semibold text-sm hover:opacity-95 transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-ink" /> Saving Password...
                    </>
                  ) : (
                    "Reset Password Directly"
                  )}
                </Button>
              </form>
            )}

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="size-3" /> Cancel and Log In
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

