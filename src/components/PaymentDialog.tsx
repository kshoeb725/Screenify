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
  const [selectedPlan, setSelectedPlan] = useState<"growth" | "pro">("growth");
  const [processing, setProcessing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate payment gateway delay
    await new Promise((r) => setTimeout(r, 1200));
    setProcessing(false);
    toast.success(`Subscribed to ScreenMint ${selectedPlan === "growth" ? "Growth" : "Pro"} successfully!`);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">
            Upgrade to ScreenMint Pro
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited listing audits, high-resolution watermark-free downloads, and advanced growth analytics.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubscribe} className="space-y-6">
          <div className="rounded-lg border border-lime/30 bg-lime/5 px-4 py-3 text-xs font-mono text-lime">
            💡 DEMO SUBSCRIPTION MODE · Complete mock checkout to unlock exports.
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Growth Tier Card */}
            <div
              onClick={() => setSelectedPlan("growth")}
              className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                selectedPlan === "growth"
                  ? "border-lime bg-lime/5"
                  : "border-border hover:bg-card/45"
              }`}
            >
              <div>
                <h3 className="font-display text-xl leading-tight">Growth Plan</h3>
                <p className="font-mono text-xs text-muted-foreground mt-1">Solo Shopify Devs</p>
                <ul className="text-[11px] text-muted-foreground mt-4 space-y-2">
                  <li>✓ Unlimited sequence audits</li>
                  <li>✓ Full 6-slide copy sequences</li>
                  <li>✓ Custom brand templates</li>
                  <li>✓ Alt text & SEO keywords</li>
                </ul>
              </div>
              <div className="border-t border-border/60 mt-5 pt-3 flex justify-between items-baseline">
                <span className="font-display text-2xl font-bold text-white">$29</span>
                <span className="text-[10px] text-muted-foreground font-mono">/ month</span>
              </div>
            </div>

            {/* Pro Tier Card */}
            <div
              onClick={() => setSelectedPlan("pro")}
              className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                selectedPlan === "pro"
                  ? "border-lime bg-lime/5"
                  : "border-border hover:bg-card/45"
              }`}
            >
              <div>
                <h3 className="font-display text-xl leading-tight">Pro Plan</h3>
                <p className="font-mono text-xs text-muted-foreground mt-1">Agencies & studios (4+ apps)</p>
                <ul className="text-[11px] text-muted-foreground mt-4 space-y-2">
                  <li>✓ Everything in Growth</li>
                  <li>✓ Competitive intelligence alerts</li>
                  <li>✓ Simulated A/B testing panel</li>
                  <li>✓ Priority support & White-label</li>
                </ul>
              </div>
              <div className="border-t border-border/60 mt-5 pt-3 flex justify-between items-baseline">
                <span className="font-display text-2xl font-bold text-white">$79</span>
                <span className="text-[10px] text-muted-foreground font-mono">/ month</span>
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
              className="w-full rounded-full bg-lime text-ink font-semibold py-3.5 text-base hover:opacity-90 transition lime-glow disabled:opacity-50"
            >
              {processing
                ? "Processing subscription..."
                : `Activate ${selectedPlan === "growth" ? "Growth" : "Pro"} Subscription (Demo)`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
