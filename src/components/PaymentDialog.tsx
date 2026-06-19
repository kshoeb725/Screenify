import { useState } from "react";
import { toast } from "sonner";
import { Check, Lock, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { initPaymentSession } from "@/lib/payment.functions";

export function PaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  email,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  email: string;
}) {
  const [processing, setProcessing] = useState(false);
  const initSession = useServerFn(initPaymentSession);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await initSession({ data: { email } });
      if (res.setupError) {
        toast.error(res.setupError);
      } else if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      } else {
        toast.error("Failed to initialize checkout session.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to initialize payment.");
    } finally {
      setProcessing(false);
    }
  };

  const features = [
    "Unlimited screenshot renders & designs",
    "High-resolution watermark-free exports (4000x2250)",
    "Apply all styling configurations in 1-click",
    "Access to premium desktop & mobile mockup shells",
    "Priority support & updates",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-md p-6 rounded-2xl overflow-hidden shadow-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#3ECFB2]/10 rounded-full blur-3xl pointer-events-none" />
        
        <DialogHeader className="space-y-2 relative z-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[#3ECFB2] text-[10px] font-mono uppercase tracking-wider">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>Premium Upgrade</span>
            </div>
          </div>
          <DialogTitle className="font-sans text-xl font-extrabold tracking-tight text-foreground mt-1">
            Upgrade to Screenify Pro
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Unlock premium storefront screenshot generation, clean exports, and seamless 1-click custom templates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubscribe} className="space-y-4 mt-4 relative z-10">
          {/* Screenify Pro Card */}
          <div className="relative rounded-xl border border-border/80 bg-card/45 backdrop-blur-sm p-4 shadow-sm overflow-hidden flex flex-col justify-between space-y-4">
            {/* Top gradient edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3ECFB2]/30 to-transparent" />
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-sans text-base font-bold text-foreground">Screenify Pro</h3>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase mt-0.5">Solo Shopify Developers</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-sans text-3xl font-extrabold text-foreground tracking-tight">$9</span>
                    <span className="text-[10px] text-muted-foreground font-mono">/ mo</span>
                  </div>
                  <span className="text-[8px] text-[#C8E84A] font-semibold bg-[#C8E84A]/10 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1">
                    Cancel Anytime
                  </span>
                </div>
              </div>
              
              <ul className="text-xs text-muted-foreground space-y-2.5 pt-1.5">
                {features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="rounded-full bg-[#3ECFB2]/10 dark:bg-[#3ECFB2]/20 p-0.5 mt-0.5 shrink-0">
                      <Check className="size-3 text-[#3ECFB2]" />
                    </div>
                    <span className="leading-tight text-[11px] text-muted-foreground font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t border-border/40 pt-3 flex justify-between items-center text-[10px] font-mono">
              <span className="text-muted-foreground">Access Duration:</span>
              <span className="text-foreground font-semibold">Unlimited Monthly Access</span>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Account Details Box */}
            <div className="bg-muted/15 border border-border/40 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Account Email:</span>
              <span className="text-foreground font-semibold truncate max-w-[200px]">{email || "you@company.com"}</span>
            </div>

            {/* Subscribe Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full rounded-xl bg-[#3ECFB2] hover:bg-[#3ECFB2]/95 active:scale-[0.98] text-slate-950 font-bold py-3 text-xs shadow-md shadow-emerald-500/10 transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 tracking-wide uppercase"
            >
              {processing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Redirecting to Checkout...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Subscribe & Upgrade • $9 / month</span>
                </>
              )}
            </button>

            {/* Secure Payment Note */}
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/60 font-mono mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/45" />
              <span>Secured by Stripe • 256-bit SSL encryption</span>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

