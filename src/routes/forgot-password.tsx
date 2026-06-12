import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Lock, ArrowLeft, Loader2, Sparkles, CheckCircle2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminResetPassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password rules validation states
  const isMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
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
      // Call server function to directly update user password
      const resetRes = await adminResetPassword({
        data: {
          email: email.trim(),
          password,
        }
      });

      if (!resetRes.success) {
        toast.error(resetRes.error || "Failed to reset password.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err: any) {
      console.error("Password reset error details:", err);
      const cleanMessage = err.message
        ? err.message.replace(/^Error:\s*/i, "")
        : "Failed to reset password.";
      toast.error(cleanMessage);
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
            <span className="font-display text-xl font-bold text-white">
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
              <h2 className="text-2xl font-bold text-white">Password Updated</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password for <span className="font-semibold text-white">{email}</span> has been changed successfully. You can now log in with your new password.
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
              <h2 className="text-2xl font-bold text-white">Reset password</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your email address and configure a new password. It will be updated instantly.
              </p>
            </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2]"
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 py-5 rounded-xl border-border bg-[#101012]/50 text-sm focus:border-[#3ECFB2]"
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>

              {/* Password complexity requirements */}
              {password && (
                <div className="rounded-xl border border-border bg-[#101012]/30 p-3.5 space-y-2 text-xs font-sans">
                  <p className="font-semibold text-white/80">New Password Requirements:</p>
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
                className="w-full py-6 rounded-xl bg-[#3ECFB2] text-ink font-semibold text-sm hover:opacity-95 transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-ink" /> Saving Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-white transition"
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
