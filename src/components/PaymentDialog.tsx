import { useState } from "react";
import { toast } from "sonner";
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
  const [selectedPlan, setSelectedPlan] = useState<"lifetime" | "agency">("lifetime");
  const [processing, setProcessing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate payment gateway delay
    await new Promise((r) => setTimeout(r, 1200));
    setProcessing(false);
    toast.success(`Subscribed to Screenify ${selectedPlan === "lifetime" ? "Pro Lifetime" : "Agency License"} successfully!`);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">
            Upgrade to Screenify Pro
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited screenshots, high-resolution watermark-free exports, and apply styles in 1-click.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubscribe} className="space-y-6">
          <div className="rounded-lg border border-[#3ECFB2]/30 bg-[#3ECFB2]/5 px-4 py-3 text-xs font-mono text-[#3ECFB2]">
            💡 DEMO SUBSCRIPTION MODE · Complete mock checkout to unlock exports.
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Pro Lifetime Card */}
            <div
              onClick={() => setSelectedPlan("lifetime")}
              className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                selectedPlan === "lifetime"
                  ? "border-[#3ECFB2] bg-[#3ECFB2]/5"
                  : "border-border hover:bg-card/45"
              }`}
            >
              <div>
                <h3 className="font-display text-xl leading-tight text-white">Pro Lifetime</h3>
                <p className="font-mono text-xs text-muted-foreground mt-1">Solo Shopify Devs</p>
                <ul className="text-[11px] text-muted-foreground mt-4 space-y-2">
                  <li>✓ Unlimited screenshots</li>
                  <li>✓ High-resolution exports</li>
                  <li>✓ No Watermarks (Clean PNGs)</li>
                  <li>✓ Apply Style to All Slides</li>
                  <li>✓ Support for Mockup Shells</li>
                </ul>
              </div>
              <div className="border-t border-border/60 mt-5 pt-3 flex justify-between items-baseline">
                <span className="font-display text-2xl font-bold text-white">$9</span>
                <span className="text-[10px] text-muted-foreground font-mono">one-time</span>
              </div>
            </div>

            {/* Agency Tier Card */}
            <div
              onClick={() => setSelectedPlan("agency")}
              className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                selectedPlan === "agency"
                  ? "border-[#3ECFB2] bg-[#3ECFB2]/5"
                  : "border-border hover:bg-card/45"
              }`}
            >
              <div>
                <h3 className="font-display text-xl leading-tight text-white">Agency License</h3>
                <p className="font-mono text-xs text-muted-foreground mt-1">Studios & teams (unlimited apps)</p>
                <ul className="text-[11px] text-muted-foreground mt-4 space-y-2">
                  <li>✓ Everything in Pro Lifetime</li>
                  <li>✓ Multi-developer license</li>
                  <li>✓ Priority white-glove setup</li>
                  <li>✓ Premium lifetime updates</li>
                </ul>
              </div>
              <div className="border-t border-border/60 mt-5 pt-3 flex justify-between items-baseline">
                <span className="font-display text-2xl font-bold text-white">$29</span>
                <span className="text-[10px] text-muted-foreground font-mono">one-time</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-mono border-t border-border pt-4">
              <span className="text-muted-foreground">Subscribed Account:</span>
              <span className="text-white truncate max-w-[200px]">{email || "you@company.com"}</span>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full rounded-full bg-[#3ECFB2] text-ink font-semibold py-3.5 text-base hover:opacity-90 transition disabled:opacity-50 cursor-pointer text-center"
            >
              {processing
                ? "Processing subscription..."
                : `Activate ${selectedPlan === "lifetime" ? "Pro Lifetime" : "Agency"} License (Demo)`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
