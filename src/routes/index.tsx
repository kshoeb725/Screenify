import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { generatePromos } from "@/lib/generate.functions";
import { useTheme } from "@/hooks/use-theme";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Footer } from "@/components/Footer";
import { extractFromDataUrl } from "@/lib/extract-palette";
import * as htmlToImage from "html-to-image";

type FormData = {
  email: string;
  appName: string;
  targetAudience: string;
  objective: string;
};

export const Route = createFileRoute("/")({
  component: Index,
});

type Result = Awaited<ReturnType<typeof generatePromos>>;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB as per spec
const PRICE_DISPLAY = "$0.50";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function detectBlur(img: HTMLImageElement, threshold = 6.0): boolean {
  try {
    const W = 200;
    const H = Math.max(1, Math.round((img.height / img.width) * W));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, W, H);
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    // Convert to grayscale
    const gray = new Float32Array(W * H);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Apply Laplacian filter
    let sum = 0;
    let count = 0;
    const laplacian = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        // Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
        const val =
          gray[idx - W] +
          gray[idx - 1] -
          4 * gray[idx] +
          gray[idx + 1] +
          gray[idx + W];
        laplacian[idx] = val;
        sum += val;
        count++;
      }
    }

    const mean = sum / count;
    let varianceSum = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        const diff = laplacian[idx] - mean;
        varianceSum += diff * diff;
      }
    }
    const variance = varianceSum / count;
    console.log("[Blur Detection] Variance of Laplacian:", variance);
    return variance < threshold;
  } catch (e) {
    console.error("[Blur Detection] Error running check:", e);
    return false;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

async function compressImage(dataUrl: string, maxDim = 2560): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;

        // Dynamic scaling:
        // 1. If it's a very large image, downscale it to maxDim (2560px) to prevent memory issues.
        // 2. If it's a smaller image (e.g., < 1600px width), upscale it to at least 1600px width so that it looks high-quality on the 1600x900 canvas.
        const minDim = 1600;
        let scale = 1;

        if (Math.max(w, h) > maxDim) {
          scale = maxDim / Math.max(w, h);
        } else if (w < minDim && h < minDim) {
          // Upscale factor to hit minDim (1600px) on the larger dimension
          scale = minDim / Math.max(w, h);
        }

        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Apply GPU-accelerated sharpen and contrast filter
        // References the SVG filter #canvas-sharpen in JSX, plus slight contrast/saturation boosts.
        ctx.filter = "url(#canvas-sharpen) contrast(1.04) saturate(1.02)";

        ctx.drawImage(img, 0, 0, w, h);

        // Convert to PNG for lossless rendering (perfect for text/UI)
        let resultDataUrl = canvas.toDataURL("image/png");

        // Fallback to high-quality JPEG if PNG is too large (over 8MB)
        if (resultDataUrl.length > 8 * 1024 * 1024) {
          resultDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        }

        resolve(resultDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

function Index() {
  const generate = useServerFn(generatePromos);
  const { theme } = useTheme();

  const [preview, setPreview] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("screenmint_preview");
    }
    return null;
  });
  const [status, setStatus] = useState<"idle" | "preview" | "loading" | "done">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("screenmint_status") as any) || "idle";
    }
    return "idle";
  });
  const [result, setResult] = useState<Result | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_result");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return null;
  });
  const [form, setForm] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_form");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { email: "", appName: "", targetAudience: "", objective: "" };
  });
  const [paid, setPaid] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_paid");
      return saved !== "false"; // default to true
    }
    return true;
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const [extractedColors, setExtractedColors] = useState<{ bg: string; primary: string; accent: string }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_extractedColors");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {
      bg: "#F5F1E8",
      primary: "#121212",
      accent: "#C8E84A",
    };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (preview) {
          localStorage.setItem("screenmint_preview", preview);
        } else {
          localStorage.removeItem("screenmint_preview");
        }
      } catch (e) {
        console.warn("localStorage quota exceeded for preview screenshot", e);
      }
    }
  }, [preview]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_status", status);
    }
  }, [status]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (result) {
        localStorage.setItem("screenmint_result", JSON.stringify(result));
      } else {
        localStorage.removeItem("screenmint_result");
      }
    }
  }, [result]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_form", JSON.stringify(form));
    }
  }, [form]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_extractedColors", JSON.stringify(extractedColors));
    }
  }, [extractedColors]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_paid", String(paid));
    }
  }, [paid]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image (PNG, JPG, or WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image too large. Keep it under 10MB.");
      return;
    }

    const toastId = toast.loading("Processing screenshot and enhancing quality...");
    try {
      const dataUrl = await readAsDataURL(file);
      const img = await loadImage(dataUrl);

      // Perform Blur Detection (Variance of Laplacian)
      const isBlurry = detectBlur(img);
      if (isBlurry) {
        toast.dismiss(toastId);
        toast.error("Uploaded screenshot is too blurry or low-quality. Please upload a clear, sharp screenshot.", {
          duration: 6000,
        });
        return;
      }

      const compressed = await compressImage(dataUrl).catch(() => dataUrl);
      setPreview(compressed);
      setResult(null);
      setPaid(true);
      setStatus("preview");
      toast.dismiss(toastId);
      toast.success("Screenshot loaded and enhanced successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to process image. Please try another file.");
      console.error(err);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!preview) return;
    if (!form.email.trim() || !form.appName.trim() || !form.targetAudience.trim() || !form.objective.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      const { palette, backgroundStyle } = await extractFromDataUrl(preview, 5);
      const bg = palette[1] ?? "#F5F1E8";
      const primary = palette[0] ?? "#121212";
      const accent = palette[2] ?? "#C8E84A";
      setExtractedColors({ bg, primary, accent });

      const res = await generate({
        data: {
          imageDataUrl: preview,
          email: form.email.trim(),
          appName: form.appName.trim(),
          targetAudience: form.targetAudience.trim(),
          objective: form.objective.trim(),
          palette,
          backgroundStyle,
        },
      });
      
      // Set new session flag before updating state to trigger the mount sync
      if (typeof window !== "undefined") {
        localStorage.setItem("screenmint_is_new_session", "true");
      }

      setResult(res);
      setPaid(false);
      setStatus("done");
      toast.success("Marketing copy generated! Choose your template below.");
    } catch (e) {
      setStatus("preview");
      toast.error(e instanceof Error ? e.message : "Generation failed");
    }
  }, [generate, preview, form]);

  const onReset = useCallback(() => {
    setPreview(null);
    setResult(null);
    setPaid(false);
    setStatus("idle");
    if (typeof window !== "undefined") {
      localStorage.removeItem("screenmint_preview");
      localStorage.removeItem("screenmint_status");
      localStorage.removeItem("screenmint_result");
      localStorage.removeItem("screenmint_form");
      localStorage.removeItem("screenmint_extractedColors");
      localStorage.removeItem("screenmint_paid");
      localStorage.removeItem("screenmint_is_new_session");
      
      localStorage.removeItem("screenmint_template");
      localStorage.removeItem("screenmint_stylePreset");
      localStorage.removeItem("screenmint_variant");
      localStorage.removeItem("screenmint_headline");
      localStorage.removeItem("screenmint_subheadline");
      localStorage.removeItem("screenmint_features");
      localStorage.removeItem("screenmint_colors");
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground grain">
      <svg style={{ display: "none" }}>
        <defs>
          <filter id="canvas-sharpen">
            <feConvolveMatrix
              order="3"
              kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0"
              preserveAlpha="true"
            />
          </filter>
        </defs>
      </svg>
      <Toaster theme={theme} position="top-center" />
      <Nav />
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        {status === "idle" && !preview && <Hero onPick={() => fileRef.current?.click()} onDrop={handleUpload} />}
        {status === "preview" && preview && (
          <Preview image={preview} form={form} setForm={setForm} onGenerate={handleGenerate} onReset={onReset} />
        )}
        {status === "loading" && <Loading preview={preview} />}
        {status === "done" && result && (
          <Results
            result={result}
            preview={preview}
            paid={paid}
            onPaid={() => setPaid(true)}
            onReset={onReset}
            email={form.email}
            extractedColors={extractedColors}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </section>
      <FAQ />
      <Footer />
    </main>
  );
}

function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="mx-auto max-w-6xl px-6 pt-8 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <img
          src="/screenmint-icon.png"
          alt="Screenify icon"
          className="h-14 w-14 rounded-2xl object-cover"
        />
        <span className="font-display text-2xl tracking-tight">
          Screen<span className="text-[#3ECFB2]">ify</span>
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-lime animate-pulse" /> AI live
        </span>
        <button
          onClick={toggle}
          className="inline-flex items-center justify-center rounded-full border border-border px-3 py-2 hover:bg-card transition"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

function Hero({ onPick, onDrop }: { onPick: () => void; onDrop: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="rise">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        For Shopify app developers
      </p>
      <h1 className="mt-4 font-display text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-tight text-balance">
        One screenshot.
        <br />
        <span className="italic text-lime">One</span> store-ready promo.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
        Drop a single screenshot of your Shopify app. Get a polished App Store image in under a
        minute. No designer, no Figma, no settings.
      </p>

      <div
        onClick={onPick}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onDrop(f);
        }}
        className={`mt-12 relative overflow-hidden rounded-2xl border-2 border-dashed transition cursor-pointer ${
          dragging ? "border-lime bg-lime/5 lime-glow" : "border-border bg-card/40 hover:bg-card/70"
        }`}
      >
        <div className="px-8 py-16 sm:py-20 text-center">
          <div className="mx-auto mb-6 size-14 rounded-full bg-lime grid place-items-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink">
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          </div>
          <p className="font-display text-3xl mb-2">Drop your app screenshot</p>
          <p className="text-muted-foreground mb-6 text-sm">PNG, JPG, or WebP · up to 10MB</p>
          <button
            onClick={(e) => { e.stopPropagation(); onPick(); }}
            className="inline-flex items-center gap-2 rounded-full bg-lime text-ink font-semibold px-6 py-3 hover:opacity-90 transition lime-glow"
          >
            Choose screenshot
            <span className="font-mono text-xs opacity-70">↵</span>
          </button>
        </div>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        {[
          { n: "01", t: "Upload", d: "One screenshot. That's the entire input." },
          { n: "02", t: "Analyze", d: "AI reads layout, purpose, and key UI." },
          { n: "03", t: "Generate", d: `1 promo image · Pay ${PRICE_DISPLAY} to download.` },
        ].map((s) => (
          <div key={s.n} className="bg-card p-7">
            <div className="font-mono text-xs text-lime mb-3">{s.n}</div>
            <div className="font-display text-2xl mb-1">{s.t}</div>
            <div className="text-sm text-muted-foreground">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Preview({
  image,
  form,
  setForm,
  onGenerate,
  onReset,
}: {
  image: string;
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onGenerate: () => void;
  onReset: () => void;
}) {
  const update = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50 focus:border-lime transition";
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5";

  return (
    <div className="rise grid md:grid-cols-2 gap-10 items-start min-h-[60vh]">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card md:sticky md:top-8">
        <img src={image} alt="Your upload" className="w-full h-auto block" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 font-mono text-xs text-cream/80">your_upload.png</div>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime mb-4">Tell us about your app</p>
        <h2 className="font-display text-4xl sm:text-5xl mb-3">A few details.</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          These help the AI generate promos that actually match your app instead of generic ones.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className={labelCls}>Email address *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              placeholder="you@company.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>App name *</label>
            <input
              type="text"
              required
              value={form.appName}
              onChange={update("appName")}
              placeholder="e.g. ReviewBoost"
              maxLength={100}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Target audience *</label>
            <input
              type="text"
              required
              value={form.targetAudience}
              onChange={update("targetAudience")}
              placeholder="e.g. fashion DTC merchants on Shopify Plus"
              maxLength={300}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Main objective / outcome *</label>
            <textarea
              required
              value={form.objective}
              onChange={update("objective")}
              placeholder="e.g. increase product page conversion with social proof"
              maxLength={500}
              rows={3}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-full bg-lime text-ink font-semibold px-8 py-3.5 text-base hover:opacity-90 transition lime-glow"
          >
            Generate promo
            <span className="font-mono text-xs opacity-70">↵</span>
          </button>
          <button
            onClick={onReset}
            className="rounded-full border border-border px-6 py-3.5 text-sm hover:bg-card transition"
          >
            Change screenshot
          </button>
        </div>
        <p className="mt-6 text-xs font-mono text-muted-foreground">Typically 3–5 seconds.</p>
      </div>
    </div>
  );
}

function Loading({ preview }: { preview: string | null }) {
  const steps = [
    "Reading your screenshot",
    "Identifying app purpose",
    "Planning your layout concept",
    "Writing custom copy copy",
  ];
  return (
    <div className="rise grid md:grid-cols-2 gap-10 items-center min-h-[60vh]">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
        {preview && <img src={preview} alt="Your upload" className="w-full h-auto block" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 font-mono text-xs text-cream/80">your_upload.png</div>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime mb-4">Generating</p>
        <h2 className="font-display text-4xl sm:text-5xl mb-8">Building your editor canvas…</h2>
        <ul className="space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-muted-foreground">
              <span
                className="size-2 rounded-full bg-lime animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs font-mono text-muted-foreground">
          Typically 3–5 seconds. Hang tight.
        </p>
      </div>
    </div>
  );
}

const IsometricBoxIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#boxGradTop)" />
    <path d="M2 7v10l10 5V12L2 7z" fill="url(#boxGradLeft)" opacity="0.9" />
    <path d="M12 12v10l10-5V7l-10 5z" fill="url(#boxGradRight)" opacity="0.85" />
    <defs>
      <linearGradient id="boxGradTop" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id="boxGradLeft" x1="2" y1="7" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="boxGradRight" x1="12" y1="7" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1D4ED8" />
        <stop offset="1" stopColor="#1E3A8A" />
      </linearGradient>
    </defs>
  </svg>
);

const GrowthChartIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="24" height="24" rx="7" fill="url(#growthGrad)" />
    <path d="M5 17l5-5 3 3 6-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 9h4v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="growthGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#059669" />
        <stop offset="1" stopColor="#10B981" />
      </linearGradient>
    </defs>
  </svg>
);

const ChatBubbleIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="url(#chatGrad)" />
    <circle cx="8" cy="10" r="1.5" fill="white" />
    <circle cx="12" cy="10" r="1.5" fill="white" />
    <circle cx="16" cy="10" r="1.5" fill="white" />
    <defs>
      <linearGradient id="chatGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34D399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

const FMonogramIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="24" height="24" rx="6" fill="url(#fGrad)" />
    <text x="12" y="17" fill="white" fontSize="14" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">F</text>
    <defs>
      <linearGradient id="fGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  </svg>
);

const TargetIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="24" height="24" rx="7" fill="url(#targetGrad)" />
    <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="1" fill="white" />
    <defs>
      <linearGradient id="targetGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EC4899" />
        <stop offset="1" stopColor="#F43F5E" />
      </linearGradient>
    </defs>
  </svg>
);

const RocketIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="24" height="24" rx="7" fill="url(#rocketGrad)" />
    <path d="M16.5 7.5c-1.5-1.5-4-1.5-4-1.5s0 2.5 1.5 4c1 1 2.5 1 2.5 1s0-1.5-1-2.5z" fill="white" />
    <path d="M13.5 10.5L9 15v2h2l4.5-4.5-2-2z" fill="white" />
    <path d="M8 16l-2 2 .5.5 1.5-.5.5-1.5-.5-.5z" fill="white" opacity="0.8" />
    <defs>
      <linearGradient id="rocketGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#EF4444" />
      </linearGradient>
    </defs>
  </svg>
);

const LightningIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M13 3L5 13h6v8l8-10h-6V3z" fill="url(#lightGrad)" />
    <defs>
      <linearGradient id="lightGrad" x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

const BellIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" fill="url(#bellGrad)" />
    <defs>
      <linearGradient id="bellGrad" x1="3" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#60A5FA" />
      </linearGradient>
    </defs>
  </svg>
);

const ShieldIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#shieldGrad)" />
    <defs>
      <linearGradient id="shieldGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#34D399" />
      </linearGradient>
    </defs>
  </svg>
);

const CheckCircleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="10" fill="url(#chkGrad)" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="chkGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

const ProfileIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="10" fill="url(#profGrad)" />
    <path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white" />
    <circle cx="12" cy="8" r="3" fill="white" />
    <defs>
      <linearGradient id="profGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
);

function TemplateCanvas({
  template,
  stylePreset,
  headline,
  subheadline,
  features,
  colors,
  screenshot,
  watermark,
  appName,
}: {
  template: string;
  stylePreset: string;
  headline: string;
  subheadline: string;
  features: string[];
  colors: { bg: string; primary: string; accent: string };
  screenshot: string;
  watermark: boolean;
  appName: string;
}) {
  const FontStyles = () => (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
      .font-serif-elegant {
        font-family: 'Playfair Display', Georgia, Cambria, serif;
      }
      .font-sans-outfit {
        font-family: 'Outfit', sans-serif;
      }
      .font-sans-jakarta {
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
    `}} />
  );

  const getLuminance = (hex: string): number => {
    if (!hex || typeof hex !== "string") return 255;
    const cleanHex = hex.replace("#", "").trim();
    if (cleanHex.length !== 3 && cleanHex.length !== 6) return 255;
    
    let r = 255, g = 255, b = 255;
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    }
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const resolveBgAndText = () => {
    let finalBg = colors.bg;
    let finalTextColor = colors.primary;
    let isBgDark = false;

    if (stylePreset === "minimal") {
      finalBg = "#FFFFFF";
      finalTextColor = "#0F172A"; // slate-900
      isBgDark = false;
    } else if (stylePreset === "dark") {
      finalBg = "#0A0B0E";
      finalTextColor = "#F8FAFC"; // slate-50
      isBgDark = true;
    } else if (stylePreset === "gradient") {
      finalBg = `linear-gradient(135deg, ${colors.bg}, ${colors.accent})`;
      const lumBg = getLuminance(colors.bg);
      const lumAccent = getLuminance(colors.accent);
      const avgLum = (lumBg + lumAccent) / 2;
      isBgDark = avgLum < 140;
      finalTextColor = isBgDark ? "#F8FAFC" : "#0F172A";
    } else {
      // Modern preset
      if (template === "enterprise") {
        finalBg = "linear-gradient(135deg, #060B26 0%, #020412 100%)"; // Premium deep slate/navy grid
        finalTextColor = "#FFFFFF";
        isBgDark = true;
      } else if (template === "growth") {
        finalBg = "linear-gradient(135deg, #022315 0%, #010F09 100%)"; // Premium deep green/emerald
        finalTextColor = "#FFFFFF";
        isBgDark = true;
      } else if (template === "showcase") {
        finalBg = "#FAF9F5"; // Beautiful soft warm luxury off-white
        finalTextColor = "#1C1917"; // Warm stone-900
        isBgDark = false;
      } else if (template === "executive") {
        finalBg = "#FAF8F5"; // Warm clean off-white
        finalTextColor = "#0F172A"; // Slate-900
        isBgDark = false;
      } else {
        finalBg = colors.bg;
        const lum = getLuminance(colors.bg);
        isBgDark = lum < 140;
        finalTextColor = isBgDark ? "#FFFFFF" : colors.primary || "#0F172A";
      }
    }

    return { bg: finalBg, text: finalTextColor, isDark: isBgDark };
  };

  const { bg: bgStyle, text: textColor, isDark } = resolveBgAndText();

  // Helper to parse double asterisks and format them specifically for each layout type
  const renderHeadline = (text: string, templateId: string) => {
    if (!text) return "";
    const parts = text.split(/\*\*([^*]+)\*\*/);
    
    // Find text inside bold markers
    const hasBold = parts.length > 1;
    
    const formatSegment = (segment: string, isHighlighted: boolean) => {
      if (!isHighlighted) return segment;
      
      switch (templateId) {
        case "executive":
          // Professional gradient badge
          return (
            <span key={segment} className="px-4 py-1.5 rounded-full inline-block mx-1.5 border font-extrabold text-[0.95em]"
                  style={{ 
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)", 
                    borderColor: "rgba(16, 185, 129, 0.25)",
                    color: "#10B981"
                  }}>
              {segment}
            </span>
          );
        case "conversion":
          // High conversion italic gradient highlight
          return (
            <span key={segment} className="relative inline-block mx-1 font-extrabold animate-pulse"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${colors.accent} 0%, ${colors.accent} 100%)`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "100% 0.25em",
                    backgroundPosition: "0 88%"
                  }}>
              {segment}
            </span>
          );
        case "showcase":
          // Elegant serif gold/amber highlight
          return (
            <span key={segment} className="italic font-serif-elegant font-normal text-amber-600 dark:text-amber-500 mx-1">
              {segment}
            </span>
          );
        case "enterprise":
          // Corporate bold solid badge
          return (
            <span key={segment} className="px-4.5 py-1.5 rounded-lg inline-block mx-1 border font-extrabold"
                  style={{
                    backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : `${colors.accent}20`,
                    borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : `${colors.accent}40`,
                    color: isDark ? "#60A5FA" : colors.accent
                  }}>
              {segment}
            </span>
          );
        case "growth":
          // Dynamic vibrant Shopify pill
          return (
            <span key={segment} className="px-4.5 py-1.5 rounded-2xl inline-block mx-1 text-white font-extrabold shadow-sm rotate-[-0.5deg]"
                  style={{
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                  }}>
              {segment}
            </span>
          );
        case "hero":
          // Center gradient text
          return (
            <span key={segment} className="bg-clip-text text-transparent font-black mx-1"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${colors.accent}, ${isDark ? "#FFFFFF" : colors.primary})`
                  }}>
              {segment}
            </span>
          );
        case "sidebyside":
          // Marker highlight
          return (
            <span key={segment} className="px-2 py-0.5 rounded-md mx-1 text-gray-900 font-extrabold"
                  style={{ backgroundColor: colors.accent }}>
              {segment}
            </span>
          );
        case "spotlight":
          // Clean modern border outline
          return (
            <span key={segment} className="px-4 py-1 rounded-xl inline-block mx-1.5 border-2 border-dashed font-extrabold"
                  style={{ borderColor: colors.accent, color: colors.accent }}>
              {segment}
            </span>
          );
        case "modernsaas":
          // Neon glow text style
          return (
            <span key={segment} className="font-extrabold mx-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  style={{ color: colors.accent }}>
              {segment}
            </span>
          );
        default:
          return (
            <span key={segment} className="underline decoration-wavy mx-1" style={{ decorationColor: colors.accent }}>
              {segment}
            </span>
          );
      }
    };

    if (hasBold) {
      return parts.map((part, i) => formatSegment(part, i % 2 === 1));
    }
    
    // Fallback: If no bold tags exist, highlight the last two words
    const words = text.trim().split(" ");
    if (words.length > 2) {
      const lastTwo = words.slice(-2).join(" ");
      const firstPart = words.slice(0, -2).join(" ");
      return (
        <>
          {firstPart}{" "}
          {formatSegment(lastTwo, true)}
        </>
      );
    }
    return text;
  };

  const renderCreativeFeature = (feat: string, index: number, styleType: "glass" | "outline" | "solid" | "serif") => {
    if (!feat) return null;
    
    const icons = [
      <svg key="0" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>,
      <svg key="1" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.63 3.06M21 12c0-2.203-1.042-4.162-2.67-5.46M21 12c0 3.228-2.62 5.85-5.85 5.85a5.85 5.85 0 0 1-4.87-2.61M21 12c0-4.418-3.582-8-8-8s-8 3.582-8 8a8 8 0 0 0 .5 2.82" />
      </svg>,
      <svg key="2" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ];
    
    const icon = icons[index % icons.length];
    
    if (styleType === "glass") {
      return (
        <div key={index} className="flex items-center gap-3.5 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 shadow-lg font-sans-outfit text-[18px] font-black text-white backdrop-blur-md transition hover:scale-[1.01]">
          <span style={{ color: colors.accent }}>{icon}</span>
          <span>{feat}</span>
        </div>
      );
    } else if (styleType === "solid") {
      return (
        <div key={index} className="flex items-center gap-3.5 px-6 py-3.5 rounded-2xl border shadow-lg font-sans-jakarta text-[18px] font-black transition-all hover:scale-[1.01]"
             style={{ backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : `${colors.accent}12`, borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : `${colors.accent}30`, color: textColor }}>
          <span style={{ color: colors.accent }}>{icon}</span>
          <span>{feat}</span>
        </div>
      );
    } else if (styleType === "serif") {
      return (
        <div key={index} className="flex items-center gap-3.5 text-[20px] font-serif-elegant font-black" style={{ color: textColor }}>
          <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: colors.accent || textColor, boxShadow: `0 0 10px ${colors.accent}` }} />
          <span>{feat}</span>
        </div>
      );
    } else {
      return (
        <div key={index} className="flex items-center gap-3.5 px-6 py-3 rounded-2xl border shadow-lg text-[18px] font-black"
             style={{ color: textColor, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)" }}>
          <span style={{ color: colors.accent }}>{icon}</span>
          <span>{feat}</span>
        </div>
      );
    }
  };

  const ScreenshotMockup = ({ maxHeight }: { maxHeight?: string }) => (
    <div className={`w-full rounded-xl border overflow-hidden shadow-2xl transition-all duration-300 relative ${
      isDark ? "border-white/10 bg-black/40" : "border-black/5 bg-white"
    }`}>
      {/* Browser Bar */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
        isDark ? "bg-black/60 border-white/5" : "bg-gray-50 border-gray-100"
      }`}>
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-red-400" />
          <div className="size-2 rounded-full bg-yellow-400" />
          <div className="size-2 rounded-full bg-green-400" />
        </div>
        <div className={`rounded px-6 py-1 text-[11px] font-mono text-center max-w-[250px] mx-auto overflow-hidden text-ellipsis whitespace-nowrap ${
          isDark ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-400"
        }`}>
          admin.shopify.com/apps/{appName?.toLowerCase() || "dashboard"}
        </div>
        <div className="w-10" />
      </div>
      <div 
        className="relative overflow-hidden" 
        style={maxHeight ? { 
          maxHeight: maxHeight, 
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)"
        } : {}}
      >
        <img src={screenshot} alt="Screenshot" className="w-full object-contain block" />
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: bgStyle,
        color: textColor,
        width: 1600,
        height: 900,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      className={`select-none tracking-tight leading-normal`}
    >
      <FontStyles />

      {/* 1. EXECUTIVE SAAS LAYOUT (WATI WIDGET INSPIRED) */}
      {template === "executive" && (
        <div className="h-full flex flex-col justify-between px-20 py-12 font-sans-jakarta relative">
          {/* Radial blur blobs */}
          <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[#10b981]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[450px] h-[450px] rounded-full bg-[#3b82f6]/15 blur-3xl pointer-events-none" />
          <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

          {/* Logo & Category Header */}
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-2.5">
              <ChatBubbleIcon size={28} />
              <span className="font-mono text-[12px] tracking-wider bg-emerald-500/10 px-4 py-1.5 rounded-full font-bold uppercase"
                    style={{ color: "#10B981" }}>
                {appName || "WATI"} widget
              </span>
            </div>
            <div className="text-sm font-mono tracking-widest uppercase font-bold opacity-60" style={{ color: textColor }}>
              {appName || "wati"} . saas
            </div>
          </div>

          {/* Headline & Subheadline */}
          <div className="max-w-5xl mt-2 z-10">
            <h1 className="text-[72px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "executive")}
            </h1>
            <p className="text-[23px] mt-4 max-w-3xl leading-relaxed font-bold font-sans-jakarta"
               style={{ color: isDark ? "rgba(248, 250, 252, 0.75)" : "rgba(15, 23, 42, 0.75)" }}>
              {subheadline}
            </p>
          </div>

          {/* Floating visual elements around center mockup */}
          <div className="relative w-[700px] mx-auto my-3 flex items-center justify-center z-10">
            {/* Floating widget left */}
            <div className={`absolute -left-24 bottom-12 w-48 p-4 border rounded-2xl shadow-xl flex flex-col gap-2.5 rotate-[-4deg] select-none backdrop-blur-md ${
              isDark ? "bg-black/60 border-white/10 text-white" : "bg-white border-black/5 text-gray-800"
            }`}>
              <div className="flex items-center gap-1.5 border-b pb-1.5 border-current/10">
                <div className="size-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <div className="text-[10px] font-extrabold">WhatsApp live</div>
              </div>
              <div className={`h-6.5 w-full rounded flex items-center px-2 text.5 text-[9px] font-semibold ${
                isDark ? "bg-white/5 border border-white/5 text-gray-300" : "bg-gray-50 border border-gray-100 text-gray-500"
              }`}>
                Hello! How can we help you?
              </div>
              <div className="h-6 w-1/2 rounded-lg bg-green-500 self-end flex items-center justify-center text-[8px] text-white font-bold cursor-default">
                Send chat
              </div>
            </div>

            {/* Main Mockup */}
            <div className="w-full scale-[0.98] transition-transform duration-500 hover:scale-[1.00]">
              <ScreenshotMockup maxHeight="340px" />
            </div>

            {/* Floating widget right */}
            <div className={`absolute -right-24 bottom-20 w-44 p-3.5 border rounded-2xl shadow-xl flex flex-col gap-2.5 rotate-[3deg] select-none backdrop-blur-md ${
              isDark ? "bg-black/60 border-white/10 text-white" : "bg-white border-black/5 text-gray-800"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-bold">
                  <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold">Active User</div>
                  <div className="text-[8px] text-green-500 font-bold">Online now</div>
                </div>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
                <div className="h-full bg-green-500 w-[85%]" />
              </div>
              <div className={`text-[9px] leading-tight italic font-medium ${isDark ? "text-gray-300" : "text-gray-500"}`}>
                "Customized widget active on checkout in 1 minute!"
              </div>
            </div>
          </div>

          {/* Features Row */}
          <div className="flex gap-6 justify-center z-10">
            {features.filter(Boolean).slice(0, 3).map((feat, i) => (
              renderCreativeFeature(feat, i, "solid")
            ))}
          </div>
        </div>
      )}

      {/* 2. CONVERSION FOCUSED LAYOUT */}
      {template === "conversion" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative">
          <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />
          
          <div className="col-span-5 flex flex-col justify-center h-full pr-2 z-10">
            <div className="inline-flex w-fit items-center gap-2.5 px-4 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider mb-5 shadow-sm"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : `${colors.accent}15`, color: isDark ? colors.accent : "#DB2777", border: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${colors.accent}25` }}>
              <TargetIcon size={18} />
              <span>Conversion Booster</span>
            </div>
            
            <h1 className="text-[64px] font-black leading-[1.08] mb-4 font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "conversion")}
            </h1>
            
            <p className="text-[22px] mb-6 leading-relaxed font-bold font-sans-jakarta"
               style={{ color: isDark ? "rgba(248, 250, 252, 0.75)" : "rgba(75, 85, 99, 0.9)" }}>
              {subheadline}
            </p>
 
            <div className={`p-4.5 rounded-2xl border mb-6 flex items-center gap-4.5 shadow-md ${
              isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
            }`}>
              <div className="size-13 rounded-xl flex items-center justify-center shrink-0 shadow-inner" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)" }}>
                <RocketIcon size={24} />
              </div>
              <div>
                <h4 className="font-extrabold text-[16px]" style={{ color: textColor }}>Automated Growth Engine</h4>
                <p className="text-[12px] opacity-70 mt-0.5" style={{ color: textColor }}>Optimize storefront conversion rates instantly</p>
              </div>
            </div>
 
            <div className="flex flex-col gap-3">
              {features.filter(Boolean).slice(0, 3).map((feat, i) => (
                renderCreativeFeature(feat, i, "outline")
              ))}
            </div>
          </div>
 
          <div className="col-span-7 flex items-center justify-center h-full relative z-10" style={{ transform: "rotate(-1.5deg) scale(0.98)" }}>
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 to-transparent blur-3xl opacity-30 pointer-events-none" />
            <ScreenshotMockup maxHeight="520px" />
          </div>
        </div>
      )}

      {/* 3. PRODUCT SHOWCASE LAYOUT (FAIRE DISCOVERY INSPIRED) */}
      {template === "showcase" && (
        <div className="h-full grid grid-cols-12 gap-10 px-20 py-16 font-serif-elegant relative items-center">
          {/* Subtle soft noise/grid effect or elegant border for editorial feel */}
          <div className="absolute inset-8 border border-stone-200/40 pointer-events-none z-0" />
          
          {/* Left Side: Serif Copy & Brand */}
          <div className="col-span-6 flex flex-col justify-between h-full py-8 pr-8 z-10">
            {/* Top Logo */}
            <div className="flex items-center gap-3 text-[15px] font-black tracking-[0.3em] uppercase font-serif-elegant" style={{ color: textColor }}>
              <FMonogramIcon size={28} />
              <span>{appName || "FAIRE"}</span>
            </div>
 
            {/* Mid Headline */}
            <div className="my-auto py-4">
              <h1 className="text-[60px] font-black leading-[1.15] font-serif-elegant mb-5" style={{ color: textColor }}>
                {renderHeadline(headline, "showcase")}
              </h1>
              <p className="text-[20px] mt-6 leading-relaxed font-sans font-medium"
                 style={{ color: isDark ? "rgba(248, 250, 252, 0.7)" : "#5A5450" }}>
                {subheadline}
              </p>
            </div>
 
            {/* Bottom Features */}
            <div className="flex flex-col gap-4.5">
              {features.filter(Boolean).slice(0, 3).map((feat, i) => (
                renderCreativeFeature(feat, i, "serif")
              ))}
            </div>
          </div>
 
          {/* Right Side: Desktop Mockup Frame (Tablet scale/rotation) */}
          <div className="col-span-6 flex items-center justify-center h-full z-10" style={{ transform: "rotate(1.5deg) scale(0.96)" }}>
            <ScreenshotMockup maxHeight="520px" />
          </div>
        </div>
      )}

      {/* 4. ENTERPRISE LAYOUT (SHIPWAY INSPIRED) */}
      {template === "enterprise" && (
        <div className="h-full grid grid-cols-12 gap-10 px-20 py-12 font-sans-outfit relative items-center"
             style={{
               backgroundImage: isDark 
                 ? 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)' 
                 : 'linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
               backgroundSize: '30px 30px'
             }}>
          {/* Radial glow */}
          <div className="absolute right-0 top-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
 
          {/* Left Side: Brand, Copy, Features */}
          <div className="col-span-5 flex flex-col justify-between h-full py-6 pr-4 z-10">
            <div>
              {/* Brand Logo representation */}
              <div className="flex items-center gap-2.5 font-black text-lg mb-6 tracking-wide font-sans-outfit" style={{ color: textColor }}>
                <IsometricBoxIcon size={32} />
                <span className="uppercase tracking-widest text-sm">{appName || "Shipway"}</span>
              </div>
 
              {/* Headline */}
              <h1 className="text-[62px] font-black leading-[1.1] tracking-tight font-sans-outfit" style={{ color: textColor }}>
                {renderHeadline(headline, "enterprise")}
              </h1>
              <p className="text-[20px] mt-4 leading-relaxed font-sans-outfit font-medium"
                 style={{ color: isDark ? "rgba(248, 250, 252, 0.75)" : "#2563EB" }}>
                {subheadline}
              </p>
            </div>
 
            {/* Creative Features list */}
            <div className="flex flex-col gap-4.5 mt-6">
              {features.filter(Boolean).slice(0, 3).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="size-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
                       style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" }}>
                    <span className="flex items-center justify-center">
                      {idx === 0 ? <LightningIcon size={18} /> : idx === 1 ? <BellIcon size={18} /> : <ShieldIcon size={18} />}
                    </span>
                  </div>
                  <div className="font-sans-outfit">
                    <span className="text-[17px] font-extrabold block" style={{ color: textColor }}>{feat}</span>
                    <span className="text-[12px] opacity-65" style={{ color: textColor }}>Auto-configured in realtime</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Right Side: Carrier Badges + Browser Frame */}
          <div className="col-span-7 flex flex-col justify-center h-full z-10 pl-2">
            {/* Integration Carrier Grid */}
            <div className="p-4 border rounded-2xl flex flex-col gap-2.5 shadow-2xl mb-4 w-full select-none"
                 style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
              <div className="text-[9px] font-mono tracking-widest font-extrabold uppercase opacity-60" style={{ color: textColor }}>INTEGRATED WAREHOUSE PARTNERS</div>
              <div className="grid grid-cols-4 gap-2">
                {["DHL Express", "FedEx Hub", "UPS Ship", "USPS Postal", "Aramex Logistics", "BlueDart Hub", "DPD Group", "RoyalMail"].map((c, idx) => (
                  <div key={idx} className={`px-2 py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center shadow-sm border leading-none font-sans-outfit ${
                    isDark ? "bg-white/10 border-white/5 text-white" : "bg-white border-gray-100 text-gray-800"
                  }`}>
                    {c}
                  </div>
                ))}
              </div>
            </div>
 
            {/* Screenshot in Frame */}
            <div className="w-full scale-95 origin-right">
              <ScreenshotMockup maxHeight="520px" />
            </div>
          </div>
        </div>
      )}

      {/* 5. SHOPIFY GROWTH LAYOUT */}
      {template === "growth" && (
        <div className="h-full flex flex-col justify-between px-20 py-12 font-sans-jakarta relative"
             style={{
               backgroundImage: isDark 
                 ? 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)' 
                 : 'linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
               backgroundSize: '35px 35px'
             }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: isDark ? "#021A11" : "transparent", opacity: isDark ? 0.75 : 0 }} />
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
 
          <div className="flex items-center justify-between mt-0 z-10">
            <div className="max-w-3xl">
              <h1 className="text-[64px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
                {renderHeadline(headline, "growth")}
              </h1>
              <p className="text-[22px] opacity-90 mt-4 max-w-2xl font-bold leading-relaxed font-sans-jakarta"
                 style={{ color: isDark ? "#A7F3D0" : "#065F46" }}>
                {subheadline}
              </p>
            </div>
            
            <div className="flex items-center gap-3.5 px-5 py-3 rounded-2xl border shrink-0 shadow-lg select-none"
                 style={{ borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(6,95,70,0.15)", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(6,95,70,0.04)" }}>
              <GrowthChartIcon size={44} />
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "#10B981" }}>Merchant Growth</div>
                <div className="text-[14px] font-black" style={{ color: textColor }}>Shopify Plus Ready</div>
              </div>
            </div>
          </div>
 
          <div className="w-[700px] mx-auto my-3 relative shadow-2xl z-10 scale-[0.98]">
            <div className="absolute inset-0 rounded-2xl filter blur-3xl opacity-15" style={{ background: colors.accent }} />
            <div className="relative">
              <ScreenshotMockup maxHeight="340px" />
            </div>
          </div>
 
          <div className="grid grid-cols-3 gap-5 mb-0 z-10">
            {features.filter(Boolean).slice(0, 3).map((feat, i) => (
              <div key={i} className="flex gap-3.5 items-center px-6 py-4 rounded-2xl border shadow-md font-bold text-sm"
                   style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.85)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}>
                <CheckCircleIcon size={22} />
                <span className="text-[17px] font-black" style={{ color: textColor }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FALLBACK V1 TEMPLATES */}
      {template === "hero" && (
        <div className="h-full flex flex-col justify-between items-center text-center px-20 py-12 font-sans-jakarta relative">
          <div className="absolute top-[10%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
          
          <div className="max-w-5xl mt-1 z-10">
            <h1 className="text-[64px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "hero")}
            </h1>
            <p className="text-[22px] mt-4 max-w-2xl mx-auto leading-relaxed font-bold font-sans-jakarta"
               style={{ color: isDark ? "rgba(248, 250, 252, 0.7)" : "#4B5563" }}>
              {subheadline}
            </p>
          </div>
 
          <div className="w-[720px] my-3 shadow-2xl z-10 transition-transform duration-500 hover:scale-[1.01]">
            <ScreenshotMockup maxHeight="380px" />
          </div>
 
          <div className="flex justify-center gap-4 mb-2 z-10">
            {features.filter(Boolean).map((feat, i) => (
              <div
                key={i}
                className="px-6 py-3 rounded-xl text-[16px] font-black tracking-wide border shadow-sm flex items-center gap-2.5"
                style={{
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : `${colors.accent}40`,
                  background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  color: textColor
                }}
              >
                <div className="size-2.5 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: colors.accent }} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {template === "sidebyside" && (
        <div className="h-full flex flex-col justify-between px-20 py-12 font-sans-jakarta relative">
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
          
          <div className="max-w-5xl mt-2 z-10">
            <h1 className="text-[64px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "sidebyside")}
            </h1>
            <p className="text-[22px] mt-4 max-w-3xl leading-relaxed font-bold font-sans-jakarta"
               style={{ color: isDark ? "rgba(248, 250, 252, 0.7)" : "#4B5563" }}>
              {subheadline}
            </p>
          </div>
 
          <div className="grid grid-cols-12 gap-10 items-center flex-1 my-4 z-10">
            <div className="col-span-7 scale-[0.98] origin-left">
              <ScreenshotMockup maxHeight="460px" />
            </div>
 
            <div className="col-span-5 flex flex-col gap-4.5">
              {features.filter(Boolean).map((feat, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border flex items-start gap-4.5 shadow-md"
                  style={{
                    borderLeft: `4px solid ${colors.accent}`,
                    background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                  }}
                >
                  <div
                    className="size-11 rounded-full font-mono text-[16px] font-black flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: colors.accent, color: isDark ? "#0F172A" : "#FFFFFF" }}
                  >
                    {i+1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[19px] mb-1" style={{ color: textColor }}>{feat}</h3>
                    <p className="text-[13px] opacity-70 leading-relaxed" style={{ color: textColor }}>Designed for maximum storefront conversion.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
 
      {template === "spotlight" && (
        <div className="h-full flex flex-col justify-between items-center text-center px-20 py-12 font-sans-jakarta relative">
          <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />
          
          <div className="max-w-5xl mt-1 z-10">
            <h1 className="text-[64px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "spotlight")}
            </h1>
            <p className="text-[22px] mt-4 max-w-2xl mx-auto leading-relaxed font-bold font-sans-jakarta"
               style={{ color: isDark ? "rgba(248, 250, 252, 0.7)" : "#4B5563" }}>
              {subheadline}
            </p>
          </div>
 
          <div className="grid grid-cols-3 gap-5 w-full my-4 z-10">
            {features.filter(Boolean).map((feat, i) => (
              <div
                key={i}
                className="p-5.5 rounded-2xl border text-center flex flex-col justify-center items-center shadow-md"
                style={{
                  background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                }}
              >
                <div className="mb-2.5 size-11 rounded-full flex items-center justify-center font-mono font-black text-[16px] shadow-sm"
                     style={{ background: isDark ? "rgba(255,255,255,0.06)" : `${colors.accent}15`, color: colors.accent }}>
                  0{i+1}
                </div>
                <h3 className="font-extrabold text-[19px]" style={{ color: textColor }}>{feat}</h3>
              </div>
            ))}
          </div>
 
          <div className="w-[700px] overflow-hidden rounded-t-2xl border-t border-x border-white/10 mt-auto z-10 scale-[0.98]">
            <ScreenshotMockup maxHeight="320px" />
          </div>
        </div>
      )}
 
      {template === "modernsaas" && (
        <div className="h-full flex flex-col justify-between relative px-20 py-16 font-sans-jakarta">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          
          <div className="max-w-5xl mt-2 z-10">
            <h1 className="text-[64px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "modernsaas")}
            </h1>
            <p className="text-[22px] mt-4 max-w-2xl leading-relaxed font-bold font-sans-jakarta"
               style={{ color: isDark ? "rgba(248, 250, 252, 0.7)" : "#4B5563" }}>
              {subheadline}
            </p>
          </div>
 
          <div className="w-[820px] mx-auto mt-6 relative z-10 scale-[0.98]">
            <ScreenshotMockup maxHeight="380px" />
 
            <div
              className="absolute -left-12 bottom-12 p-4 rounded-2xl border shadow-2xl flex items-center gap-4 z-20 backdrop-blur-md"
              style={{
                minWidth: 240,
                background: isDark ? "rgba(24, 25, 34, 0.85)" : "rgba(255, 255, 255, 0.85)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"
              }}
            >
              <div className="size-11 rounded-full flex items-center justify-center font-bold" style={{ background: isDark ? "rgba(255,255,255,0.06)" : `${colors.accent}20` }}>
                <svg className="size-5" style={{ color: colors.accent }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] opacity-60 uppercase font-mono tracking-widest" style={{ color: textColor }}>{features[0] || "Feature"}</p>
                <h4 className="text-[17px] font-black" style={{ color: textColor }}>Conversion Stats</h4>
              </div>
            </div>
 
            <div
              className="absolute -right-12 bottom-20 p-4 rounded-2xl border shadow-2xl flex items-center gap-4 z-20 backdrop-blur-md"
              style={{
                minWidth: 240,
                background: isDark ? "rgba(24, 25, 34, 0.85)" : "rgba(255, 255, 255, 0.85)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"
              }}
            >
              <div className="size-11 rounded-full flex items-center justify-center font-bold" style={{ background: isDark ? "rgba(255,255,255,0.06)" : `${colors.accent}20` }}>
                <svg className="size-5" style={{ color: colors.accent }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c-.107-.196-.272-.348-.48-.432A1.493 1.493 0 0010.5 3a1.5 1.5 0 00-1.5 1.5c0 .328.106.63.287.876" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] opacity-60 uppercase font-mono tracking-widest" style={{ color: textColor }}>{features[1] || "Active"}</p>
                <h4 className="text-[17px] font-black" style={{ color: textColor }}>Verified Design</h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopifyStoreListingPreview({
  appName,
  category,
  colors,
  isMobile,
  renderCanvasContent,
}: {
  appName: string;
  category: string;
  colors: { bg: string; primary: string; accent: string };
  isMobile: boolean;
  renderCanvasContent: (scale: number) => React.ReactNode;
}) {
  if (isMobile) {
    return (
      <div className="w-[360px] bg-[#f9fafb] border border-border rounded-[36px] overflow-hidden shadow-2xl flex flex-col font-sans text-black relative mx-auto my-4 min-h-[640px] pb-6">
        {/* Mobile Status Bar */}
        <div className="bg-white px-6 py-3 flex justify-between items-center text-xs font-semibold text-gray-500 border-b border-gray-100">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center">
            <span className="size-2 bg-gray-400 rounded-full" />
            <span className="size-2 bg-gray-400 rounded-full" />
            <span className="w-4 h-2 border border-gray-400 rounded-sm" />
          </div>
        </div>

        {/* Shopify App Store Mobile Header */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-[#008060] rounded-lg flex items-center justify-center text-white font-extrabold text-sm">s</div>
            <span className="font-semibold text-sm text-gray-800">App Store</span>
          </div>
          <svg className="size-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* App Hero Details */}
        <div className="p-5 bg-white flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="size-16 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-md uppercase select-none shrink-0"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
              {appName ? appName.slice(0, 2) : "SM"}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight text-gray-900">{appName || "Screenify App"}</h2>
              <p className="text-xs text-gray-500 mt-0.5">by Screenify Solutions</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                <span className="text-yellow-500">★★★★★</span>
                <span className="font-semibold">5.0</span>
                <span className="text-gray-400">(142 reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button className="w-full bg-[#008060] hover:bg-[#006e52] text-white font-semibold py-2.5 rounded-lg text-sm transition">
              Install app
            </button>
            <p className="text-[10px] text-gray-400 text-center">Free plan available · 14-day trial</p>
          </div>
        </div>

        {/* Carousel Preview Section */}
        <div className="px-5 py-6 bg-white mt-2 flex-1 flex flex-col justify-start">
          <h3 className="font-bold text-sm text-gray-800 mb-3">Media Gallery</h3>
          
          <div className="w-full overflow-hidden flex justify-center">
            {renderCanvasContent(320 / 1600)}
          </div>

          <div className="flex justify-center gap-1.5 mt-3">
            <span className="size-1.5 bg-[#008060] rounded-full" />
            <span className="size-1.5 bg-gray-200 rounded-full" />
            <span className="size-1.5 bg-gray-200 rounded-full" />
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wide mb-1">Key App Category</h4>
            <p className="text-xs text-gray-600 capitalize bg-gray-100 px-2.5 py-1 rounded w-fit font-mono">{category || "Shopify Utilities"}</p>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Preview
  return (
    <div className="w-full max-w-[840px] bg-[#f4f6f8] border border-border rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans text-black relative mx-auto my-4 pb-8 min-h-[500px]">
      {/* Shopify App Store Top Header */}
      <div className="bg-white px-8 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-[#008060] rounded-lg flex items-center justify-center text-white font-extrabold text-lg">s</div>
          <span className="font-semibold text-lg text-gray-800">Shopify App Store</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-600 font-medium">
          <span>Solutions</span>
          <span>Pricing</span>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400">
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              readOnly
              placeholder="Search apps"
              className="bg-gray-100 border border-transparent rounded-full py-1.5 pl-9 pr-4 text-xs w-[180px] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="mx-8 mt-8 bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
        <div className="flex gap-6 items-start">
          <div className="size-20 rounded-2xl flex items-center justify-center font-bold text-3xl text-white shadow-md uppercase select-none shrink-0"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
            {appName ? appName.slice(0, 2) : "SM"}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-2xl text-gray-900 leading-tight">{appName || "Screenify App"}</h2>
                <p className="text-sm text-gray-500 mt-1">by <span className="underline cursor-pointer text-gray-600">Screenify Solutions</span></p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-sm text-gray-800 font-medium">
                  <span className="text-yellow-500">★★★★★</span>
                  <span>5.0</span>
                  <span className="text-gray-400">(142 reviews)</span>
                </div>
                <span className="text-xs text-gray-400 mt-1 font-mono uppercase bg-gray-100 px-2 py-0.5 rounded">{category || "Shopify Utilities"}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button className="bg-[#008060] hover:bg-[#006e52] text-white font-semibold px-8 py-2.5 rounded-lg text-sm transition">
                Install app
              </button>
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">Free plan available</span> · 14-day free trial
              </div>
            </div>
          </div>
        </div>

        {/* Media Carousel */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-base text-gray-800">Media gallery</h3>
            <span className="text-xs text-[#008060] font-semibold cursor-pointer hover:underline">View All</span>
          </div>

          <div className="flex gap-4 items-center overflow-hidden">
            <div className="shrink-0">
              {renderCanvasContent(600 / 1600)}
            </div>
            <div className="w-[180px] h-[100px] bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-center text-gray-300 font-mono text-[9px] uppercase tracking-wider">
              Screenshot 2
            </div>
          </div>

          <div className="flex justify-start gap-1.5 mt-4 ml-2">
            <span className="size-2 bg-[#008060] rounded-full" />
            <span className="size-2 bg-gray-200 rounded-full" />
            <span className="size-2 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Results({
  result,
  preview,
  paid,
  onPaid,
  onReset,
  email,
  extractedColors,
}: {
  result: Result;
  preview: string | null;
  paid: boolean;
  onPaid: () => void;
  onReset: () => void;
  email: string;
  extractedColors: { bg: string; primary: string; accent: string };
}) {
  const [template, setTemplate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("screenmint_template") || "showcase";
    }
    return "showcase";
  });
  const [stylePreset, setStylePreset] = useState<"modern" | "minimal" | "gradient" | "dark">((() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("screenmint_stylePreset") as any) || "modern";
    }
    return "modern";
  })());
  const [variant, setVariant] = useState<"feature" | "benefit" | "outcome">((() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("screenmint_variant") as any) || "feature";
    }
    return "feature";
  })());
  const [previewMode, setPreviewMode] = useState<"editor" | "shopify_desktop" | "shopify_mobile">("editor");

  const [headline, setHeadline] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("screenmint_headline") || "";
    }
    return "";
  });
  const [subheadline, setSubheadline] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("screenmint_subheadline") || "";
    }
    return "";
  });
  const [features, setFeatures] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_features");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return ["", "", ""];
  });
  const [colors, setColors] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_colors");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return extractedColors;
  });
  const [downloading, setDownloading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1600,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_template", template);
    }
  }, [template]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_stylePreset", stylePreset);
    }
  }, [stylePreset]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_variant", variant);
    }
  }, [variant]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_headline", headline);
    }
  }, [headline]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_subheadline", subheadline);
    }
  }, [subheadline]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_features", JSON.stringify(features));
    }
  }, [features]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("screenmint_colors", JSON.stringify(colors));
    }
  }, [colors]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const availableWidth = windowSize.width - 48;
  const availableHeight = windowSize.height - 120; // Accounts for floating footer and padding
  const fullscreenScale = Math.max(0.1, Math.min(0.98, availableWidth / 1600, availableHeight / 900));

  // Auto-set the suggested template from AI analysis, and extract colors (only on new session or if empty)
  useEffect(() => {
    if (result) {
      const isNewSession = typeof window !== "undefined" && localStorage.getItem("screenmint_is_new_session") === "true";
      const hasSavedTemplate = typeof window !== "undefined" && localStorage.getItem("screenmint_template");

      if (isNewSession || !hasSavedTemplate) {
        if (result.suggestedTemplate) {
          setTemplate(result.suggestedTemplate);
        }
        setColors(extractedColors);
      }
    }
  }, [result, extractedColors]);

  // Sync with AI copy variants when user toggles Feature/Benefit/Outcome tabs
  // But skip it if we are just loading from a page refresh (not a new session)
  useEffect(() => {
    if (result && result.variants) {
      const isNewSession = typeof window !== "undefined" && localStorage.getItem("screenmint_is_new_session") === "true";

      if (isInitialMount.current) {
        isInitialMount.current = false;
        if (!isNewSession) {
          // Skip initial sync on page refresh, to preserve custom edits from localStorage
          return;
        }
      }

      // Otherwise (new session or tab clicked), sync with AI variants
      const activeCopy = result.variants[variant];
      if (activeCopy) {
        setHeadline(activeCopy.headline || "");
        setSubheadline(activeCopy.subheadline || "");
        setFeatures(activeCopy.features || ["", "", ""]);
      }

      // Once synchronized for new session, clear the is_new_session flag
      if (isNewSession) {
        localStorage.removeItem("screenmint_is_new_session");
      }
    }
  }, [result, variant]);

  const handleDownload = async () => {
    const node = document.getElementById("export-node");
    if (!node) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(node, {
        width: 1600,
        height: 900,
        pixelRatio: 3, // Triple resolution for ultra-crisp output (4800x2700 px)
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${result?.appName?.toLowerCase() || "screenmint"}-promo-${variant}.png`;
      a.click();
      
      if (!paid) {
        toast.info("Downloaded watermarked preview. Click 'Unlock All' to remove the watermark!");
      } else {
        toast.success("High-res unwatermarked PNG downloaded!");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to generate download image.");
    } finally {
      setDownloading(false);
    }
  };

  const updateFeature = (index: number, val: string) => {
    setFeatures((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const renderCanvasContent = (scale: number, watermarkOverride?: boolean) => (
    <div style={{ width: 1600 * scale, height: 900 * scale, overflow: "hidden" }} className="relative bg-card rounded-xl border border-border shadow-md select-none">
      <div
        style={{
          width: 1600,
          height: 900,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          left: 0,
          top: 0
        }}
      >
        <TemplateCanvas
          template={template}
          stylePreset={stylePreset}
          headline={headline}
          subheadline={subheadline}
          features={features}
          colors={colors}
          screenshot={preview || ""}
          watermark={false}
          appName={result?.appName || "app"}
        />
      </div>
    </div>
  );

  return (
    <div className="rise flex flex-col lg:flex-row gap-8 items-start min-h-[60vh]">
      {/* Visual Preview Side */}
      <div className="flex-1 w-full lg:sticky lg:top-8 flex flex-col items-center">
        {/* Preview Mode Selector Tabs */}
        <div className="mb-6 flex gap-1 bg-muted p-1 rounded-xl text-xs font-mono w-fit border border-border">
          {[
            { id: "editor", label: "Interactive Editor" },
            { id: "shopify_desktop", label: "Shopify Desktop Listing" },
            { id: "shopify_mobile", label: "Shopify Mobile Listing" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setPreviewMode(m.id as any)}
              className={`py-1.5 px-3 rounded-lg transition-all font-semibold ${
                previewMode === m.id
                  ? "bg-[#008060] text-white font-bold shadow-sm"
                  : "text-muted-foreground hover:bg-card"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Display depending on previewMode */}
        <div className="w-full flex justify-center">
          {previewMode === "editor" && (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-2xl max-w-full group">
              {renderCanvasContent(0.44)}
              
              {/* Fullscreen View Trigger */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-3.5 py-2 rounded-full text-xs font-mono font-semibold tracking-wide shadow-lg flex items-center gap-1.5 transition md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 z-40 border border-white/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Fullscreen View
              </button>
            </div>
          )}

          {previewMode === "shopify_desktop" && (
            <ShopifyStoreListingPreview
              appName={result?.appName || ""}
              category={result?.category || ""}
              colors={colors}
              isMobile={false}
              renderCanvasContent={(s) => renderCanvasContent(s)}
            />
          )}

          {previewMode === "shopify_mobile" && (
            <ShopifyStoreListingPreview
              appName={result?.appName || ""}
              category={result?.category || ""}
              colors={colors}
              isMobile={true}
              renderCanvasContent={(s) => renderCanvasContent(s)}
            />
          )}
        </div>

        {/* Info label under preview */}
        <p className="mt-4 text-xs font-mono text-muted-foreground text-center">
          Rendered directly in your browser. Pixel-perfect 1600x900px export.
        </p>

        {/* Hidden Export Node */}
        <div style={{ width: 0, height: 0, overflow: "hidden", position: "absolute", pointerEvents: "none" }}>
          <div
            id="export-node"
            style={{
              width: 1600,
              height: 900,
              position: "relative",
            }}
          >
            <TemplateCanvas
              template={template}
              stylePreset={stylePreset}
              headline={headline}
              subheadline={subheadline}
              features={features}
              colors={colors}
              screenshot={preview || ""}
              watermark={false}
              appName={result?.appName || ""}
            />
          </div>
        </div>


      </div>

      {/* Editor & Control Panel Side */}
      <div className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-lime bg-lime/10 px-2 py-0.5 rounded">
              Creative Suite
            </span>
            <h2 className="font-display text-3xl mt-1">Design Studio</h2>
          </div>
          <button
            onClick={onReset}
            className="rounded-full border border-border px-4 py-2 text-xs hover:bg-card transition"
          >
            ← New Upload
          </button>
        </div>

        {/* Copy Angle Variant Tabs */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">
            1. Copy Variant Angle (A/B Options)
          </label>
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg text-xs font-mono">
            {(["feature", "benefit", "outcome"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={`py-2 px-2 rounded-md transition capitalize font-semibold ${
                  variant === v
                    ? "bg-lime text-ink font-bold shadow-sm"
                    : "text-muted-foreground hover:bg-card"
                }`}
              >
                {v} angle
              </button>
            ))}
          </div>
        </div>

        {/* Layout Template Selector */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">
            2. Select Layout Template
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
            {[
              { id: "executive", label: "Executive SaaS" },
              { id: "conversion", label: "Conversion Focused" },
              { id: "showcase", label: "Product Showcase" },
              { id: "enterprise", label: "Enterprise Grid" },
              { id: "growth", label: "Shopify Growth" },
              { id: "hero", label: "V1 Hero" },
              { id: "sidebyside", label: "V1 Split" },
              { id: "spotlight", label: "V1 Spotlight" },
              { id: "modernsaas", label: "V1 Modern SaaS" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`py-2 px-3 rounded-lg border text-left transition flex items-center justify-between ${
                  template === t.id
                    ? "border-lime bg-lime/10 text-lime font-bold"
                    : "border-border hover:bg-card text-muted-foreground"
                }`}
              >
                <span>{t.label}</span>
                {result?.suggestedTemplate === t.id && (
                  <span className="text-[9px] bg-lime/20 text-lime px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90">Auto</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Annotations removed */}

        {/* Style Selector */}
        <div className="border-t border-border pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">
            3. Select Style Preset
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              { id: "modern", label: "Modern Preset" },
              { id: "minimal", label: "Minimal White" },
              { id: "gradient", label: "Dynamic Gradient" },
              { id: "dark", label: "High Contrast Dark" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStylePreset(s.id as any)}
                className={`py-2 px-3 rounded-lg border text-left transition ${
                  stylePreset === s.id
                    ? "border-lime bg-lime/10 text-lime"
                    : "border-border hover:bg-card"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Settings */}
        <div className="space-y-4 border-t border-border pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">
            4. Modify Marketing Copy
          </label>
          <div>
            <label className="block text-[10px] opacity-60 mb-1">Headline (Max 6 words recommended)</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50"
            />
          </div>
          <div>
            <label className="block text-[10px] opacity-60 mb-1">Subheadline (Max 15 words recommended)</label>
            <textarea
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] opacity-60">Feature Callouts (Max 5 words each)</label>
            {features.map((feat, idx) => (
              <input
                key={idx}
                type="text"
                value={feat}
                onChange={(e) => updateFeature(idx, e.target.value)}
                placeholder={`Feature Callout 0${idx+1}`}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50"
              />
            ))}
          </div>
        </div>

        {/* Color Settings */}
        {stylePreset !== "minimal" && stylePreset !== "dark" && (
          <div className="space-y-3 border-t border-border pt-4">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              5. Custom Color Palette
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] opacity-60 mb-1">Background</label>
                <input
                  type="color"
                  value={colors.bg}
                  onChange={(e) => setColors((prev) => ({ ...prev, bg: e.target.value }))}
                  className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] opacity-60 mb-1">Text/Primary</label>
                <input
                  type="color"
                  value={colors.primary}
                  onChange={(e) => setColors((prev) => ({ ...prev, primary: e.target.value }))}
                  className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] opacity-60 mb-1">Accent</label>
                <input
                  type="color"
                  value={colors.accent}
                  onChange={(e) => setColors((prev) => ({ ...prev, accent: e.target.value }))}
                  className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions & Export Panel */}
        <div className="border-t border-border pt-6 mt-4 space-y-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-lime text-ink font-semibold py-3.5 text-base hover:opacity-90 transition lime-glow disabled:opacity-60"
          >
            {downloading ? (
              "Generating PNG..."
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                {paid ? "Export High-Res PNG" : "Download Preview PNG"}
              </>
            )}
          </button>

          <div className="rounded-xl bg-lime/10 border border-lime/20 p-3 text-center text-xs font-mono text-lime">
            ✓ Free High-Res Export Enabled (Development Mode)
          </div>
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        onSuccess={onPaid}
        email={email}
      />

      {/* Fullscreen Modal Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-neutral-950/98 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
          {/* Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 z-50 size-12 rounded-full bg-neutral-900/80 hover:bg-neutral-850 text-white flex items-center justify-center border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl text-lg hover:border-white/20"
            aria-label="Close fullscreen preview"
          >
            ✕
          </button>

          {/* Modal Content - Scaled Canvas */}
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 shadow-3xl max-w-full max-h-full">
              {renderCanvasContent(fullscreenScale)}
            </div>
          </div>

          {/* Floating Control Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 p-2 bg-neutral-900/90 backdrop-blur-md rounded-full border border-white/10 shadow-2xl w-full max-w-md hover:border-white/20 transition-colors">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-lime text-ink font-semibold py-3 hover:opacity-90 transition disabled:opacity-60 text-xs animate-pulse"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              {paid ? "Export High-Res PNG" : "Download Preview PNG"}
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 transition text-xs text-center"
            >
              Back to Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "What exactly does Screenify do?",
    a: "You upload one screenshot of your Shopify app, and Screenify automatically extracts your app's brand colors and uses GPT-4o vision to generate high-converting headlines and subheadlines. It then renders a pixel-perfect, browser-ready promo screenshot using predefined layouts (1600×900).",
  },
  {
    q: "Do I need any design experience?",
    a: "None at all. Just drop your screenshot, and Screenify handles composition, copy, colors, and visual alignment. You can customize the results directly using the built-in editor.",
  },
  {
    q: "Are the screenshots modified?",
    a: "No. Unlike AI image generators that distort UI and text, Screenify preserves your original screenshot exactly as uploaded, wrapping it in a professional mockup frame.",
  },
  {
    q: "What is the resolution of the downloaded files?",
    a: "All files are exported at exactly 1600×900 pixels, which is the recommended dimension for Shopify App Store desktop screenshot listings.",
  },
  {
    q: "Can I customize the colors and text?",
    a: "Yes! The live preview editor allows you to choose layout templates, styles, customize colors, and adjust headlines and copy directly.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center mb-12">
        <p className="font-mono text-xs tracking-widest text-lime uppercase mb-3">Got questions?</p>
        <h2 className="font-display text-4xl md:text-5xl">Frequently asked</h2>
      </div>
      <div className="flex flex-col divide-y divide-border border border-border rounded-2xl overflow-hidden">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="font-medium text-base">{item.q}</span>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full border border-border grid place-items-center transition-transform duration-200"
                style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
            {open === i && (
              <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
