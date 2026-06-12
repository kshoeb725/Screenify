import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate payment gateway delay
    await new Promise((r) => setTimeout(r, 1200));
    setProcessing(false);
    toast.success("Subscribed to Screenify Pro successfully!");
    onSuccess();
    onOpenChange(false);
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
      <DialogContent className="bg-background border-border max-w-md p-4 rounded-2xl">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="font-display text-lg font-bold tracking-tight text-foreground">
            Upgrade to Screenify Pro
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground leading-normal">
            Unlock premium storefront screenshot generation, clean exports, and seamless 1-click custom templates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubscribe} className="space-y-3 mt-2">
          <div className="rounded-xl border border-[#3ECFB2]/20 bg-[#3ECFB2]/5 px-3 py-1.5 text-[10.5px] font-mono text-[#3ECFB2] flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-[#3ECFB2] animate-pulse shrink-0" />
            <span>DEMO MODE · Click below to simulate checkout & unlock Pro.</span>
          </div>

          {/* Screenify Pro Card */}
          <div className="relative rounded-xl border border-border/80 bg-card/45 p-3 shadow-sm overflow-hidden flex flex-col justify-between space-y-3">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3ECFB2]/20 to-transparent" />
            
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Screenify Pro</h3>
                  <p className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase mt-0.5">Solo Shopify Developers</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-display text-xl font-extrabold text-foreground">$9</span>
                  <span className="text-[9px] text-muted-foreground font-mono">/ month</span>
                </div>
              </div>
              
              <ul className="text-xs text-muted-foreground space-y-1 pt-0.5">
                {features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="size-3 text-[#3ECFB2] shrink-0 mt-0.5" />
                    <span className="leading-tight text-[10.5px]">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t border-border/40 pt-2 flex justify-between items-center text-[10px] font-mono">
              <span className="text-muted-foreground">Billed Monthly:</span>
              <span className="text-foreground font-semibold">Cancel anytime</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-mono border-t border-border pt-2">
              <span className="text-muted-foreground">Account:</span>
              <span className="text-foreground truncate max-w-[240px] font-semibold">{email || "you@company.com"}</span>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full rounded-xl bg-[#3ECFB2] text-slate-950 font-bold py-2 text-xs hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer text-center shadow-sm"
            >
              {processing
                ? "Processing subscription..."
                : "Subscribe to Screenify Pro ($9/mo)"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
