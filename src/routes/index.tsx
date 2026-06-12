import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState, useEffect, cloneElement } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { generatePromos } from "@/lib/generate.functions";
import { useTheme } from "@/hooks/use-theme";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Footer } from "@/components/Footer";
import { LandingPage } from "@/components/LandingPage";
import { extractFromDataUrl } from "@/lib/extract-palette";
import * as htmlToImage from "html-to-image";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon, Settings as SettingsIcon, LogOut } from "lucide-react";

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

        // Convert to WebP for modern compression at high quality (0.90)
        let resultDataUrl = canvas.toDataURL("image/webp", 0.90);

        // If webp is not supported (reverts to PNG) or if output is still large, fallback to high-quality JPEG (0.90)
        if (resultDataUrl.startsWith("data:image/png") || resultDataUrl.length > 1.5 * 1024 * 1024) {
          resultDataUrl = canvas.toDataURL("image/jpeg", 0.90);
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
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const email = user?.email;
    if (email) {
      setForm((prev) => ({ ...prev, email }));
    }
  }, [user]);

  const [previews, setPreviews] = useState<(string | null)[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_previews");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 6) return parsed;
        } catch {}
      }
    }
    return Array(6).fill(null);
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
      return saved === "true"; // default to false
    }
    return false;
  });

  const [logo, setLogo] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("screenmint_logo");
    }
    return null;
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | undefined>(undefined);

  const [extractedColors, setExtractedColors] = useState<{ bg: string; primary: string; secondary: string; accent: string }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_extractedColors");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            bg: parsed.bg || "#F5F1E8",
            primary: parsed.primary || "#121212",
            secondary: parsed.secondary || "#6B7280",
            accent: parsed.accent || "#C8E84A",
          };
        } catch {}
      }
    }
    return {
      bg: "#F5F1E8",
      primary: "#121212",
      secondary: "#6B7280",
      accent: "#C8E84A",
    };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("screenmint_previews", JSON.stringify(previews));
      } catch (e) {
        console.warn("localStorage quota exceeded for previews", e);
      }
    }
  }, [previews]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (logo) {
          localStorage.setItem("screenmint_logo", logo);
        } else {
          localStorage.removeItem("screenmint_logo");
        }
      } catch (e) {
        console.warn("localStorage quota exceeded for logo icon", e);
      }
    }
  }, [logo]);

  const handleUpload = useCallback(async (files: FileList | File[], slotIndex?: number) => {
    if (!user) {
      toast.error("Please sign in to upload screenshots.");
      navigate({ to: "/login" });
      return;
    }
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const toastId = toast.loading(`Processing ${fileArray.length} screenshot(s)...`);
    try {
      const processedDataUrls: string[] = [];

      for (const file of fileArray) {
        if (!file.type.startsWith("image/")) {
          toast.error(`"${file.name}" is not an image.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`"${file.name}" is too large (>10MB).`);
          continue;
        }

        const dataUrl = await readAsDataURL(file);
        const img = await loadImage(dataUrl);

        // Perform blur checking
        const isBlurry = detectBlur(img);
        if (isBlurry) {
          toast.warning(`"${file.name}" is slightly blurry, but loading it anyway.`, { duration: 4000 });
        }

        const compressed = await compressImage(dataUrl).catch(() => dataUrl);
        processedDataUrls.push(compressed);
      }

      setPreviews((prev) => {
        const next = [...prev];
        if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < 6) {
          if (processedDataUrls.length > 0) {
            next[slotIndex] = processedDataUrls[0];
          }
        } else {
          let pIdx = 0;
          for (let i = 0; i < 6 && pIdx < processedDataUrls.length; i++) {
            if (next[i] === null) {
              next[i] = processedDataUrls[pIdx++];
            }
          }
          if (pIdx < processedDataUrls.length) {
            for (let i = 0; i < 6 && pIdx < processedDataUrls.length; i++) {
              next[i] = processedDataUrls[pIdx++];
            }
          }
        }
        return next;
      });

      setResult(null);
      setPaid(false); // default mock checkout state
      setStatus("preview");
      toast.dismiss(toastId);
      toast.success("Screenshots loaded successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to process image files.");
      console.error(err);
    }
  }, [user, navigate]);

  const handleGenerate = useCallback(async () => {
    const activeScreens = previews.filter((p): p is string => p !== null);
    if (activeScreens.length === 0) {
      toast.error("Please upload at least one screenshot first.");
      return;
    }
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
      const { palette, backgroundStyle } = await extractFromDataUrl(activeScreens[0], 5);
      const bg = palette[1] ?? "#F5F1E8";
      const primary = palette[0] ?? "#121212";
      const secondary = palette[3] ?? palette[1] ?? "#6B7280";
      const accent = palette[2] ?? "#C8E84A";
      setExtractedColors({ bg, primary, secondary, accent });

      const res = await generate({
        data: {
          imageDataUrls: activeScreens,
          email: form.email.trim(),
          appName: form.appName.trim(),
          targetAudience: form.targetAudience.trim(),
          objective: form.objective.trim(),
          palette,
          backgroundStyle,
        },
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("screenmint_is_new_session", "true");
      }

      setResult(res);
      setPaid(false); // require mock checkout for unwatermarked export
      setStatus("done");
      toast.success("Optimized screenshot sequence generated! Open the Design Studio below.");
    } catch (e) {
      setStatus("preview");
      toast.error(e instanceof Error ? e.message : "Optimization failed. Please try again.");
    }
  }, [generate, previews, form]);

  const onReset = useCallback(() => {
    setPreviews(Array(6).fill(null));
    setResult(null);
    setPaid(false);
    setLogo(null);
    setStatus("idle");
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      localStorage.removeItem("screenmint_previews");
      localStorage.removeItem("screenmint_status");
      localStorage.removeItem("screenmint_result");
      localStorage.removeItem("screenmint_form");
      localStorage.removeItem("screenmint_extractedColors");
      localStorage.removeItem("screenmint_paid");
      localStorage.removeItem("screenmint_logo");
      localStorage.removeItem("screenmint_is_new_session");
      
      localStorage.removeItem("screenmint_slide_configs");
      localStorage.removeItem("screenmint_template");
      localStorage.removeItem("screenmint_stylePreset");
      localStorage.removeItem("screenmint_variant");
      localStorage.removeItem("screenmint_headline");
      localStorage.removeItem("screenmint_subheadline");
      localStorage.removeItem("screenmint_features");
      localStorage.removeItem("screenmint_colors");
      localStorage.removeItem("screenmint_featureTextSize");
      localStorage.removeItem("screenmint_featureSpacing");
      localStorage.removeItem("screenmint_featureIconSize");
    }
  }, []);


  const showLanding = status === "idle" && previews.filter(p => p !== null).length === 0;

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

      <Nav 
        status={status} 
        onReset={onReset} 
        onPick={() => {
          if (!user) {
            toast.error("Please sign in to upload screenshots.");
            navigate({ to: "/login" });
          } else {
            fileRef.current?.click();
          }
        }} 
      />
      
      {showLanding ? (
        <LandingPage
          onPick={() => {
            if (!user) {
              toast.error("Please sign in to upload screenshots.");
              navigate({ to: "/login" });
            } else {
              fileRef.current?.click();
            }
          }}
          onDrop={handleUpload}
        />
      ) : (
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
          {(status === "preview" || (status === "idle" && previews.filter(p => p !== null).length > 0)) && (
            <Preview
              previews={previews}
              setPreviews={setPreviews}
              form={form}
              setForm={setForm}
              logo={logo}
              setLogo={setLogo}
              onGenerate={handleGenerate}
              onReset={onReset}
              handleUploadSlot={(files, slotIdx) => handleUpload(files, slotIdx)}
            />
          )}
          {status === "loading" && <Loading previews={previews} />}
          {status === "done" && result && (
            <Results
              result={result}
              previews={previews}
              setPreviews={setPreviews}
              logo={logo}
              paid={paid}
              onPaid={() => setPaid(true)}
              onReset={onReset}
              email={form.email}
              extractedColors={extractedColors}
            />
          )}
        </section>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleUpload(files);
          e.target.value = "";
        }}
      />
      {!showLanding && <FAQ />}
      <Footer onHomeClick={onReset} />
    </main>
  );
}

function Nav({ 
  status, 
  onReset, 
  onPick 
}: { 
  status: "idle" | "preview" | "loading" | "done"; 
  onReset: () => void; 
  onPick: () => void;
}) {
  const { theme, toggle } = useTheme();
  const { user, profile, logout } = useAuth();
  const showBack = status !== "idle";
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
        
        {/* Left side: Logo & Back Arrow */}
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer transition active:scale-95 text-foreground"
              title="Return to landing page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span className="hidden sm:inline">Back to Home</span>
            </button>
          )}
          
          <div 
            onClick={() => {
              if (showBack) {
                onReset();
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition"
            title={showBack ? "Back to Landing Page" : "Scroll to Top"}
          >
            <img
              src="/screenmint-icon.png"
              alt="Screenify icon"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Screen<span className="text-[#3ECFB2]">ify</span>
            </span>
          </div>
        </div>

        {/* Middle: Navigation Links (Desktop only) */}
        {!showBack && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a 
              href="#how-it-works" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); 
              }} 
              className="hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#pricing" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); 
              }} 
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a 
              href="#faq" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }); 
              }} 
              className="hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>
        )}

        {/* Right side: CTAs and Theme Toggle */}
        <div className="flex items-center gap-4 text-sm font-sans">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-xs font-semibold text-muted-foreground hover:text-white transition"
              >
                Dashboard
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full border border-border/80 p-0.5 focus:outline-none cursor-pointer">
                  {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                    <Avatar className="size-8">
                      <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                      <AvatarFallback>{(profile?.full_name || user?.user_metadata?.full_name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="size-8 rounded-full bg-[#3ECFB2]/15 text-[#3ECFB2] flex items-center justify-center text-xs font-bold font-mono">
                      {(profile?.full_name || user?.user_metadata?.full_name || "U").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0C0C0E] border border-border/60 text-white min-w-[160px] rounded-xl p-1.5 space-y-1">
                  <DropdownMenuItem className="rounded-lg text-xs hover:bg-[#3ECFB2]/15 hover:text-[#3ECFB2] cursor-pointer py-2 px-3">
                    <Link to="/dashboard" className="w-full h-full flex items-center gap-2">
                      <ImageIcon className="size-3.5" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg text-xs hover:bg-[#3ECFB2]/15 hover:text-[#3ECFB2] cursor-pointer py-2 px-3">
                    <Link to="/settings" className="w-full h-full flex items-center gap-2">
                      <SettingsIcon className="size-3.5" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/40 my-1" />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="rounded-lg text-xs hover:bg-red-500/10 hover:text-red-400 text-red-500 cursor-pointer py-2 px-3 flex items-center gap-2"
                  >
                    <LogOut className="size-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-xs text-muted-foreground hover:text-white transition font-semibold">
                Sign In
              </Link>
              {!showBack && (
                <button
                  onClick={onPick}
                  className="bg-emerald-600 dark:bg-[#3ECFB2] text-white dark:text-ink hover:opacity-90 font-semibold rounded-lg px-4 py-2 border-0 cursor-pointer text-xs"
                >
                  Get Started
                </button>
              )}
            </>
          )}
          
          <button
            onClick={toggle}
            className="inline-flex items-center justify-center rounded-full border border-border p-2.5 hover:bg-card transition cursor-pointer text-foreground"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}

function Hero({ onPick, onDrop }: { onPick: () => void; onDrop: (files: FileList) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="rise">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        For Shopify app developers
      </p>
      <h1 className="mt-4 font-display text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-tight text-balance">
        Optimized listings.
        <br />
        <span className="italic text-lime">Higher</span> install conversion.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
        Upload your app screenshots to receive an instant listing audit score and generate a category-optimized 5-6 screenshot sequence that converts merchants.
      </p>

      <div
        onClick={onPick}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = e.dataTransfer.files;
          if (files && files.length > 0) onDrop(files);
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
          <p className="font-display text-3xl mb-2">Drop your app screenshots (up to 6 files)</p>
          <p className="text-muted-foreground mb-6 text-sm">PNG, JPG, or WebP · drag files at once or upload separately</p>
          <button
            onClick={(e) => { e.stopPropagation(); onPick(); }}
            className="inline-flex items-center gap-2 rounded-full bg-lime text-ink font-semibold px-6 py-3 hover:opacity-90 transition lime-glow"
          >
            Choose files to upload
            <span className="font-mono text-xs opacity-70">↵</span>
          </button>
        </div>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        {[
          { n: "01", t: "Upload Screenshots", d: "Drop up to 6 screenshots. AI handles layout, margins, and resolution." },
          { n: "02", t: "Listing Audit Score", d: "Instantly score your listing against store conventions and guidelines." },
          { n: "03", t: "Optimize Sequence", d: "Generate category-targeted copywriting and templates for all 6 slots." },
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
  previews,
  setPreviews,
  form,
  setForm,
  logo,
  setLogo,
  onGenerate,
  onReset,
  handleUploadSlot,
}: {
  previews: (string | null)[];
  setPreviews: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  logo: string | null;
  setLogo: React.Dispatch<React.SetStateAction<string | null>>;
  onGenerate: () => void;
  onReset: () => void;
  handleUploadSlot: (files: FileList | File[], slotIndex: number) => void;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const slotFileRef = useRef<HTMLInputElement>(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  const update = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50 focus:border-lime transition";
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-bold";

  // Story Arc Roles
  const roles = [
    "Slide 1: Hook / Hero Benefit",
    "Slide 2: Problem & Solution",
    "Slide 3: Key Feature A",
    "Slide 4: Key Feature B",
    "Slide 5: Outcome / Proof",
    "Slide 6: Easy Setup & Trust"
  ];

  // Dynamic audit score calculation (rules-based client audit)
  const calculateAuditScore = () => {
    let score = 10; // baseline

    const uploadedCount = previews.filter(p => p !== null).length;
    // 1. Screenshot Sequence (max 25 pts)
    if (uploadedCount === 1) score += 5;
    else if (uploadedCount === 2) score += 10;
    else if (uploadedCount === 3) score += 15;
    else if (uploadedCount === 4) score += 20;
    else if (uploadedCount >= 5) score += 25;

    // 2. Copy Quality (max 20 pts)
    if (form.objective.trim().length > 20) score += 10;
    if (form.targetAudience.trim().length > 15) score += 10;

    // 3. Visual Consistency (max 15 pts)
    if (logo) score += 10;
    if (uploadedCount >= 3) score += 5;

    // 4. Category Alignment (max 20 pts)
    if (form.objective.trim() && form.targetAudience.trim()) {
      score += 20;
    } else if (form.objective.trim() || form.targetAudience.trim()) {
      score += 10;
    }

    // 5. Technical Compliance (max 10 pts)
    if (uploadedCount > 0) score += 10; // crop & resolution resizing automatically verified by build pipeline

    return Math.min(100, score);
  };

  const auditScore = calculateAuditScore();

  const getScoreColor = (num: number) => {
    if (num < 50) return "text-red-500 border-red-500 bg-red-500/10";
    if (num < 75) return "text-amber-500 border-amber-500 bg-amber-500/10";
    return "text-lime border-lime bg-lime/10";
  };

  const triggerSlotUpload = (idx: number) => {
    setActiveSlotIdx(idx);
    setTimeout(() => {
      slotFileRef.current?.click();
    }, 20);
  };

  const removeSlotImage = (idx: number) => {
    setPreviews((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  return (
    <div className="rise grid lg:grid-cols-12 gap-10 items-start min-h-[60vh]">
      {/* Narrative Sequence Grid - Left 7 columns */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-lime bg-lime/10 px-2 py-0.5 rounded">
            ASO Narrative Arc
          </span>
          <h2 className="font-display text-4xl mt-1.5 mb-2">Screenshot Story Sequence</h2>
          <p className="text-muted-foreground text-sm">
            Upload custom screenshots for each slot to tell a structured merchant story. Blank slots will generate with placeholder graphics.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {previews.map((preview, i) => (
            <div
              key={i}
              className={`relative rounded-xl border overflow-hidden bg-card/40 aspect-[16/9] flex flex-col justify-between p-3 group transition ${
                preview ? "border-border hover:border-lime/40" : "border-dashed border-border hover:border-lime/30"
              }`}
            >
              {preview ? (
                <>
                  <img src={preview} alt={roles[i]} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={() => triggerSlotUpload(i)}
                      className="bg-lime text-ink rounded-full px-3 py-1.5 text-xs font-semibold hover:opacity-90 shadow"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => removeSlotImage(i)}
                      className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow"
                      title="Remove screen"
                    >
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => triggerSlotUpload(i)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-muted-foreground hover:text-lime transition p-2 text-center"
                >
                  <svg className="size-5 opacity-60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-[10px] font-mono tracking-tight uppercase">Upload Screen</span>
                </div>
              )}
              
              <div className="relative z-10 font-mono text-[9px] bg-black/60 text-white/95 px-1.5 py-0.5 rounded w-fit max-w-full truncate">
                {roles[i]}
              </div>
            </div>
          ))}
        </div>

        {/* Hidden slot file selector */}
        <input
          ref={slotFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files;
            if (f && f.length > 0 && activeSlotIdx !== null) {
              handleUploadSlot(f, activeSlotIdx);
            }
            e.target.value = "";
          }}
        />
      </div>

      {/* Audit & Details Side - Right 5 columns */}
      <div className="lg:col-span-5 space-y-6 md:sticky md:top-8">
        {/* Listing score card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className={`size-16 rounded-full border-2 flex items-center justify-center font-display text-2xl font-bold shrink-0 shadow-inner ${getScoreColor(auditScore)}`}>
              {auditScore}
            </div>
            <div>
              <h3 className="font-display text-xl leading-tight">Listing Audit Score</h3>
              <p className="text-muted-foreground text-xs mt-1">
                {auditScore < 50 ? "Weak listing configuration. Needs action." : auditScore < 75 ? "Moderate listing. Fill details to improve." : "Highly optimized sequence settings!"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5 text-xs border-t border-border pt-4">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Sequence Narrative (Min 4 screenshots):</span>
              <span className={previews.filter(p => p !== null).length >= 4 ? "text-lime font-bold" : "text-amber-500"}>
                {previews.filter(p => p !== null).length} / 6 screens
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>App Details Completed:</span>
              <span className={form.appName.trim() && form.targetAudience.trim() ? "text-lime font-bold" : "text-amber-500"}>
                {form.appName.trim() && form.targetAudience.trim() ? "Complete" : "Incomplete"}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Brand Identity (Logo uploaded):</span>
              <span className={logo ? "text-lime font-bold" : "text-gray-400"}>
                {logo ? "Loaded" : "Missing"}
              </span>
            </div>
          </div>
        </div>

        {/* Input Details */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-lime mb-1.5 font-bold">App Details</p>
            <h3 className="font-display text-2xl leading-none">Listing Settings</h3>
          </div>

          <div className="space-y-4">
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
              <label className={labelCls}>App logo (Optional)</label>
              <div className="flex items-center gap-4 mt-1">
                {logo ? (
                  <div className="relative size-12 rounded-xl border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setLogo(null)}
                      type="button"
                      className="absolute -top-1 -right-1 size-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-[9px] shadow transition"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoRef.current?.click()}
                    className="size-12 rounded-xl border border-dashed border-border hover:border-lime/60 bg-card/50 hover:bg-card flex flex-col items-center justify-center cursor-pointer shrink-0 text-muted-foreground hover:text-lime transition"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    className="px-3 py-1.5 border border-border rounded-lg text-[10px] font-semibold hover:bg-card transition"
                  >
                    {logo ? "Change logo" : "Upload logo"}
                  </button>
                  <p className="text-[9px] text-muted-foreground mt-1">PNG, JPG or SVG. Transparent background suggested.</p>
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 2 * 1024 * 1024) {
                        toast.error("Logo too large. Keep under 2MB.");
                        return;
                      }
                      try {
                        const dataUrl = await readAsDataURL(f);
                        setLogo(dataUrl);
                        toast.success("Logo uploaded!");
                      } catch {
                        toast.error("Failed to read logo.");
                      }
                    }
                    e.target.value = "";
                  }}
                />
              </div>
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
                placeholder="e.g. increase product page conversion with social proof badges"
                maxLength={500}
                rows={2}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={onGenerate}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-lime text-ink font-semibold px-6 py-3 hover:opacity-90 transition lime-glow"
            >
              Optimize Listing
              <span className="font-mono text-xs opacity-70">↵</span>
            </button>
            <button
              onClick={onReset}
              className="rounded-full border border-border px-5 py-3 hover:bg-card transition text-sm"
            >
              Reset Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loading({ previews }: { previews: (string | null)[] }) {
  const activeCount = previews.filter(p => p !== null).length;
  const steps = [
    `Ingesting ${activeCount} uploaded screens...`,
    "Benchmarking categories and layouts...",
    "Planning 6-screenshot strategic narrative arc...",
    "Generating custom headlines & subheadlines...",
    "Visualizing simulated store previews..."
  ];
  return (
    <div className="rise grid md:grid-cols-2 gap-10 items-center min-h-[60vh]">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card p-6 flex flex-col gap-3 justify-center items-center aspect-[16/10] bg-slate-900/40">
        <div className="size-16 rounded-full border-4 border-lime border-t-transparent animate-spin" />
        <span className="font-mono text-xs text-lime mt-2 animate-pulse">Running Multimodal Analysis</span>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime mb-4">Optimizing Listing</p>
        <h2 className="font-display text-4xl sm:text-5xl mb-8">Running listing intelligence suite…</h2>
        <ul className="space-y-3.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span
                className="size-2 rounded-full bg-lime animate-pulse animate-duration-1000"
                style={{ animationDelay: `${i * 200}ms` }}
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs font-mono text-muted-foreground">
          Typically takes 30–60 seconds to execute. Hang tight.
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
  logo,
  featureTextSize = 1.0,
  featureSpacing = 18,
  featureIconSize = 1.0,
}: {
  template: string;
  stylePreset: string;
  headline: string;
  subheadline: string;
  features: string[];
  colors: { bg: string; primary: string; secondary: string; accent: string };
  screenshot: string;
  watermark: boolean;
  appName: string;
  logo: string | null;
  featureTextSize?: number;
  featureSpacing?: number;
  featureIconSize?: number;
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

  const getSimpleLuminance = (hex: string): number => {
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

  const getRelativeLuminance = (hex: string): number => {
    if (!hex || typeof hex !== "string") return 1;
    const cleanHex = hex.replace("#", "").trim();
    if (cleanHex.length !== 3 && cleanHex.length !== 6) return 1;
    
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
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 1;
    
    const rS = r / 255;
    const gS = g / 255;
    const bS = b / 255;
    
    const rR = rS <= 0.04045 ? rS / 12.92 : Math.pow((rS + 0.055) / 1.055, 2.4);
    const gR = gS <= 0.04045 ? gS / 12.92 : Math.pow((gS + 0.055) / 1.055, 2.4);
    const bR = bS <= 0.04045 ? bS / 12.92 : Math.pow((bS + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rR + 0.7152 * gR + 0.0722 * bR;
  };

  const getContrastRatio = (color1: string, color2: string): number => {
    const l1 = getRelativeLuminance(color1);
    const l2 = getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const getBgLuminance = (bgString: string): number => {
    if (!bgString) return 255;
    const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;
    const matches = bgString.match(hexRegex);
    if (matches && matches.length > 0) {
      let totalLuminance = 0;
      for (const hex of matches) {
        totalLuminance += getSimpleLuminance(hex);
      }
      return totalLuminance / matches.length;
    }
    if (bgString.startsWith("#")) {
      return getSimpleLuminance(bgString);
    }
    return 255;
  };

  const getRepresentativeBgColor = (bgString: string): string => {
    if (!bgString) return "#FFFFFF";
    const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;
    const matches = bgString.match(hexRegex);
    if (matches && matches.length > 0) {
      return matches[0];
    }
    if (bgString.startsWith("#")) {
      return bgString;
    }
    return "#FFFFFF";
  };

  const getReadableColor = (bgColor: string, desiredColor: string, isSecondary: boolean, minRatio: number): string => {
    const repBg = getRepresentativeBgColor(bgColor);
    const ratio = getContrastRatio(repBg, desiredColor);
    if (ratio >= minRatio) {
      return desiredColor;
    }
    const bgLum = getBgLuminance(repBg);
    const isDarkBg = bgLum < 140;
    if (isSecondary) {
      return isDarkBg ? "#D1D5DB" : "#4B5563";
    } else {
      return isDarkBg ? "#FFFFFF" : "#0F172A";
    }
  };

  const getReadableAccentColor = (bgColor: string, desiredAccent: string, minRatio: number): string => {
    const repBg = getRepresentativeBgColor(bgColor);
    const ratio = getContrastRatio(repBg, desiredAccent);
    if (ratio >= minRatio) {
      return desiredAccent;
    }
    const bgLum = getBgLuminance(repBg);
    const isDarkBg = bgLum < 140;
    return isDarkBg ? "#C8E84A" : "#4F46E5";
  };

  const resolveBgAndText = () => {
    let finalBg = colors.bg;
    let isBgDark = false;

    if (stylePreset === "gradient") {
      finalBg = `linear-gradient(135deg, ${colors.bg}, ${colors.accent})`;
      const lumBg = getSimpleLuminance(colors.bg);
      const lumAccent = getSimpleLuminance(colors.accent);
      const avgLum = (lumBg + lumAccent) / 2;
      isBgDark = avgLum < 140;
    } else {
      finalBg = colors.bg;
      const bgLum = getBgLuminance(finalBg);
      isBgDark = bgLum < 140;
    }

    const repBg = getRepresentativeBgColor(stylePreset === "gradient" ? colors.bg : finalBg);

    const finalTextColor = getReadableColor(repBg, colors.primary, false, 3.0);
    const finalBodyColor = getReadableColor(repBg, colors.primary, false, 4.5);
    const finalSecondaryColor = getReadableColor(repBg, colors.secondary, true, 4.5);
    const finalAccentColor = getReadableAccentColor(repBg, colors.accent, 3.0);

    return { 
      bg: finalBg, 
      text: finalTextColor, 
      bodyText: finalBodyColor,
      secondary: finalSecondaryColor, 
      accent: finalAccentColor, 
      isDark: isBgDark 
    };
  };

  const { bg: bgStyle, text: textColor, bodyText: bodyTextColor, secondary: secondaryColor, accent: accentColor, isDark } = resolveBgAndText();

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
          return (
            <span key={segment} className="px-4 py-1.5 rounded-full inline-block mx-1.5 border font-extrabold text-[0.95em]"
                  style={{ 
                    backgroundColor: accentColor + (isDark ? "1A" : "14"), 
                    borderColor: accentColor + "40",
                    color: accentColor
                  }}>
              {segment}
            </span>
          );
        case "conversion":
          return (
            <span key={segment} className="relative inline-block mx-1.5 font-extrabold pb-1">
              {segment}
              <span className="absolute bottom-0 left-0 w-full h-[6px] rounded-full"
                    style={{ backgroundColor: accentColor }} />
            </span>
          );
        case "showcase":
          return (
            <span key={segment} className="italic font-serif-elegant font-normal mx-1"
                  style={{ color: accentColor }}>
              {segment}
            </span>
          );
        case "enterprise":
          return (
            <span key={segment} className="px-4.5 py-1.5 rounded-lg inline-block mx-1 border font-extrabold"
                  style={{
                    backgroundColor: accentColor + (isDark ? "26" : "1A"),
                    borderColor: accentColor + (isDark ? "4D" : "33"),
                    color: accentColor
                  }}>
              {segment}
            </span>
          );
        case "growth":
          return (
            <span key={segment} className="px-4.5 py-1.5 rounded-2xl inline-block mx-1 text-white font-extrabold shadow-sm rotate-[-0.5deg]"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`
                  }}>
              {segment}
            </span>
          );
        case "hero":
          return (
            <span key={segment} className="bg-clip-text text-transparent font-black mx-1"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${accentColor}, ${isDark ? "#FFFFFF" : textColor})`
                  }}>
              {segment}
            </span>
          );
        case "sidebyside":
          return (
            <span key={segment} className="px-2 py-0.5 rounded-md mx-1 text-gray-900 font-extrabold"
                  style={{ backgroundColor: accentColor }}>
              {segment}
            </span>
          );
        case "spotlight":
          return (
            <span key={segment} className="px-4 py-1 rounded-xl inline-block mx-1.5 border-2 border-dashed font-extrabold"
                  style={{ borderColor: accentColor, color: accentColor }}>
              {segment}
            </span>
          );
        case "modernsaas":
          return (
            <span key={segment} className="font-extrabold mx-1"
                  style={{ color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor}4D)` }}>
              {segment}
            </span>
          );
        case "boost_sales":
          return (
            <span key={segment} className="bg-clip-text text-transparent font-black mx-1"
                  style={{ backgroundImage: `linear-gradient(135deg, ${accentColor} 0%, #8B5CF6 100%)` }}>
              {segment}
            </span>
          );
        case "all_in_one":
          return (
            <span key={segment} className="font-extrabold mx-1" style={{ color: accentColor }}>
              {segment}
            </span>
          );
        case "save_time":
          return (
            <span key={segment} className="font-black mx-1" style={{ color: accentColor }}>
              {segment}
            </span>
          );
        case "reports_growth":
          return (
            <span key={segment} className="px-3 py-0.5 rounded-lg inline-block mx-1 font-extrabold text-[0.92em]"
                  style={{
                    backgroundColor: `${accentColor}1A`,
                    color: accentColor,
                    border: `1px solid ${accentColor}33`
                  }}>
              {segment}
            </span>
          );
        case "manage_everything":
          return (
            <span key={segment} className="font-black mx-1" style={{ color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor}4D)` }}>
              {segment}
            </span>
          );
        case "powerful_features":
          return (
            <span key={segment} className="font-black mx-1" style={{ color: accentColor }}>
              {segment}
            </span>
          );
        case "smart_recommendations":
          return (
            <span key={segment} className="font-black mx-1" style={{ color: accentColor }}>
              {segment}
            </span>
          );
        case "realtime_analytics":
          return (
            <span key={segment} className="font-black mx-1" style={{ color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor}4D)` }}>
              {segment}
            </span>
          );
        case "tools_success":
          return (
            <span key={segment} className="relative inline-block px-2 py-0.5 mx-1 font-black rounded-lg rotate-[-1.5deg] shadow-sm bg-white/40"
                  style={{ color: accentColor, borderColor: accentColor, borderWidth: "2px", borderStyle: "solid" }}>
              {segment}
            </span>
          );
        default:
          return (
            <span key={segment} className="underline decoration-wavy mx-1" style={{ textDecorationColor: accentColor }}>
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
    
    const rawIcon = icons[index % icons.length];
    const icon = cloneElement(rawIcon, {
      style: {
        width: `${20 * featureIconSize}px`,
        height: `${20 * featureIconSize}px`,
      },
      className: "shrink-0",
    });
    
    if (styleType === "glass") {
      const glassBg = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(15, 23, 42, 0.12)";
      const glassBorder = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(15, 23, 42, 0.15)";
      const glassText = isDark ? "#FFFFFF" : "#0F172A";
      return (
        <div key={index} className="flex items-center gap-3.5 px-6 py-3 rounded-2xl shadow-lg font-sans-outfit font-black transition hover:scale-[1.01]"
             style={{ 
               backgroundColor: glassBg, 
               borderColor: glassBorder, 
               color: glassText,
               fontSize: `${18 * featureTextSize}px`
             }}>
          <span style={{ color: accentColor }}>{icon}</span>
          <span>{feat}</span>
        </div>
      );
    } else if (styleType === "solid") {
      return (
        <div key={index} className="flex items-center gap-3.5 px-6 py-3.5 rounded-2xl border shadow-lg font-sans-jakarta font-black transition-all hover:scale-[1.01]"
             style={{ 
               backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : `${accentColor}12`, 
               borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : `${accentColor}30`, 
               color: bodyTextColor,
               fontSize: `${18 * featureTextSize}px`
             }}>
          <span style={{ color: accentColor }}>{icon}</span>
          <span>{feat}</span>
        </div>
      );
    } else if (styleType === "serif") {
      return (
        <div key={index} className="flex items-center gap-3.5 font-serif-elegant font-black" style={{ color: bodyTextColor, fontSize: `${20 * featureTextSize}px` }}>
          <div className="rounded-full shrink-0" 
               style={{ 
                 width: `${10 * featureIconSize}px`, 
                 height: `${10 * featureIconSize}px`, 
                 backgroundColor: accentColor || bodyTextColor, 
                 boxShadow: `0 0 10px ${accentColor}` 
               }} />
          <span>{feat}</span>
        </div>
      );
    } else {
      return (
        <div key={index} className="flex items-center gap-3.5 px-6 py-3 rounded-2xl border shadow-lg font-black"
             style={{ 
               color: bodyTextColor, 
               borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)", 
               background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
               fontSize: `${18 * featureTextSize}px`
             }}>
          <span style={{ color: accentColor }}>{icon}</span>
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
          {appName?.toLowerCase() || "dashboard"}
        </div>
        <div className="w-10" />
      </div>
      <div 
        className="relative overflow-hidden" 
        style={maxHeight ? { 
          maxHeight: maxHeight
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
              {logo && (
                <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain" />
              )}
              <span className="font-mono text-[12px] tracking-wider px-4 py-1.5 rounded-full font-bold uppercase"
                    style={{ color: accentColor, backgroundColor: `${accentColor}20` }}>
                {appName || "WATI"}
              </span>
            </div>
            <div className="text-sm font-mono tracking-widest uppercase font-bold opacity-60" style={{ color: bodyTextColor }}>
              {appName || "wati"}
            </div>
          </div>

          {/* Headline & Subheadline */}
          <div className="max-w-5xl mt-2 z-10">
            <h1 className="text-[72px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "executive")}
            </h1>
            <p className="text-[23px] mt-4 max-w-3xl leading-relaxed font-bold font-sans-jakarta"
               style={{ color: secondaryColor }}>
              {subheadline}
            </p>
          </div>

          {/* Floating visual elements around center mockup */}
          <div className="relative w-[700px] mx-auto my-3 flex items-center justify-center z-10">
            {/* Floating widget left */}
            <div className={`absolute -left-28 bottom-12 w-52 p-4 border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col gap-3.5 rotate-[-4deg] select-none transition-all duration-300 hover:rotate-0 hover:scale-[1.03] z-20 ${
              isDark ? "bg-slate-950/92 border-white/10 text-white" : "bg-white/95 border-slate-200/50 text-slate-800"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="size-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-500">
                    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.625.625 0 1 1-1.25 0 .625.625 0 0 1 1.25 0zm4.875 0a.625.625 0 1 1-1.25 0 .625.625 0 0 1 1.25 0zm4.875 0a.625.625 0 1 1-1.25 0 .625.625 0 0 1 1.25 0zM2.25 12c0 4.757 3.424 8.717 8 9.584V22.5a.75.75 0 0 0 1.28.53l2.87-2.87a9.75 9.75 0 1 0-12.15-8.16z" />
                    </svg>
                  </div>
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 animate-pulse" />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-tight leading-none">WhatsApp Support</div>
                  <div className="text-[8px] opacity-60 mt-0.5">Response time: Instant</div>
                </div>
              </div>
              
              <div className={`p-2.5 rounded-xl text-[9px] font-bold leading-normal shadow-inner ${
                isDark ? "bg-white/5 text-slate-200 border border-white/5" : "bg-slate-50 text-slate-700 border border-slate-100"
              }`}>
                Hi! Need help setting up your store checkout? 💬
              </div>
              
              <div className="h-7 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md flex items-center justify-center gap-1.5 text-[9px] text-white font-extrabold cursor-pointer transition-all">
                <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.989-1.874-1.873-4.36-2.903-6.992-2.904-5.442 0-9.87 4.42-9.874 9.865-.001 1.748.46 3.453 1.335 4.968l-.98 3.57 3.662-.96z" />
                </svg>
                <span>Start Live Chat</span>
              </div>
            </div>

            {/* Main Mockup */}
            <div className="w-full scale-[0.98] transition-transform duration-500 hover:scale-[1.00]">
              <ScreenshotMockup maxHeight="340px" />
            </div>

            {/* Floating widget right */}
            <div className={`absolute -right-28 bottom-20 w-52 p-4 border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col gap-3 rotate-[3deg] select-none transition-all duration-300 hover:rotate-0 hover:scale-[1.03] z-20 ${
              isDark ? "bg-slate-950/92 border-white/10 text-white" : "bg-white/95 border-slate-200/50 text-slate-800"
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[8px] font-black uppercase tracking-widest opacity-60">Real-time Analytics</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/10 text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              </div>
              
              <div>
                <div className="text-[20px] font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">
                  +38.5%
                </div>
                <div className="text-[9px] font-bold opacity-60 mt-0.5">Conversion Growth Rate</div>
              </div>
              
              {/* Sparkline chart */}
              <div className="h-8 w-full mt-1.5">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 25 C 10 23, 20 28, 30 18 C 40 8, 50 15, 60 12 C 70 9, 80 4, 90 6 C 95 7, 100 2, 100 2 L 100 30 L 0 30 Z"
                    fill="url(#sparkline-grad)"
                  />
                  <path
                    d="M 0 25 C 10 23, 20 28, 30 18 C 40 8, 50 15, 60 12 C 70 9, 80 4, 90 6 C 95 7, 100 2, 100 2"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="2" r="3" fill="#3b82f6" className="animate-pulse" />
                </svg>
              </div>

              <div className="flex items-center justify-between border-t pt-2.5 border-current/5 text-[8px] font-bold opacity-60">
                <span>Active Checkouts:</span>
                <span className="font-extrabold text-blue-500">1,420</span>
              </div>
            </div>
          </div>
                 {/* Features Row */}
          <div className="flex justify-center z-10" style={{ gap: featureSpacing }}>
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
            <div className="flex items-center gap-3 mb-6 z-10">
              {logo && (
                <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain" />
              )}
              <span className="font-extrabold text-[22px] tracking-tight uppercase" style={{ color: bodyTextColor }}>{appName || "App Name"}</span>
            </div>
            
            <h1 className="text-[64px] font-black leading-[1.08] mb-4 font-sans-jakarta" style={{ color: textColor }}>
              {renderHeadline(headline, "conversion")}
            </h1>
            
            <p className="text-[22px] mb-6 leading-relaxed font-bold font-sans-jakarta"
               style={{ color: secondaryColor }}>
              {subheadline}
            </p>
 
            {/* Redesigned feature highlight card */}
            <div className={`p-5.5 rounded-3xl border mb-8 flex items-center justify-between gap-6 shadow-[0_15px_30px_rgba(0,0,0,0.08)] transition-all duration-300 hover:scale-[1.01] ${
              isDark ? "bg-slate-950/85 border-white/10" : "bg-white/95 border-slate-200/60"
            }`}>
              <div className="flex items-center gap-4.5">
                <div className="size-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-tr from-rose-500 to-orange-500 text-white">
                  <svg className="size-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-black text-[18px] tracking-tight leading-tight" style={{ color: bodyTextColor }}>Automated Growth Engine</h4>
                  <p className="text-[13.5px] opacity-75 mt-1 font-medium" style={{ color: bodyTextColor }}>Optimize storefront conversion rates instantly</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 font-extrabold text-xs tracking-tight select-none">
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
                </svg>
                <span>AOV +24%</span>
              </div>
            </div>
 
            <div className="flex flex-col" style={{ gap: featureSpacing }}>
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
            <div className="flex items-center gap-3 text-[18px] font-black tracking-[0.3em] uppercase font-serif-elegant" style={{ color: bodyTextColor }}>
              {logo && (
                <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain" />
              )}
              <span>{appName || "FAIRE"}</span>
            </div>
 
            {/* Mid Headline */}
            <div className="my-auto py-4">
              <h1 className="text-[60px] font-black leading-[1.15] font-serif-elegant mb-5" style={{ color: textColor }}>
                {renderHeadline(headline, "showcase")}
              </h1>
              <p className="text-[20px] mt-6 leading-relaxed font-sans font-medium"
                 style={{ color: secondaryColor }}>
                {subheadline}
              </p>
            </div>
 
            {/* Bottom Features */}
            <div className="flex flex-col" style={{ gap: featureSpacing }}>
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
              <div className="flex items-center gap-2.5 font-black text-lg mb-6 tracking-wide font-sans-outfit" style={{ color: bodyTextColor }}>
                {logo && (
                  <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain" />
                )}
                <span className="uppercase tracking-widest text-base">{appName || "Shipway"}</span>
              </div>
 
              {/* Headline */}
              <h1 className="text-[62px] font-black leading-[1.1] tracking-tight font-sans-outfit" style={{ color: textColor }}>
                {renderHeadline(headline, "enterprise")}
              </h1>
              <p className="text-[20px] mt-4 leading-relaxed font-sans-outfit font-medium"
                 style={{ color: secondaryColor }}>
                {subheadline}
              </p>
            </div>
 
            {/* Creative Features list */}
            <div className="flex flex-col mt-6" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).slice(0, 3).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
                       style={{ 
                         width: `${40 * featureIconSize}px`, 
                         height: `${40 * featureIconSize}px`,
                         backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", 
                         borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" 
                       }}>
                    <span className="flex items-center justify-center">
                      {idx === 0 ? <LightningIcon size={Math.round(18 * featureIconSize)} /> : idx === 1 ? <BellIcon size={Math.round(18 * featureIconSize)} /> : <ShieldIcon size={Math.round(18 * featureIconSize)} />}
                    </span>
                  </div>
                  <div className="font-sans-outfit">
                    <span className="font-extrabold block" style={{ color: bodyTextColor, fontSize: `${17 * featureTextSize}px` }}>{feat}</span>
                    <span className="opacity-65" style={{ color: bodyTextColor, fontSize: `${12 * featureTextSize}px` }}>Auto-configured in realtime</span>
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
              <div className="text-[9px] font-mono tracking-widest font-extrabold uppercase opacity-60" style={{ color: bodyTextColor }}>INTEGRATED WAREHOUSE PARTNERS</div>
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
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: stylePreset === "gradient" ? "transparent" : (isDark ? "#021A11" : "transparent"), opacity: isDark ? 0.75 : 0 }} />
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
 
          <div className="flex items-center justify-between mt-0 z-10">
            <div className="max-w-5xl">
              <h1 className="text-[64px] font-black leading-[1.1] tracking-tight font-sans-jakarta" style={{ color: textColor }}>
                {renderHeadline(headline, "growth")}
              </h1>
              <p className="text-[22px] opacity-90 mt-4 max-w-2xl font-bold leading-relaxed font-sans-jakarta"
                 style={{ color: secondaryColor }}>
                {subheadline}
              </p>
            </div>
          </div>
 
          <div className="w-[700px] mx-auto my-3 relative shadow-2xl z-10 scale-[0.98]">
            <div className="absolute inset-0 rounded-2xl filter blur-3xl opacity-15" style={{ background: colors.accent }} />
            <div className="relative">
              <ScreenshotMockup maxHeight="340px" />
            </div>
          </div>
 
          <div className="grid grid-cols-3 mb-0 z-10" style={{ gap: featureSpacing }}>
            {features.filter(Boolean).slice(0, 3).map((feat, i) => (
              <div key={i} className="flex gap-3.5 items-center px-6 py-4 rounded-2xl border shadow-md font-bold text-sm"
                   style={{ backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.85)", borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)" }}>
                <CheckCircleIcon size={Math.round(22 * featureIconSize)} />
                <span className="font-black" style={{ color: bodyTextColor, fontSize: `${17 * featureTextSize}px` }}>{feat}</span>
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
               style={{ color: secondaryColor }}>
              {subheadline}
            </p>
          </div>
 
          <div className="w-[720px] my-3 shadow-2xl z-10 transition-transform duration-500 hover:scale-[1.01]">
            <ScreenshotMockup maxHeight="380px" />
          </div>
 
          <div className="flex justify-center mb-2 z-10" style={{ gap: featureSpacing }}>
            {features.filter(Boolean).map((feat, i) => (
              <div
                key={i}
                className="px-6 py-3 rounded-xl font-black tracking-wide border shadow-sm flex items-center gap-2.5"
                style={{
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : `${accentColor}40`,
                  background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  color: textColor,
                  fontSize: `${16 * featureTextSize}px`
                }}
              >
                <div className="rounded-full animate-pulse shadow-sm" 
                     style={{ 
                       width: `${10 * featureIconSize}px`, 
                       height: `${10 * featureIconSize}px`, 
                       backgroundColor: accentColor 
                     }} />
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
               style={{ color: secondaryColor }}>
              {subheadline}
            </p>
          </div>
 
          <div className="grid grid-cols-12 gap-10 items-center flex-1 my-4 z-10">
            <div className="col-span-7 scale-[0.98] origin-left">
              <ScreenshotMockup maxHeight="460px" />
            </div>
 
            <div className="col-span-5 flex flex-col" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).map((feat, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border flex items-start gap-4.5 shadow-md"
                  style={{
                    borderLeft: `4px solid ${accentColor}`,
                    background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                  }}
                >
                  <div
                    className="rounded-full font-mono font-black flex items-center justify-center shrink-0 shadow-sm"
                    style={{ 
                      width: `${44 * featureIconSize}px`, 
                      height: `${44 * featureIconSize}px`, 
                      fontSize: `${16 * featureIconSize}px`, 
                      background: accentColor, 
                      color: isDark ? "#0F172A" : "#FFFFFF" 
                    }}
                  >
                    {i+1}
                  </div>
                  <div>
                    <h3 className="font-extrabold mb-1" style={{ color: bodyTextColor, fontSize: `${19 * featureTextSize}px` }}>{feat}</h3>
                    <p className="opacity-70 leading-relaxed" style={{ color: bodyTextColor, fontSize: `${13 * featureTextSize}px` }}>Designed for maximum storefront conversion.</p>
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
               style={{ color: secondaryColor }}>
              {subheadline}
            </p>
          </div>
 
          <div className="grid grid-cols-3 w-full my-4 z-10" style={{ gap: featureSpacing }}>
            {features.filter(Boolean).map((feat, i) => (
              <div
                key={i}
                className="p-5.5 rounded-2xl border text-center flex flex-col justify-center items-center shadow-md"
                style={{
                  background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                }}
              >
                <div className="mb-2.5 rounded-full flex items-center justify-center font-mono font-black shadow-sm"
                     style={{ 
                       width: `${44 * featureIconSize}px`, 
                       height: `${44 * featureIconSize}px`, 
                       fontSize: `${16 * featureIconSize}px`, 
                       background: isDark ? "rgba(255,255,255,0.06)" : `${accentColor}15`, 
                       color: accentColor 
                     }}>
                  0{i+1}
                </div>
                <h3 className="font-extrabold" style={{ color: bodyTextColor, fontSize: `${19 * featureTextSize}px` }}>{feat}</h3>
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
               style={{ color: secondaryColor }}>
              {subheadline}
            </p>
          </div>
 
          <div className="w-[860px] mx-auto mt-6 relative z-10 transition-transform duration-300 hover:scale-[1.01]">
            <ScreenshotMockup maxHeight="450px" />
 
            {/* Left float badge */}
            <div
              className="absolute p-5 rounded-2xl border shadow-2xl flex items-center gap-4 z-20 w-72 transition-all duration-300 hover:scale-[1.03]"
              style={{
                left: "-260px",
                top: "80px",
                background: isDark ? "rgba(20, 21, 30, 0.9)" : "rgba(255, 255, 255, 0.95)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"
              }}
            >
              <div className="rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm" 
                   style={{ 
                     width: `${48 * featureIconSize}px`, 
                     height: `${48 * featureIconSize}px`, 
                     background: isDark ? "rgba(255,255,255,0.06)" : `${accentColor}20` 
                   }}>
                <svg style={{ width: `${22 * featureIconSize}px`, height: `${22 * featureIconSize}px`, color: accentColor }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <p className="opacity-60 uppercase font-mono tracking-widest text-[10px] font-black" style={{ color: bodyTextColor }}>Conversion Stats</p>
                <h4 className="font-extrabold tracking-tight mt-0.5" style={{ color: bodyTextColor, fontSize: `${16 * featureTextSize}px` }}>
                  {features[0] || "Multichannel Order Management"}
                </h4>
              </div>
            </div>
 
            {/* Right float badge */}
            <div
              className="absolute p-5 rounded-2xl border shadow-2xl flex items-center gap-4 z-20 w-72 transition-all duration-300 hover:scale-[1.03]"
              style={{
                right: "-260px",
                bottom: "80px",
                background: isDark ? "rgba(20, 21, 30, 0.9)" : "rgba(255, 255, 255, 0.95)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"
              }}
            >
              <div className="rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm" 
                   style={{ 
                     width: `${48 * featureIconSize}px`, 
                     height: `${48 * featureIconSize}px`, 
                     background: isDark ? "rgba(255,255,255,0.06)" : `${accentColor}20` 
                   }}>
                <svg style={{ width: `${22 * featureIconSize}px`, height: `${22 * featureIconSize}px`, color: accentColor }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.63 3.06" />
                </svg>
              </div>
              <div>
                <p className="opacity-60 uppercase font-mono tracking-widest text-[10px] font-black" style={{ color: bodyTextColor }}>Verified Design</p>
                <h4 className="font-extrabold tracking-tight mt-0.5" style={{ color: bodyTextColor, fontSize: `${16 * featureTextSize}px` }}>
                  {features[1] || "Automated Order Allocation"}
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template 1 – Boost Sales */}
      {template === "boost_sales" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Glowing blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[130px] pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />
          <div className="absolute -top-[10%] -left-[10%] w-[350px] h-[350px] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />

          {/* Left Column */}
          <div className="col-span-5 flex flex-col justify-center z-10 h-full">
            <div className="flex items-center gap-3.5 mb-8">
              {logo && (
                <img src={logo} alt="Logo" className="h-12 max-w-[180px] object-contain rounded-lg" />
              )}
              <span className="font-extrabold text-[24px] tracking-wide uppercase opacity-90" style={{ color: bodyTextColor }}>{appName || "App Name"}</span>
            </div>

            <h1 className="text-[52px] font-black leading-[1.15] tracking-tight mb-6" style={{ color: textColor }}>
              {renderHeadline(headline || "Boost Sales With **Smart Upsells**", "boost_sales")}
            </h1>

            <p className="text-[19px] leading-relaxed mb-10" style={{ color: secondaryColor }}>
              {subheadline || "AI-powered upsell & cross-sell offers that increase AOV and maximize revenue."}
            </p>

            <div className="flex flex-col" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).map((feat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="rounded-full flex items-center justify-center border shrink-0"
                       style={{ 
                         width: `${28 * featureIconSize}px`, 
                         height: `${28 * featureIconSize}px`,
                         backgroundColor: `${accentColor}20`,
                         color: accentColor,
                         borderColor: `${accentColor}30`
                       }}>
                    <svg style={{ width: `${16 * featureIconSize}px`, height: `${16 * featureIconSize}px` }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-semibold" style={{ color: bodyTextColor, fontSize: `${17 * featureTextSize}px` }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-7 flex justify-end items-center z-10">
            <div 
              style={{
                transform: "perspective(1200px) rotateY(-18deg) rotateX(8deg) rotateZ(-2deg)",
                transformStyle: "preserve-3d",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)"
              }}
              className="w-[840px] transition-transform duration-500"
            >
              <ScreenshotMockup maxHeight="450px" />
            </div>
          </div>
        </div>
      )}

      {/* Template 2 – All-in-One Solution */}
      {template === "all_in_one" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Dotted pattern overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
            backgroundImage: `radial-gradient(${textColor} 1.5px, transparent 1.5px)`,
            backgroundSize: "24px 24px"
          }} />

          {/* Left Column */}
          <div className="col-span-5 flex flex-col justify-between z-10 h-full py-4">
            <div>
              {logo && (
                <div className="mb-6 flex items-center gap-3">
                  <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain" />
                </div>
              )}

              <h1 className="text-[52px] font-black leading-[1.15] tracking-tight mb-5" style={{ color: textColor }}>
                {renderHeadline(headline || "All-in-One **Solution for Your Store**", "all_in_one")}
              </h1>

              <p className="text-[19px] opacity-75 leading-relaxed" style={{ color: secondaryColor }}>
                {subheadline || "Everything you need to grow, manage & scale your business."}
              </p>
            </div>

            <div className="grid grid-cols-2 mt-8" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).slice(0, 4).map((feat, i) => (
                <div key={i} className="flex items-center gap-3.5 p-4 rounded-xl border shadow-sm"
                     style={{
                       backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.85)",
                       borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : `${accentColor}25`
                     }}>
                  <div className="rounded-full flex items-center justify-center shrink-0 font-extrabold"
                       style={{ 
                         width: `${28 * featureIconSize}px`, 
                         height: `${28 * featureIconSize}px`, 
                         fontSize: `${14 * featureIconSize}px`,
                         backgroundColor: `${accentColor}15`,
                         color: accentColor
                       }}>
                    ✓
                  </div>
                  <span className="font-extrabold leading-tight" style={{ color: bodyTextColor, fontSize: `${15 * featureTextSize}px` }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-7 flex justify-end z-10">
            <div className="w-[830px] rounded-2xl border p-2.5 shadow-2xl"
                 style={{
                   backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
                   borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
                 }}>
              <div className="flex items-center gap-1.5 px-3 pb-2.5 border-b mb-2"
                   style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }}>
                <div className="size-2.5 rounded-full bg-[#FF5F56]" />
                <div className="size-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="size-2.5 rounded-full bg-[#27C93F]" />
                <div className="text-[11px] font-mono px-6 py-0.5 rounded-md mx-auto truncate max-w-[240px] border"
                     style={{
                       backgroundColor: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.03)",
                       color: secondaryColor,
                       borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"
                     }}>
                  {appName?.toLowerCase() || "app"}.shopify.com
                </div>
              </div>
              <div className="relative overflow-hidden rounded-b-xl border"
                   style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)" }}>
                <img src={screenshot} alt="Screenshot" className="w-full object-contain block max-h-[440px]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template 3 – Save Time */}
      {template === "save_time" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Background grid overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px"
          }} />
          <div className="absolute -top-[20%] -right-[10%] w-[550px] h-[550px] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />

          {/* Left Column */}
          <div className="col-span-5 flex flex-col justify-center z-10 h-full">
            {logo && (
              <img src={logo} alt="Logo" className="h-12 max-w-[180px] object-contain rounded mb-8" />
            )}

            <h1 className="text-[52px] font-black leading-[1.12] tracking-tight mb-5" style={{ color: textColor }}>
              {renderHeadline(headline || "Save Time. Automate More. **Grow Faster.**", "save_time")}
            </h1>

            <p className="text-[19px] leading-relaxed mb-9" style={{ color: secondaryColor }}>
              {subheadline || "Automate repetitive tasks and focus on what matters most."}
            </p>

            <div className="flex flex-col" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).map((feat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="rounded-full flex items-center justify-center border shrink-0"
                       style={{ 
                         width: `${28 * featureIconSize}px`, 
                         height: `${28 * featureIconSize}px`,
                         backgroundColor: `${accentColor}20`,
                         color: accentColor,
                         borderColor: `${accentColor}30`
                       }}>
                    <svg style={{ width: `${18 * featureIconSize}px`, height: `${18 * featureIconSize}px` }} fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-bold" style={{ color: bodyTextColor, fontSize: `${17 * featureTextSize}px` }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-7 flex justify-end z-10">
            <div className="w-[840px] rounded-2xl border shadow-2xl p-2"
                 style={{
                   backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
                   borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
                 }}>
              <div className="flex items-center gap-1.5 px-3 pb-2 border-b mb-2"
                   style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }}>
                <div className="size-2.5 rounded-full bg-slate-300" />
                <div className="size-2.5 rounded-full bg-slate-300" />
                <div className="size-2.5 rounded-full bg-slate-300" />
              </div>
              <div className="relative overflow-hidden rounded-xl">
                <img src={screenshot} alt="Screenshot" className="w-full object-contain block max-h-[440px]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template 4 – Reports & Growth (Three-Column Dashboard Redesign) */}
      {template === "reports_growth" && (
        <div className="h-full flex flex-col justify-between px-16 py-12 font-sans-jakarta relative overflow-hidden">
          {/* Glowing dynamic background blur circles */}
          <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: `${accentColor}08` }} />
          <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none" style={{ backgroundColor: `${accentColor}12` }} />
          
          {/* Top Header Section with Logo and Centered Text */}
          <div className="w-full flex flex-col items-center text-center z-20 mt-1 select-none">
            {logo ? (
              <img src={logo} alt="Logo" className="h-12 max-w-[180px] object-contain rounded mb-4" />
            ) : (
              <div className="h-2" />
            )}
            <h1 className="text-[48px] font-black leading-[1.15] tracking-tight max-w-4xl mx-auto" style={{ color: textColor }}>
              {renderHeadline(headline || "Beautiful Reports. Smarter Decisions. **Bigger Growth.**", "reports_growth")}
            </h1>
            <p className="text-[18px] opacity-80 mt-3 max-w-2xl mx-auto font-bold leading-relaxed" style={{ color: secondaryColor }}>
              {subheadline || "Get actionable insights and make data-driven decisions."}
            </p>
          </div>

          {/* Three-Column Grid Section - Utilizing remaining horizontal space */}
          <div className="grid grid-cols-12 gap-8 items-center z-10 w-full mb-2">
            
            {/* Left Column (col-span-3) - Stats & Insights 1 */}
            <div className="col-span-3 flex flex-col gap-6 h-full justify-center">
              {/* Metric Card 1 */}
              <div className="p-6 rounded-2xl border shadow-lg transition-all duration-300 hover:scale-[1.03] flex flex-col gap-3"
                   style={{
                     backgroundColor: isDark ? "rgba(15, 23, 42, 0.93)" : "rgba(255, 255, 255, 0.95)",
                     borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
                   }}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-60" style={{ color: bodyTextColor }}>Conversion Rate</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                    <span>+12.4%</span>
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight" style={{ color: textColor }}>4.82%</h3>
                  <p className="text-xs opacity-75 font-medium mt-1" style={{ color: secondaryColor }}>Industry leading benchmark</p>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-6 rounded-2xl border shadow-lg transition-all duration-300 hover:scale-[1.03] flex flex-col gap-2.5"
                   style={{
                     backgroundColor: isDark ? "rgba(15, 23, 42, 0.93)" : "rgba(255, 255, 255, 0.95)",
                     borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
                   }}>
                <div className="rounded-xl flex items-center justify-center shrink-0 size-9 shadow-sm"
                     style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                  <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-extrabold tracking-tight" style={{ color: bodyTextColor, fontSize: `${15 * featureTextSize}px` }}>
                    {features[0] || "Advanced Analytics"}
                  </h4>
                  <p className="text-xs opacity-75 font-medium mt-1 leading-normal" style={{ color: secondaryColor }}>
                    Interactive reports & filters
                  </p>
                </div>
              </div>
            </div>

            {/* Center Column (col-span-6) - Mockup Viewport */}
            <div className="col-span-6 flex justify-center items-center">
              <div className="w-full rounded-2xl border shadow-2xl overflow-hidden p-2.5"
                   style={{
                     backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.95)",
                     borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"
                   }}>
                {/* Browser bar */}
                <div className="flex items-center justify-between px-3.5 pb-2.5 pt-1 border-b mb-2.5"
                     style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }}>
                  <div className="flex gap-1.5">
                    <div className="size-2 rounded-full bg-red-400" />
                    <div className="size-2 rounded-full bg-yellow-400" />
                    <div className="size-2 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[9px] font-mono opacity-40 font-bold" style={{ color: secondaryColor }}>reports.analytics.dashboard</span>
                  <div className="w-8" />
                </div>
                {/* Image */}
                <div className="relative overflow-hidden rounded-xl">
                  <img src={screenshot} alt="Screenshot" className="w-full object-contain block max-h-[380px]" />
                </div>
              </div>
            </div>

            {/* Right Column (col-span-3) - Stats & Insights 2 */}
            <div className="col-span-3 flex flex-col gap-6 h-full justify-center">
              {/* Metric Card 3 */}
              <div className="p-6 rounded-2xl border shadow-lg transition-all duration-300 hover:scale-[1.03] flex flex-col gap-3"
                   style={{
                     backgroundColor: isDark ? "rgba(15, 23, 42, 0.93)" : "rgba(255, 255, 255, 0.95)",
                     borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
                   }}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-60" style={{ color: bodyTextColor }}>AOV Growth</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                    <span>+24.8%</span>
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight" style={{ color: textColor }}>$84.50</h3>
                  <p className="text-xs opacity-75 font-medium mt-1" style={{ color: secondaryColor }}>Average Order Value boost</p>
                </div>
              </div>

              {/* Feature Card 4 */}
              <div className="p-6 rounded-2xl border shadow-lg transition-all duration-300 hover:scale-[1.03] flex flex-col gap-2.5"
                   style={{
                     backgroundColor: isDark ? "rgba(15, 23, 42, 0.93)" : "rgba(255, 255, 255, 0.95)",
                     borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
                   }}>
                <div className="rounded-xl flex items-center justify-center shrink-0 size-9 shadow-sm"
                     style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                  <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-11.61 3.415 5.25 5.25 0 0110.28 2.051zm8.96 2L20 18m0 0l-1.04-1M20 18l1.04-1M20 18l-1.04 1" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-extrabold tracking-tight" style={{ color: bodyTextColor, fontSize: `${15 * featureTextSize}px` }}>
                    {features[1] || "Automated Delivery"}
                  </h4>
                  <p className="text-xs opacity-75 font-medium mt-1 leading-normal" style={{ color: secondaryColor }}>
                    Synchronized growth engine
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Template 5 – Manage Everything */}
      {template === "manage_everything" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Glowing violet overlay */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />

          {/* Left Column */}
          <div className="col-span-5 flex flex-col justify-center gap-8 z-10 h-full py-4">
            <div>
              {logo && (
                <div className="flex items-center gap-3.5 mb-6">
                  <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain rounded" />
                </div>
              )}

              <h1 className="text-[52px] font-black leading-[1.12] tracking-tight mb-4" style={{ color: textColor }}>
                {renderHeadline(headline || "Manage Everything **From One Place**", "manage_everything")}
              </h1>

              <p className="text-[19px] leading-relaxed opacity-85" style={{ color: secondaryColor }}>
                {subheadline || "A unified dashboard for all your store operations."}
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              {features.filter(Boolean).map((feat, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4.5 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm"
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.75)",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                    color: bodyTextColor
                  }}
                >
                  <div 
                    className="rounded-xl flex items-center justify-center shrink-0 size-10 border"
                    style={{ 
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                      borderColor: `${accentColor}30`,
                      boxShadow: `0 0 10px ${accentColor}1A`
                    }}
                  >
                    <svg style={{ width: `${20 * featureIconSize}px`, height: `${20 * featureIconSize}px` }} fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-extrabold text-[16.5px]" style={{ fontSize: `${16.5 * featureTextSize}px` }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-7 flex justify-end z-10">
            <div 
              style={{
                transform: "perspective(1200px) rotateY(-12deg) rotateX(5deg) rotateZ(-1deg)",
                transformStyle: "preserve-3d",
                boxShadow: "0 25px 60px -15px rgba(0,0,0,0.7)"
              }}
              className="w-[840px] transition-transform duration-500"
            >
              <ScreenshotMockup maxHeight="450px" />
            </div>
          </div>
        </div>
      )}

      {/* Template 6 – Powerful Features */}
      {template === "powerful_features" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Wave backgrounds at bottom */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0">
            <svg viewBox="0 0 1440 200" fill="none" className="w-full h-auto">
              <path d="M0,96 C288,160 576,32 864,96 C1152,160 1440,96 1440,96 L1440,200 L0,200 Z" style={{ fill: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.4)" }} />
              <path d="M0,128 C360,192 720,64 1080,128 C1440,192 1440,200 1440,200 L0,200 Z" style={{ fill: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.6)" }} />
            </svg>
          </div>

          {/* Left Column (Screenshots overlapping) */}
          <div className="col-span-7 flex justify-start items-center z-10 h-full relative">
            <div className="relative w-[680px]">
              <div className="rounded-xl border shadow-2xl p-2"
                   style={{
                     backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
                     borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
                   }}>
                <div className="flex gap-1.5 mb-2 px-1">
                  <div className="size-2 rounded-full bg-slate-300" />
                  <div className="size-2 rounded-full bg-slate-300" />
                  <div className="size-2 rounded-full bg-slate-300" />
                </div>
                <div className="relative overflow-hidden rounded-lg">
                  <img src={screenshot} alt="Desktop Screenshot" className="w-full object-contain block max-h-[360px]" />
                </div>
              </div>
              
              {/* Mobile Mockup */}
              <div className="absolute -right-6 -bottom-10 w-[210px] rounded-[36px] bg-slate-900 border-[6px] border-slate-900 shadow-2xl overflow-hidden aspect-[9/18]">
                <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 flex justify-center items-center z-20">
                  <div className="w-12 h-1 bg-slate-800 rounded-full" />
                </div>
                <div className="w-full h-full bg-white relative overflow-hidden rounded-[30px]">
                  <img src={screenshot} alt="Mobile Screenshot" className="w-full h-full object-cover block" />
                  <div className="absolute bottom-1.5 inset-x-0 flex justify-center z-20">
                    <div className="w-16 h-1 bg-slate-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-5 flex flex-col justify-center z-10 h-full pl-6">
            {logo && (
              <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain rounded mb-6" />
            )}

            <h1 className="text-[48px] font-black leading-[1.15] tracking-tight mb-5" style={{ color: textColor }}>
              {renderHeadline(headline || "Powerful Features. Simple to Use. **Loved by Stores.**", "powerful_features")}
            </h1>

            <p className="text-[17px] leading-relaxed mb-9" style={{ color: secondaryColor }}>
              {subheadline || "Packed with powerful features designed for Shopify stores."}
            </p>

            <div className="flex flex-col mb-8" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).map((feat, i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="rounded-md flex items-center justify-center shrink-0 shadow-sm"
                       style={{ 
                         width: `${26 * featureIconSize}px`, 
                         height: `${26 * featureIconSize}px`,
                         backgroundColor: accentColor,
                         color: getContrastRatio(accentColor, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#0F172A"
                       }}>
                    <svg style={{ width: `${16 * featureIconSize}px`, height: `${16 * featureIconSize}px` }} fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-bold" style={{ color: bodyTextColor, fontSize: `${17 * featureTextSize}px` }}>{feat}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
                   style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}25`, color: accentColor }}>
                <svg className="size-4.5 text-[#008060]" viewBox="0 0 24 24" fill="currentColor" style={{ color: accentColor }}>
                  <path d="M19.782 9.273L16.27 4.195a.75.75 0 00-.616-.32h-7.31a.75.75 0 00-.615.32L4.218 9.273a2.25 2.25 0 00-.34 1.848l1.455 6.545A3.75 3.75 0 008.973 20.5h6.054a3.75 3.75 0 003.64-2.834l1.455-6.545a2.25 2.25 0 00-.34-1.848zM12 2.25a2.25 2.25 0 00-2.25 2.25v.75h4.5v-.75A2.25 2.25 0 0012 2.25z" />
                </svg>
                <span className="text-[11px] font-bold tracking-wider uppercase font-mono">Built for Shopify</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template 7 – Smart Recommendations */}
      {template === "smart_recommendations" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Floating pink blobs */}
          <div className="absolute top-10 right-20 w-32 h-32 rounded-full blur-xl pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />
          <div className="absolute bottom-10 left-10 w-44 h-44 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${accentColor}10` }} />

          {/* Left Column */}
          <div className="col-span-5 flex flex-col justify-center z-10 h-full">
            {logo && (
              <div className="flex items-center gap-3 mb-6">
                <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain rounded" />
              </div>
            )}

            <h1 className="text-[52px] font-black leading-[1.12] tracking-tight mb-5" style={{ color: textColor }}>
              {renderHeadline(headline || "Increase AOV With **Smart Recommendations**", "smart_recommendations")}
            </h1>

            <p className="text-[18px] leading-relaxed mb-9" style={{ color: secondaryColor }}>
              {subheadline || "AI-powered product recommendations that drive more sales."}
            </p>

            <div className="flex flex-col" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).map((feat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
                       style={{ 
                         width: `${28 * featureIconSize}px`, 
                         height: `${28 * featureIconSize}px`,
                         backgroundColor: accentColor,
                         color: getContrastRatio(accentColor, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#0F172A"
                       }}>
                    <svg style={{ width: `${16 * featureIconSize}px`, height: `${16 * featureIconSize}px` }} fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-bold" style={{ color: bodyTextColor, fontSize: `${17 * featureTextSize}px` }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-7 flex justify-end z-10">
            <div className="w-[830px] rounded-3xl border shadow-2xl p-4"
                 style={{
                   backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
                   borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
                 }}>
              <div className="relative overflow-hidden rounded-2xl border"
                   style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)" }}>
                <img src={screenshot} alt="Screenshot" className="w-full object-contain block max-h-[440px]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template 8 – Real-Time Analytics (Pedestal Stage Redesign) */}
      {template === "realtime_analytics" && (
        <div className="h-full flex flex-col justify-between px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Radial teal glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[140px] pointer-events-none" style={{ backgroundColor: `${accentColor}0D` }} />
          {/* Dotted background overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{
            backgroundImage: `radial-gradient(${textColor} 1.5px, transparent 1.5px)`,
            backgroundSize: "24px 24px"
          }} />

          {/* Centered Top Header Section */}
          <div className="w-full flex flex-col items-center text-center z-20 mt-1 select-none">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                {appName ? appName : "Real-time Analytics"}
              </span>
            </div>
            <h1 className="text-[50px] font-black leading-[1.15] tracking-tight max-w-4xl mx-auto mb-3" style={{ color: textColor }}>
              {renderHeadline(headline || "Real-time Analytics For **Real Growth**", "realtime_analytics")}
            </h1>
            <p className="text-[18px] opacity-80 max-w-2xl mx-auto font-bold leading-relaxed" style={{ color: secondaryColor }}>
              {subheadline || "Track performance in real-time and stay ahead of the competition."}
            </p>
          </div>

          {/* Bottom Split Layout Section */}
          <div className="grid grid-cols-12 gap-12 items-center z-10 w-full mb-2">
            
            {/* Left Column (col-span-5) - Vertical Feature Cards */}
            <div className="col-span-5 flex flex-col gap-4">
              {features.filter(Boolean).slice(0, 4).map((feat, i) => {
                const subtexts = [
                  "Track performance and live events",
                  "Automate actions with smart rules",
                  "Focus on metrics that drive growth",
                  "Centralize all your operations"
                ];
                const icons = [
                  <svg key="0" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>,
                  <svg key="1" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M3 12l-3 3m3-3l3-3" />
                  </svg>,
                  <svg key="2" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>,
                  <svg key="3" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 12.481c-.131.224-.312.405-.536.536m0-5.801c.224.131.405.312.536.536m0-5.801c-.131-.224-.312-.405-.536-.536" />
                  </svg>
                ];
                return (
                  <div key={i} className="flex items-center gap-4.5 p-4.5 rounded-2xl border transition-all duration-300 hover:scale-[1.02]"
                       style={{
                         backgroundColor: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.95)",
                         borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"
                       }}>
                    <div className="rounded-xl flex items-center justify-center shrink-0 size-10.5 border"
                         style={{ 
                           backgroundColor: isDark ? "rgba(255,255,255,0.02)" : `${accentColor}10`,
                           color: accentColor,
                           borderColor: isDark ? "rgba(255,255,255,0.12)" : `${accentColor}30`,
                           boxShadow: `0 0 10px ${accentColor}1A`
                         }}>
                      {icons[i % icons.length]}
                    </div>
                    <div>
                      <h4 className="font-extrabold tracking-tight text-[15.5px]" style={{ color: bodyTextColor, fontSize: `${16.5 * featureTextSize}px` }}>{feat}</h4>
                      <p className="text-xs opacity-65 font-medium mt-0.5 leading-normal" style={{ color: secondaryColor }}>{subtexts[i % subtexts.length]}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column (col-span-7) - Centered Mockup standing on a 3D glowing pedestal */}
            <div className="col-span-7 flex flex-col items-center justify-center relative h-[450px]">
              
              {/* Outer Glowing Base Ellipse */}
              <div className="absolute -bottom-10 w-[720px] h-[48px] rounded-full z-0 pointer-events-none"
                   style={{
                     background: isDark ? "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 70%)" : "radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)",
                   }} />
              
              {/* Pedestal Outer Rim */}
              <div className="absolute -bottom-6 w-[640px] h-[36px] rounded-full z-10 pointer-events-none border-2"
                   style={{
                     background: isDark ? "rgba(7, 16, 20, 0.95)" : "rgba(240, 248, 245, 0.95)",
                     borderColor: `${accentColor}80`,
                     boxShadow: `0 0 35px ${accentColor}90, inset 0 0 15px ${accentColor}40`,
                     transform: "perspective(800px) rotateX(65deg) scaleY(1.2)"
                   }} />
              
              {/* Pedestal Inner Surface Offset */}
              <div className="absolute -bottom-[2px] w-[560px] h-[28px] rounded-full z-10 pointer-events-none border"
                   style={{
                     background: isDark ? "rgba(10, 25, 30, 0.98)" : "rgba(220, 240, 235, 0.98)",
                     borderColor: `${accentColor}50`,
                     boxShadow: `0 0 15px ${accentColor}60`,
                     transform: "perspective(800px) rotateX(65deg) scaleY(1.2)"
                   }} />

              {/* Browser mockup resting on the pedestal */}
              <div className="relative z-20 w-[780px] shadow-2xl transition-transform duration-300 hover:scale-[1.01] mb-2">
                <div className="w-full rounded-2xl border overflow-hidden p-2.5"
                     style={{
                       backgroundColor: isDark ? "rgba(10, 16, 22, 0.95)" : "rgba(255, 255, 255, 0.95)",
                       borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"
                     }}>
                  
                  {/* Browser top controls */}
                  <div className="flex items-center gap-1.5 px-3.5 pb-2.5 pt-1 border-b mb-2.5"
                       style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)" }}>
                    <div className="size-2 rounded-full bg-red-400" />
                    <div className="size-2 rounded-full bg-yellow-400" />
                    <div className="size-2 rounded-full bg-green-400" />
                  </div>
                  
                  {/* Screenshot frame */}
                  <div className="relative overflow-hidden rounded-xl border"
                       style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)" }}>
                    <img src={screenshot} alt="Screenshot" className="w-full object-contain block max-h-[380px]" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Template 9 – Tools for Success */}
      {template === "tools_success" && (
        <div className="h-full grid grid-cols-12 gap-10 items-center px-20 py-16 font-sans-jakarta relative overflow-hidden">
          {/* Dotted grid pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
            backgroundImage: `radial-gradient(${textColor} 1.5px, transparent 1.5px)`,
            backgroundSize: "24px 24px"
          }} />

          {/* Left Column */}
          <div className="col-span-5 flex flex-col justify-between z-10 h-full py-4">
            <div>
              {logo && (
                <div className="flex items-center gap-3.5 mb-6">
                  <img src={logo} alt="Logo" className="h-11 max-w-[180px] object-contain rounded" />
                </div>
              )}

              <h1 className="text-[52px] font-black leading-[1.1] tracking-tight mb-5" style={{ color: textColor }}>
                {renderHeadline(headline || "All the Tools You Need to **Succeed!**", "tools_success")}
              </h1>

              <p className="text-[18px] leading-relaxed" style={{ color: secondaryColor }}>
                {subheadline || "Everything you need to build, grow and scale your store."}
              </p>
            </div>

            <div className="flex mt-auto flex-wrap" style={{ gap: featureSpacing }}>
              {features.filter(Boolean).slice(0, 3).map((feat, i) => (
                <span key={i} className="px-4 py-2 rounded-xl border-2 border-dashed font-extrabold"
                      style={{ 
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : `${accentColor}10`, 
                        borderColor: `${accentColor}40`, 
                        color: isDark ? "#FFFFFF" : accentColor,
                        fontSize: `${15 * featureTextSize}px` 
                      }}>
                  <span style={{ display: "inline-block", transform: `scale(${featureIconSize})`, transformOrigin: "center left" }} className="mr-1.5">✨</span>
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-7 flex justify-end z-10 relative">
            {/* Sketchy style SVG arrow pointing to screen */}
            <svg className="absolute -left-14 top-1/2 -translate-y-1/2 size-20 opacity-90 pointer-events-none z-20" fill="none" viewBox="0 0 72 72" style={{ color: accentColor }}>
              <path d="M10 36 C25 20, 45 20, 55 36 M45 42 L57 38 L50 26" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            <div 
              style={{ 
                transform: "rotate(1.5deg)",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF",
                borderColor: textColor,
                borderWidth: "3px",
                boxShadow: `6px 6px 0px ${textColor}`
              }}
              className="w-[830px] rounded-2xl border p-2"
            >
              <div className="flex items-center gap-1.5 px-3 pb-2.5 mb-2 border-b-3"
                   style={{ borderColor: textColor }}>
                <div className="size-3 rounded-full" style={{ backgroundColor: textColor }} />
                <div className="size-3 rounded-full" style={{ backgroundColor: textColor }} />
                <div className="size-3 rounded-full" style={{ backgroundColor: textColor }} />
                <div className="text-[11px] font-mono font-extrabold px-6 py-0.5 rounded-md border-2 mx-auto max-w-[240px] truncate"
                     style={{
                       backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "#F8FAFC",
                       borderColor: textColor,
                       color: textColor
                     }}>
                  super.app.dashboard
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-slate-900/30">
                <img src={screenshot} alt="Screenshot" className="w-full object-contain block max-h-[440px]" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {watermark && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none select-none z-50 overflow-hidden p-6">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-center font-mono text-[24px] font-black uppercase tracking-[0.2em] rotate-[-28deg] select-none whitespace-nowrap ${
                isDark ? "text-white/15" : "text-gray-950/18"
              }`}
            >
              Screenify Preview
            </div>
          ))}
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
  logo,
  sequenceLength = 6,
}: {
  appName: string;
  category: string;
  colors: { bg: string; primary: string; secondary: string; accent: string };
  isMobile: boolean;
  renderCanvasContent: (scale: number, slideIdx: number) => React.ReactNode;
  logo: string | null;
  sequenceLength?: number;
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
            <div className="size-8 bg-[#008060] rounded-lg flex items-center justify-center shrink-0">
              <img src="/shopify-bag-icon.png" alt="Shopify App Store Logo" className="size-5 object-contain invert" />
            </div>
            <span className="font-semibold text-sm text-gray-800">App Store</span>
          </div>
          <svg className="size-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* App Hero Details */}
        <div className="p-5 bg-white flex flex-col gap-4">
          <div className="flex gap-4">
            {logo ? (
              <div className="size-16 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="size-16 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-md uppercase select-none shrink-0"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                {appName ? appName.slice(0, 2) : "SM"}
              </div>
            )}
            <div>
              <h2 className="font-bold text-lg leading-tight text-gray-900">{appName || "ScreenMint App"}</h2>
              <p className="text-xs text-gray-500 mt-0.5">by ScreenMint Solutions</p>
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
          <h3 className="font-bold text-sm text-gray-800 mb-3 font-sans">Media Gallery</h3>
          
          <div className="w-full overflow-x-auto flex gap-3 pb-3 scrollbar-thin">
            {Array.from({ length: sequenceLength }).map((_, i) => (
              <div key={i} className="shrink-0 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                {renderCanvasContent(280 / 1600, i)}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wide mb-1 font-sans">Key App Category</h4>
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
          <div className="size-9 bg-[#008060] rounded-lg flex items-center justify-center shrink-0">
            <img src="/shopify-bag-icon.png" alt="Shopify App Store Logo" className="size-6 object-contain invert" />
          </div>
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
          {logo ? (
            <div className="size-20 rounded-2xl border border-gray-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-md">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="size-20 rounded-2xl flex items-center justify-center font-bold text-3xl text-white shadow-md uppercase select-none shrink-0"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
              {appName ? appName.slice(0, 2) : "SM"}
            </div>
          )}

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-2xl text-gray-900 leading-tight">{appName || "ScreenMint App"}</h2>
                <p className="text-sm text-gray-500 mt-1">by <span className="underline cursor-pointer text-gray-600">ScreenMint Solutions</span></p>
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
            <h3 className="font-bold text-base text-gray-800 font-sans">Media Gallery</h3>
          </div>

          <div className="flex gap-4 items-center overflow-x-auto pb-4 scrollbar-thin">
            {Array.from({ length: sequenceLength }).map((_, i) => (
              <div key={i} className="shrink-0 border border-slate-100 rounded-xl overflow-hidden shadow-md">
                {renderCanvasContent(480 / 1600, i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Results({
  result,
  previews,
  setPreviews,
  logo,
  paid,
  onPaid,
  onReset,
  email,
  extractedColors,
}: {
  result: Result;
  previews: (string | null)[];
  setPreviews: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  logo: string | null;
  paid: boolean;
  onPaid: () => void;
  onReset: () => void;
  email: string;
  extractedColors: { bg: string; primary: string; secondary: string; accent: string };
}) {
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState<"editor" | "shopify_desktop" | "shopify_mobile">("editor");
  const [variant, setVariant] = useState<"feature" | "benefit" | "outcome">("feature");
  const [downloading, setDownloading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1600, height: 900 });
  const [isMounted, setIsMounted] = useState(false);

  const uploadedCount = previews.filter(p => p !== null).length || 1;

  useEffect(() => {
    if (activeSlideIdx >= uploadedCount) {
      setActiveSlideIdx(Math.max(0, uploadedCount - 1));
    }
  }, [uploadedCount, activeSlideIdx]);

  const [slideConfigs, setSlideConfigs] = useState<{
    template: string;
    stylePreset: string;
    headline: string;
    subheadline: string;
    features: string[];
    colors: { bg: string; primary: string; secondary: string; accent: string };
    featureTextSize: number;
    featureSpacing: number;
    featureIconSize: number;
  }[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("screenmint_slide_configs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 6) return parsed;
        } catch {}
      }
    }
    return [];
  });

  const getTemplateDefaultColors = (tpl: string, preset: string) => {
    let bg = "#F5F1E8";
    let primary = "#121212";
    let secondary = "#6B7280";
    let accent = "#C8E84A";

    if (preset === "minimal") {
      bg = "#FFFFFF";
      primary = "#0F172A";
      secondary = "#475569";
      accent = "#0F172A";
    } else if (preset === "dark") {
      bg = "#0A0B0E";
      primary = "#F8FAFC";
      secondary = "#94A3B8";
      accent = "#C8E84A";
    } else if (preset === "gradient") {
      bg = extractedColors.bg || "#F5F1E8";
      accent = extractedColors.accent || "#C8E84A";
      primary = "#0F172A";
      secondary = "#4B5563";
    } else {
      if (tpl === "enterprise") {
        bg = "#060B26";
        primary = "#FFFFFF";
        secondary = "#94A3B8";
        accent = "#3B82F6";
      } else if (tpl === "growth") {
        bg = "#022315";
        primary = "#FFFFFF";
        secondary = "#A7F3D0";
        accent = "#10B981";
      } else if (tpl === "showcase") {
        bg = "#FAF9F5";
        primary = "#1C1917";
        secondary = "#6B7280";
        accent = "#D97706";
      } else if (tpl === "executive") {
        bg = "#FAF8F5";
        primary = "#0F172A";
        secondary = "#4B5563";
        accent = "#10B981";
      } else if (tpl === "boost_sales") {
        bg = "#070B1E";
        primary = "#FFFFFF";
        secondary = "#D1D5DB";
        accent = "#8B5CF6";
      } else {
        bg = extractedColors.bg || "#FAF9F5";
        primary = extractedColors.primary || "#1F2937";
        secondary = extractedColors.secondary || "#4B5563";
        accent = extractedColors.accent || "#3B82F6";
      }
    }
    return { bg, primary, secondary, accent };
  };

  // Populate from AI generated slides on new session
  useEffect(() => {
    if (result && result.slides && slideConfigs.length === 0) {
      const initial = result.slides.map((s: any) => {
        const activeCopy = s.variants[variant] || s.variants["feature"];
        const defaultColors = getTemplateDefaultColors(s.suggestedTemplate, s.suggestedPreset);
        return {
          template: s.suggestedTemplate || "showcase",
          stylePreset: s.suggestedPreset || "modern",
          headline: activeCopy.headline || "",
          subheadline: activeCopy.subheadline || "",
          features: activeCopy.features || ["", "", ""],
          colors: defaultColors,
          featureTextSize: 1.0,
          featureSpacing: 18,
          featureIconSize: 1.0,
        };
      });
      setSlideConfigs(initial);
    }
  }, [result]);

  // Sync with AI copy variants when toggling Feature/Benefit/Outcome tabs
  useEffect(() => {
    if (result && result.slides && slideConfigs.length === 6) {
      const isNewSession = typeof window !== "undefined" && localStorage.getItem("screenmint_is_new_session") === "true";
      
      setSlideConfigs((prev) =>
        prev.map((cfg, idx) => {
          const s = result.slides[idx];
          if (!s) return cfg;
          const activeCopy = s.variants[variant] || s.variants["feature"];
          return {
            ...cfg,
            headline: activeCopy.headline || "",
            subheadline: activeCopy.subheadline || "",
            features: activeCopy.features || ["", "", ""],
          };
        })
      );

      if (isNewSession && variant === "feature") {
        localStorage.removeItem("screenmint_is_new_session");
      }
    }
  }, [variant]);

  // Save configs to localStorage
  useEffect(() => {
    if (slideConfigs.length === 6) {
      localStorage.setItem("screenmint_slide_configs", JSON.stringify(slideConfigs));
    }
  }, [slideConfigs]);

  useEffect(() => {
    setIsMounted(true);
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
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
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const updateActiveSlide = (fields: Partial<typeof slideConfigs[0]>) => {
    setSlideConfigs((prev) => {
      const next = [...prev];
      next[activeSlideIdx] = { ...next[activeSlideIdx], ...fields };
      return next;
    });
  };

  const updateActiveFeature = (index: number, val: string) => {
    setSlideConfigs((prev) => {
      const next = [...prev];
      const feats = [...next[activeSlideIdx].features];
      feats[index] = val;
      next[activeSlideIdx] = { ...next[activeSlideIdx], features: feats };
      return next;
    });
  };

  const updateActiveColors = (colorFields: Partial<typeof slideConfigs[0]["colors"]>) => {
    setSlideConfigs((prev) => {
      const next = [...prev];
      next[activeSlideIdx] = {
        ...next[activeSlideIdx],
        colors: { ...next[activeSlideIdx].colors, ...colorFields }
      };
      return next;
    });
  };

  const handleApplyToAll = () => {
    const active = slideConfigs[activeSlideIdx];
    if (!active) return;
    const { stylePreset, colors, featureTextSize, featureSpacing, featureIconSize } = active;
    setSlideConfigs((prev) =>
      prev.map((cfg) => ({
        ...cfg,
        stylePreset,
        colors: { ...colors },
        featureTextSize,
        featureSpacing,
        featureIconSize,
      }))
    );
    toast.success("Applied current styling settings to all other templates!");
  };

  const handleDownload = async () => {
    const node = document.getElementById("export-node");
    if (!node) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(node, {
        width: 1600,
        height: 900,
        pixelRatio: 2.5,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${result?.appName?.toLowerCase() || "screenmint"}-slide-${activeSlideIdx + 1}.png`;
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

  const handleDownloadAll = async () => {
    setDownloading(true);
    toast.info(`Preparing sequence export... downloading ${uploadedCount} images.`);
    try {
      for (let i = 0; i < uploadedCount; i++) {
        const node = document.getElementById(`export-node-${i}`);
        if (node) {
          const dataUrl = await htmlToImage.toPng(node, {
            width: 1600,
            height: 900,
            pixelRatio: 2.5,
          });
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `${result?.appName?.toLowerCase() || "screenmint"}-slide-${i + 1}.png`;
          a.click();
          await new Promise(r => setTimeout(r, 450));
        }
      }
      toast.success(`Successfully exported all ${uploadedCount} screenshots!`);
    } catch (err) {
      console.error("Sequence export failed:", err);
      toast.error("Failed to batch export all slides.");
    } finally {
      setDownloading(false);
    }
  };

  const w = windowSize.width || 1600;
  const h = windowSize.height || 900;
  const availableWidth = Math.max(300, w - 32);
  const availableHeight = Math.max(200, h - 140);
  const fullscreenScale = Math.max(0.1, Math.min(1.0, availableWidth / 1600, availableHeight / 900)) || 0.8;

  const activeConfig = slideConfigs[activeSlideIdx];

  const renderCanvasContent = (scale: number, slideIdx: number, watermarkOverride?: boolean) => {
    const config = slideConfigs[slideIdx];
    if (!config) return <div className="animate-pulse bg-muted rounded aspect-[16/9] w-full" />;
    
    return (
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
            template={config.template}
            stylePreset={config.stylePreset}
            headline={config.headline}
            subheadline={config.subheadline}
            features={config.features}
            colors={config.colors}
            screenshot={previews[slideIdx] || ""}
            watermark={watermarkOverride !== undefined ? watermarkOverride : !paid}
            appName={result?.appName || "app"}
            logo={logo}
            featureTextSize={config.featureTextSize}
            featureSpacing={config.featureSpacing}
            featureIconSize={config.featureIconSize}
          />
        </div>
      </div>
    );
  };

  const roles = [
    "Slide 1: Hook / Hero",
    "Slide 2: Problem/Solution",
    "Slide 3: Key Feature A",
    "Slide 4: Key Feature B",
    "Slide 5: Outcomes / Proof",
    "Slide 6: Easy Setup & Trust"
  ];

  if (!activeConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="size-10 rounded-full border-4 border-lime border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-muted-foreground">Initializing Design Studio...</p>
      </div>
    );
  }

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
              {renderCanvasContent(0.44, activeSlideIdx)}
              
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
              colors={activeConfig.colors}
              isMobile={false}
              renderCanvasContent={(s, idx) => renderCanvasContent(s, idx)}
              logo={logo}
              sequenceLength={uploadedCount}
            />
          )}

          {previewMode === "shopify_mobile" && (
            <ShopifyStoreListingPreview
              appName={result?.appName || ""}
              category={result?.category || ""}
              colors={activeConfig.colors}
              isMobile={true}
              renderCanvasContent={(s, idx) => renderCanvasContent(s, idx)}
              logo={logo}
              sequenceLength={uploadedCount}
            />
          )}
        </div>

        {/* Horizontal scroll slide navigator */}
        <div className="w-full mt-8 space-y-2.5 max-w-[840px] px-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Sequence Navigator ({uploadedCount} Slides)
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/60 hidden sm:inline">
              Select a card to edit layout and copywriting
            </span>
          </div>
          <div className="flex overflow-x-auto gap-3.5 pb-3.5 scrollbar-thin w-full justify-start items-center">
            {slideConfigs.slice(0, uploadedCount).map((cfg, i) => {
              const isActive = activeSlideIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlideIdx(i)}
                  className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden group shadow-sm hover:shadow-md hover:scale-[1.02] w-[170px] shrink-0 ${
                    isActive
                      ? "border-lime bg-lime/10 shadow-lime/5 ring-1 ring-lime/20"
                      : "border-border bg-card/50 hover:bg-card"
                  }`}
                >
                  {/* Badge Row */}
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-lime text-ink" : "bg-muted text-muted-foreground"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[8.5px] text-muted-foreground truncate max-w-[90px] font-bold">
                      {roles[i]?.split(":")[1]?.trim() || roles[i] || `Slide ${i + 1}`}
                    </span>
                  </div>

                  {/* Thumbnail Canvas wrapper */}
                  <div className={`rounded-xl overflow-hidden border transition-colors flex justify-center items-center bg-card ${isActive ? "border-lime/30" : "border-slate-800/40"}`}>
                    {renderCanvasContent(140 / 1600, i, false)}
                  </div>
                  
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-lime/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Hidden Export Node (Active slide) */}
        <div style={{ width: 0, height: 0, overflow: "hidden", position: "absolute", pointerEvents: "none" }}>
          <div id="export-node" style={{ width: 1600, height: 900, position: "relative" }}>
            <TemplateCanvas
              template={activeConfig.template}
              stylePreset={activeConfig.stylePreset}
              headline={activeConfig.headline}
              subheadline={activeConfig.subheadline}
              features={activeConfig.features}
              colors={activeConfig.colors}
              screenshot={previews[activeSlideIdx] || ""}
              watermark={false}
              appName={result?.appName || ""}
              logo={logo}
              featureTextSize={activeConfig.featureTextSize}
              featureSpacing={activeConfig.featureSpacing}
              featureIconSize={activeConfig.featureIconSize}
            />
          </div>
        </div>

        {/* Hidden Export Nodes (All slides) */}
        <div style={{ width: 0, height: 0, overflow: "hidden", position: "absolute", pointerEvents: "none" }}>
          {Array.from({ length: uploadedCount }).map((_, i) => {
            const cfg = slideConfigs[i];
            if (!cfg) return null;
            return (
              <div key={i} id={`export-node-${i}`} style={{ width: 1600, height: 900, position: "relative" }}>
                <TemplateCanvas
                  template={cfg.template}
                  stylePreset={cfg.stylePreset}
                  headline={cfg.headline}
                  subheadline={cfg.subheadline}
                  features={cfg.features}
                  colors={cfg.colors}
                  screenshot={previews[i] || ""}
                  watermark={false}
                  appName={result?.appName || ""}
                  logo={logo}
                  featureTextSize={cfg.featureTextSize}
                  featureSpacing={cfg.featureSpacing}
                  featureIconSize={cfg.featureIconSize}
                />
              </div>
            );
          })}
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
            2. Select Slide Layout ({roles[activeSlideIdx]})
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
              { id: "boost_sales", label: "Boost Sales" },
              { id: "all_in_one", label: "All-in-One Solution" },
              { id: "save_time", label: "Save Time" },
              { id: "reports_growth", label: "Reports & Growth" },
              { id: "manage_everything", label: "Manage Everything" },
              { id: "powerful_features", label: "Powerful Features" },
              { id: "smart_recommendations", label: "Smart Recommendations" },
              { id: "realtime_analytics", label: "Real-Time Analytics" },
              { id: "tools_success", label: "Tools for Success" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => updateActiveSlide({ template: t.id })}
                className={`py-2 px-3 rounded-lg border text-left transition flex items-center justify-between ${
                  activeConfig.template === t.id
                    ? "border-lime bg-lime/10 text-lime font-bold"
                    : "border-border hover:bg-card text-muted-foreground"
                }`}
              >
                <span>{t.label}</span>
                {result?.slides[activeSlideIdx]?.suggestedTemplate === t.id && (
                  <span className="text-[9px] bg-lime/20 text-lime px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90">Auto</span>
                )}
              </button>
            ))}
          </div>
        </div>

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
                onClick={() => {
                  const defaults = getTemplateDefaultColors(activeConfig.template, s.id);
                  updateActiveSlide({ stylePreset: s.id, colors: defaults });
                }}
                className={`py-2 px-3 rounded-lg border text-left transition ${
                  activeConfig.stylePreset === s.id
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
            4. Modify Marketing Copy (Slide {activeSlideIdx + 1})
          </label>
          <div>
            <label className="block text-[10px] opacity-60 mb-1">Headline (Max 6 words recommended)</label>
            <input
              type="text"
              value={activeConfig.headline}
              onChange={(e) => updateActiveSlide({ headline: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50"
            />
          </div>
          <div>
            <label className="block text-[10px] opacity-60 mb-1">Subheadline (Max 15 words recommended)</label>
            <textarea
              value={activeConfig.subheadline}
              onChange={(e) => updateActiveSlide({ subheadline: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] opacity-60">Feature Callouts (Max 5 words each)</label>
            {activeConfig.features.map((feat, idx) => (
              <input
                key={idx}
                type="text"
                value={feat}
                onChange={(e) => updateActiveFeature(idx, e.target.value)}
                placeholder={`Feature Callout 0${idx+1}`}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime/50"
              />
            ))}
          </div>
        </div>

        {/* Color Settings */}
        <div className="space-y-3 border-t border-border pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            5. Custom Color Palette
          </label>
          
          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <label className="block text-[10px] opacity-60 mb-1 truncate">BG Color</label>
              <input
                type="color"
                value={activeConfig.colors.bg}
                onChange={(e) => updateActiveColors({ bg: e.target.value })}
                className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] opacity-60 mb-1 truncate">Primary Text</label>
              <input
                type="color"
                value={activeConfig.colors.primary}
                onChange={(e) => updateActiveColors({ primary: e.target.value })}
                className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] opacity-60 mb-1 truncate">Secondary Text</label>
              <input
                type="color"
                value={activeConfig.colors.secondary || "#6B7280"}
                onChange={(e) => updateActiveColors({ secondary: e.target.value })}
                className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] opacity-60 mb-1 truncate">Accent</label>
              <input
                type="color"
                value={activeConfig.colors.accent}
                onChange={(e) => updateActiveColors({ accent: e.target.value })}
                className="w-full h-8 rounded border border-border bg-transparent p-0.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Feature Callout Controls */}
        <div className="space-y-4 border-t border-border pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            6. Slide Callout Controls
          </label>
          <div className="space-y-3 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center text-muted-foreground mb-1">
                <span>Text Size</span>
                <span className="text-lime font-bold">{activeConfig.featureTextSize.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={activeConfig.featureTextSize}
                onChange={(e) => updateActiveSlide({ featureTextSize: parseFloat(e.target.value) })}
                className="w-full accent-lime cursor-pointer bg-muted h-1 rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-muted-foreground mb-1">
                <span>Spacing / Gap</span>
                <span className="text-lime font-bold">{activeConfig.featureSpacing}px</span>
              </div>
              <input
                type="range"
                min="8"
                max="40"
                step="1"
                value={activeConfig.featureSpacing}
                onChange={(e) => updateActiveSlide({ featureSpacing: parseInt(e.target.value) })}
                className="w-full accent-lime cursor-pointer bg-muted h-1 rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-muted-foreground mb-1">
                <span>Bullet Size</span>
                <span className="text-lime font-bold">{activeConfig.featureIconSize.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={activeConfig.featureIconSize}
                onChange={(e) => updateActiveSlide({ featureIconSize: parseFloat(e.target.value) })}
                className="w-full accent-lime cursor-pointer bg-muted h-1 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Apply style to all slides option */}
        <div className="border-t border-border pt-4 mt-2">
          <button
            type="button"
            onClick={handleApplyToAll}
            className="w-full relative group overflow-hidden rounded-xl border border-lime/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-lime transition-all duration-300 hover:border-lime/50 hover:shadow-[0_0_20px_rgba(200,232,74,0.15)] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-lime/5 via-transparent to-lime/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center justify-center gap-2.5 font-mono text-[10px] tracking-widest">
              <svg className="size-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.63 3.06m-11.13-.306A9 9 0 1120.25 12" />
              </svg>
              Apply Style to All Slides
            </span>
          </button>
        </div>

        {/* Actions & Export Panel */}
        <div className="border-t border-border pt-6 mt-4 space-y-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-lime text-lime font-semibold py-3 text-sm hover:bg-lime/5 transition disabled:opacity-60"
          >
            {downloading ? "Exporting..." : `Download Slide ${activeSlideIdx + 1}`}
          </button>
          
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-lime text-ink font-semibold py-3.5 text-base hover:opacity-90 transition lime-glow disabled:opacity-60"
          >
            {downloading ? (
              "Batch Exporting Set..."
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                {paid ? "Export Full Optimized Set" : "Download Watermarked Set"}
              </>
            )}
          </button>

          {!paid && (
            <button
              onClick={() => setPayOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#3ECFB2]/20 bg-[#3ECFB2]/5 hover:bg-[#3ECFB2]/10 active:scale-98 text-xs font-semibold text-[#3ECFB2] transition-all cursor-pointer shadow-sm shadow-[#3ECFB2]/5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Unlock Watermark-Free High-Res Exports
            </button>
          )}

          {paid && (
            <div className="rounded-xl bg-lime/10 border border-lime/20 p-3 text-center text-xs font-mono text-lime">
              ✓ Pro Unwatermarked Exports Unlocked
            </div>
          )}
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        onSuccess={onPaid}
        email={email}
      />

      {/* Fullscreen Modal Overlay */}
      {isFullscreen && isMounted && createPortal(
        <div 
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 bg-neutral-950/98 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200 font-sans cursor-zoom-out"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
            className="absolute top-6 right-6 z-50 size-12 rounded-full bg-neutral-900/80 text-white flex items-center justify-center border border-white/10 transition shadow-xl text-lg hover:border-white/20"
          >
            ✕
          </button>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-xl overflow-hidden border border-white/10 shadow-3xl max-w-full max-h-full cursor-default select-none"
          >
            {renderCanvasContent(fullscreenScale, activeSlideIdx)}
          </div>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 p-2 bg-neutral-900/90 backdrop-blur-md rounded-full border border-white/10 shadow-2xl w-full max-w-md cursor-default"
          >
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-lime text-ink font-semibold py-3 hover:opacity-90 transition disabled:opacity-60 text-xs"
            >
              Download Slide {activeSlideIdx + 1}
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 transition text-xs text-center"
            >
              Back to Editor
            </button>
          </div>
        </div>,
        document.body
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
