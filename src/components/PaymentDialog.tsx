import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { initPaymentSession, getPaymentStatus } from "@/lib/payment.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    LemonSqueezy?: {
      Url: { Open: (url: string) => void; Close: () => void };
      Setup: (opts: { eventHandler: (event: { event: string }) => void }) => void;
    };
    createLemonSqueezy?: () => void;
  }
}

const PRICE_DISPLAY = "$0.50";

function DemoCheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const [processing, setProcessing] = useState(false);
  const inputCls =
    "w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime/50 focus:border-lime transition";
  const labelCls =
    "font-mono text-[10px] uppercase tracking-widest text-muted-foreground";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400));
    setProcessing(false);
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-lime/30 bg-lime/5 px-4 py-3 text-xs font-mono text-lime">
        DEMO MODE · No real charge · Set LEMON_SQUEEZY_CHECKOUT_URL to go live
      </div>
      <div>
        <label className={labelCls}>Card number</label>
        <input defaultValue="4242 4242 4242 4242" className={inputCls} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Expiry</label>
          <input defaultValue="12/29" className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>CVC</label>
          <input defaultValue="123" className={inputCls} required />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Total
        </span>
        <span className="font-display text-2xl">{PRICE_DISPLAY}</span>
      </div>
      <button
        type="submit"
        disabled={processing}
        className="w-full rounded-full bg-lime text-ink font-semibold py-3 text-sm hover:opacity-90 transition disabled:opacity-50"
      >
        {processing ? "Processing…" : `Pay ${PRICE_DISPLAY} (Demo)`}
      </button>
      <p className="text-[10px] text-center text-muted-foreground font-mono">
        🔒 Demo mode · No real card is charged
      </p>
    </form>
  );
}

function PollingState({ onManualCheck }: { onManualCheck: () => void }) {
  return (
    <div className="py-8 space-y-5 text-center">
      <div className="mx-auto size-12 rounded-full border-2 border-lime border-t-transparent animate-spin" />
      <div className="space-y-1">
        <p className="font-mono text-sm text-muted-foreground">
          Waiting for payment confirmation…
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Complete your purchase in the Lemon Squeezy checkout window. This
          dialog updates automatically once your payment is confirmed.
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Total
        </span>
        <span className="font-display text-2xl">{PRICE_DISPLAY}</span>
      </div>
      <button
        onClick={onManualCheck}
        className="w-full rounded-full bg-lime text-ink font-semibold py-3 text-sm hover:opacity-90 transition"
      >
        I've completed payment — check now
      </button>
      <p className="text-[10px] text-muted-foreground font-mono">
        🔒 Secured by Lemon Squeezy
      </p>
    </div>
  );
}

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
  const initSession = useServerFn(initPaymentSession);
  const pollStatus = useServerFn(getPaymentStatus);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleSuccess = () => {
    stopPolling();
    toast.success("Payment confirmed! Your promos are unlocked.");
    onSuccess();
    onOpenChange(false);
  };

  const startPolling = (sid: string) => {
    stopPolling();
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const { status } = await pollStatus({ data: { sessionId: sid } });
        if (status === "paid") {
          handleSuccess();
        } else if (status === "failed" || status === "refunded") {
          stopPolling();
          setPolling(false);
          toast.error("Payment was not completed. Please try again.");
        }
      } catch {
        // ignore transient polling errors
      }
    }, 2500);
  };

  const checkNow = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const { status } = await pollStatus({ data: { sessionId: sid } });
      if (status === "paid") {
        handleSuccess();
      } else {
        toast.info("Payment not confirmed yet. Please complete the checkout.");
      }
    } catch {
      toast.error("Could not check payment status. Please try again.");
    }
  };

  useEffect(() => {
    if (!open) {
      stopPolling();
      setSessionId(null);
      setIsDemo(false);
      setError(null);
      setPolling(false);
      sessionIdRef.current = null;
      return;
    }

    setLoading(true);
    setError(null);

    initSession({ data: { email } })
      .then((res) => {
        setSessionId(res.sessionId);
        sessionIdRef.current = res.sessionId;

        if (res.demo) {
          setIsDemo(true);
          return;
        }

        if (res.setupError) {
          setError(res.setupError);
          return;
        }

        if (!res.checkoutUrl) {
          setError("No checkout URL configured.");
          return;
        }

        // Ensure Lemon Squeezy embed script is initialized
        if (typeof window.createLemonSqueezy === "function" && !window.LemonSqueezy) {
          try { window.createLemonSqueezy(); } catch {}
        }

        // Try overlay first
        if (window.LemonSqueezy?.Url?.Open) {
          try {
            window.LemonSqueezy.Url.Open(res.checkoutUrl);
            startPolling(res.sessionId);
            return;
          } catch (err) {
            console.error("Lemon Squeezy overlay failed, falling back to redirect:", err);
          }
        }

        // Reliable fallback: full-page redirect (no popup blocker)
        startPolling(res.sessionId);
        window.location.href = res.checkoutUrl;

      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Failed to initialize checkout",
        ),
      )
      .finally(() => setLoading(false));

    return () => stopPolling();
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) stopPolling();
        onOpenChange(o);
      }}
    >
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Unlock your promos
          </DialogTitle>
          <DialogDescription>
            Pay once to download all 3 high-quality promo images as a ZIP
            archive.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-muted-foreground text-sm font-mono animate-pulse">
            Initializing secure checkout…
          </div>
        )}

        {error && (
          <div className="py-4 text-center text-destructive text-sm rounded-lg border border-destructive/30 bg-destructive/5 px-4">
            {error}
          </div>
        )}

        {!loading && !error && isDemo && (
          <DemoCheckoutForm onSuccess={handleSuccess} />
        )}

        {!loading && !error && polling && (
          <PollingState onManualCheck={checkNow} />
        )}
      </DialogContent>
    </Dialog>
  );
}
