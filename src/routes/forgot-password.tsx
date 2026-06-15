import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
      // Even if there's an error, we show success on client to prevent email enumeration attacks
      // as required by security guidelines ("Show generic success messages to prevent email enumeration attacks.")
      setSuccess(true);
      toast.success("If an account exists, a reset link was sent.");
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
              <h2 className="text-2xl font-bold text-foreground">Email Sent</h2>
              <p className="text-sm text-muted-foreground leading-relaxed text-balance">
                If an account exists with this email address, a password reset link has been sent.
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
                Enter your registered email address and we'll send you a secure link to reset your password.
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
