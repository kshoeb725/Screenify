import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Sparkles,
  Layers,
  Download,
  Check,
  X,
  Zap,
  Maximize2,
  Palette,
  ShieldCheck,
  Flame,
  ArrowRight,
  ChevronRight,
  Star,
  Smartphone,
  Laptop,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onPick: () => void;
  onDrop: (files: FileList) => void;
}

export function LandingPage({ onPick, onDrop }: LandingPageProps) {
  const [dragging, setDragging] = useState(false);

  // Before vs After Slider State
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isSliding = useRef(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (userInteracted || isHovered) return;

    let animationFrameId: number;
    let direction = -1; // Start by scrolling towards the left side
    let currentPos = sliderPos;

    const animate = () => {
      currentPos += direction * 0.15; // Slow, smooth speed
      if (currentPos >= 85) {
        currentPos = 85;
        direction = -1;
      } else if (currentPos <= 15) {
        currentPos = 15;
        direction = 1;
      }
      setSliderPos(currentPos);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [userInteracted, isHovered]);

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  useEffect(() => {
    const handleMouseUp = () => { isSliding.current = false; };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isSliding.current) return;
      handleSliderMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isSliding.current) return;
      if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchend", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);



  // Carousel State
  const [activeTemplate, setActiveTemplate] = useState(0);
  const templates = [
    {
      name: "Executive SaaS",
      desc: "Deep background with clean white cards and sleek text overlays.",
      bg: "bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900",
      accent: "text-indigo-400",
      borderColor: "border-slate-800",
      textColor: "text-slate-100",
      headline: "Seamless CRM & Support Portal",
      subheadline: "Manage store relationships in real-time with one inbox"
    },
    {
      name: "Growth Focused",
      desc: "High-impact layouts with slanted angles and vibrant accent borders.",
      bg: "bg-gradient-to-tr from-zinc-950 via-emerald-950 to-zinc-950",
      accent: "text-emerald-400",
      borderColor: "border-emerald-900/30",
      textColor: "text-zinc-100",
      headline: "Boost Store Cart Value by 24%",
      subheadline: "Deploy AI post-purchase upsells and tracking pages instantly"
    },
    {
      name: "Product Showcase",
      desc: "Minimal, centered zoom frame for highlighting fine dashboard components.",
      bg: "bg-gradient-to-tr from-neutral-900 via-stone-900 to-neutral-900",
      accent: "text-amber-400",
      borderColor: "border-neutral-800",
      textColor: "text-neutral-100",
      headline: "Analytics That Speak Results",
      subheadline: "Track active cohorts, LTV, and store conversion dashboards"
    },
    {
      name: "Enterprise",
      desc: "Polished corporate layout with statistics sidebar grids.",
      bg: "bg-gradient-to-tr from-zinc-900 via-neutral-950 to-zinc-900",
      accent: "text-blue-400",
      borderColor: "border-zinc-800",
      textColor: "text-zinc-100",
      headline: "Built for High-Volume Brands",
      subheadline: "Enterprise-grade reliability and automated localized support"
    },
    {
      name: "Modern Shopify",
      desc: "Clean layout designed with native Shopify admin palettes.",
      bg: "bg-gradient-to-tr from-[#1E2E22] via-[#0E1510] to-[#1E2E22]",
      accent: "text-[#3ECFB2]",
      borderColor: "border-emerald-900/30",
      textColor: "text-slate-100",
      headline: "Integrated Directly in Shopify Admin",
      subheadline: "Works seamlessly inside the Shopify admin panel structure"
    }
  ];

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = [
    {
      q: "How does Screenify turn one screenshot into a complete sequence?",
      a: "Screenify uses intelligent layout algorithms and AI copywriting. Once you upload your app screenshot, it analyzes the interface, extracts your primary brand colors, and generates customized marketing copy (like Hooks, Problem statements, and Feature callouts). It then places your screenshot inside clean, modern desktop or mobile mockup shells across a coordinated 5-slide sequence."
    },
    {
      q: "Does it modify or distort my app screenshots?",
      a: "Never. Unlike AI image generators which fabricate pixels and distort interface texts, Screenify treats your screenshot as a vector asset. It performs high-quality scaling, wraps it inside an accurate device mockup frame, and preserves every single detail of your UI."
    },
    {
      q: "Can I customize the colors and copywriting after generation?",
      a: "Yes! Screenify features a rich live Design Studio. You can choose different layout templates, edit the copy, toggle device frames, modify background color palettes, apply dynamic gradients, adjust text sizes, and even customize the watermark."
    },
    {
      q: "What image sizes are generated and exported?",
      a: "All images are designed at exactly 1600x900 pixels. This is the optimal dimension specified by Shopify for desktop App Store listings, ensuring your visuals display in crisp, pixel-perfect quality without being cropped by Shopify's interface."
    },
    {
      q: "Is Screenify really built specifically for Shopify developers?",
      a: "Yes. Traditional banner makers or Figma templates are generic. Screenify is designed around the exact structure of a Shopify App Store listing. It matches Shopify's recommended 5-slot sequence (Hook, Feature 1, Feature 2, Integration, CTA) and allows you to preview your screens inside a live mock Shopify App Store listing simulator before publishing."
    }
  ];

  const Custom3DStyles = () => (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes float3D {
        0%, 100% {
          transform: perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0);
        }
        50% {
          transform: perspective(1000px) rotateX(4deg) rotateY(-1.5deg) translateY(-6px);
        }
      }
      
      @keyframes floatSub {
        0%, 100% {
          transform: perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0);
        }
        50% {
          transform: perspective(1000px) rotateX(2.5deg) rotateY(-1deg) translateY(-3px);
        }
      }

      .animate-float-3d {
        animation: float3D 6s ease-in-out infinite;
        transform-style: preserve-3d;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .animate-float-sub {
        animation: floatSub 6s ease-in-out infinite;
        animation-delay: 0.4s;
        transform-style: preserve-3d;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `}} />
  );

  return (
    <div className="w-full text-foreground select-none">
      <Custom3DStyles />

      {/* BACKGROUND DECORATIVE ELEMENTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden -z-10 opacity-30 dark:opacity-45">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] rounded-full bg-gradient-to-br from-[#3ECFB2] to-transparent blur-[120px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-bl from-[#C8E84A] to-transparent blur-[120px]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-20 md:pb-28 max-w-4xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[#3ECFB2] text-xs font-mono tracking-wider uppercase">
            <Sparkles className="size-3.5" /> Built Exclusively for Shopify Creators
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-balance animate-float-3d">
            Turn Raw Screenshots Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-[#3ECFB2] to-emerald-500 dark:from-[#3ECFB2] dark:via-[#5EEAD4] dark:to-[#C8E84A]">Professional App Store Images</span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed text-balance animate-float-sub">
            Turn raw screenshots into professional, brand-aligned marketing images. Screenify matches your colors, writes engaging copy, and builds ready-to-publish listing graphics instantly—no design experience required.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto pt-2">
            <Button
              onClick={onPick}
              className="bg-[#3ECFB2] dark:bg-gradient-to-r dark:from-[#3ECFB2] dark:to-[#059669] text-ink hover:opacity-95 font-semibold text-base py-6 px-10 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 border-0"
            >
              <Upload className="size-5" /> Get Started — Upload Screenshot
            </Button>
          </div>

          {/* Micro proof badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pt-4 text-xs font-mono text-muted-foreground border-t border-border/60 w-full max-w-xl">
            <span className="flex items-center gap-1"><Check className="size-3.5 text-[#3ECFB2]" /> 1600x900 Optimized</span>
            <span className="flex items-center gap-1"><Check className="size-3.5 text-[#3ECFB2]" /> Exact Brand Matching</span>
            <span className="flex items-center gap-1"><Check className="size-3.5 text-[#3ECFB2]" /> No Figma Skills Required</span>
          </div>
        </div>
      </section>

      {/* BEFORE VS AFTER INTERACTIVE COMPARISON */}
      <section className="py-20 border-t border-border/40 bg-card/20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">

          <div className="space-y-4">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">The Screenify Transformation</h2>
            <p className="max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
              Stop uploading boring raw screenshots. Deliver premium, brand-aligned visual narratives that build trust with merchants instantly.
            </p>
          </div>

          {/* Slider Container */}
          <div
            ref={sliderRef}
            className="relative w-full aspect-[16/9] rounded-2xl border border-border overflow-hidden select-none cursor-ew-resize shadow-2xl group"
            onMouseDown={(e) => { 
              e.preventDefault(); 
              isSliding.current = true; 
              setUserInteracted(true); 
              handleSliderMove(e.clientX); 
            }}
            onTouchStart={(e) => { 
              isSliding.current = true; 
              setUserInteracted(true); 
              if (e.touches[0]) handleSliderMove(e.touches[0].clientX); 
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Background Image / "AFTER" SIDE (Visible on right) */}
            <div className="absolute inset-0 bg-[#0E1510] flex items-center justify-center">
              <img 
                src="/screenify-ready-to-publish.png" 
                alt="After Screenify: Ready to Publish" 
                className="w-full h-full object-contain select-none pointer-events-none"
              />
              {/* After badge */}
              <div className="absolute top-4 right-4 bg-indigo-950/90 backdrop-blur border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-mono text-indigo-400 z-10">
                After Screenify: Ready to Publish
              </div>
            </div>

            {/* Overlay Div / "BEFORE" SIDE (Visible on left, size controlled by sliderPos) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden bg-[#1A1A1A]"
              style={{ width: `${sliderPos}%` }}
            >
              {/* Mirror of the complete inner layout, fixed at full container width */}
              <div className="absolute inset-0 h-full flex items-center justify-center bg-[#F6F6F7]" style={{ width: sliderRef.current?.getBoundingClientRect().width }}>
                <img 
                  src="/shopify-raw-screenshot.jpg" 
                  alt="Before: Raw Shopify Screenshot" 
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
                {/* Before badge */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-slate-300 z-10">
                  Before: Raw Shopify Screenshot
                </div>
              </div>
            </div>

            {/* Slider bar & dragging handle */}
            <div
              className="absolute inset-y-0 w-0.5 bg-[#3ECFB2] shadow-[0_0_10px_#3ECFB2] z-40 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-9 rounded-full bg-zinc-950 border-2 border-[#3ECFB2] flex items-center justify-center shadow-2xl text-[#3ECFB2] hover:scale-110 active:scale-95 transition-transform">
                <Maximize2 className="size-4 rotate-45" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS TIMELINE */}
      <section id="how-it-works" className="py-24 max-w-5xl mx-auto px-6 relative">

        <div className="text-center space-y-4 mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Four Steps to Shopify Success</h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            From raw dashboard state to high-converting App Store storefront graphics in under one minute.
          </p>
        </div>

        {/* Steps container */}
        <div className="relative grid md:grid-cols-4 gap-8">

          {/* Vertical progress line for mobile, horizontal for desktop */}
          <div className="absolute left-[33px] md:left-0 md:top-8 right-0 md:h-0.5 bottom-0 w-0.5 md:w-full bg-border -z-10 hidden md:block" />

          {[
            {
              step: "01",
              title: "Upload Screenshot",
              desc: "Drop a single screenshot of your Shopify admin app dashboard or merchant panel into the uploader.",
              icon: Upload,
              color: "text-[#3ECFB2] bg-[#3ECFB2]/10 border-[#3ECFB2]/20"
            },
            {
              step: "02",
              title: "AI Analysis",
              desc: "Our vision algorithm instantly extracts your brand colors and creates standard contextual copywriting.",
              icon: Sparkles,
              color: "text-[#C8E84A] bg-[#C8E84A]/10 border-[#C8E84A]/20"
            },
            {
              step: "03",
              title: "Design Studio",
              desc: "Fine-tune headlines, switch device frames, modify colors, and synchronize designs across all slides.",
              icon: Layers,
              color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20"
            },
            {
              step: "04",
              title: "Export & Publish",
              desc: "Download all images packed in high-resolution PNG sizes ready to upload directly to the App Store.",
              icon: Download,
              color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
            }
          ].map((item, index) => (
            <div key={index} className="relative flex md:flex-col items-start gap-6 md:gap-4 bg-card/30 border border-border/50 rounded-2xl p-5 md:p-6 hover:bg-card/65 transition-colors group">

              {/* Step indicator */}
              <div className={`size-12 rounded-xl border flex items-center justify-center shrink-0 ${item.color} shadow-inner transition-transform group-hover:scale-110 duration-200`}>
                <item.icon className="size-5" />
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#3ECFB2]">{item.step}.</span>
                  <h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* WHY SCREENIFY (COMPARISON MATRIX) */}
      <section className="py-20 border-t border-border/40 bg-card/10">
        <div className="max-w-4xl mx-auto px-6">

          <div className="text-center space-y-4 mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Stop Wasting Hours in Canva</h2>
            <p className="max-w-xl mx-auto text-base text-muted-foreground">
              Figma or Canva templates require manual resizing, custom color matching, and design skills. Screenify does it instantly.
            </p>
          </div>

          {/* Table Container with 3D Perspective */}
          <div className="w-full [perspective:1200px] py-4 overflow-visible">
            <div 
              className="w-full border border-border/85 rounded-2xl bg-card/30 backdrop-blur-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] [transform:none] md:[transform:rotateX(4deg)_rotateY(-2deg)_rotateZ(0.2deg)] hover:[transform:none] transition-all duration-500 ease-out p-3 sm:p-5 md:p-8 overflow-visible"
            >
              <div className="grid grid-cols-4 gap-y-1.5 md:gap-y-2 gap-x-2 md:gap-x-4 items-center text-[10px] sm:text-xs md:text-sm">
                
                {/* Headers */}
                <div className="font-mono text-[9px] md:text-xs uppercase tracking-wider text-muted-foreground/80 p-2 md:p-4 font-semibold text-left">Feature</div>
                <div className="font-mono text-[9px] md:text-xs uppercase tracking-wider text-muted-foreground/80 p-2 md:p-4 text-center font-semibold">
                  <span className="hidden sm:inline">Canva / Figma</span>
                  <span className="inline sm:hidden">Canva</span>
                </div>
                <div className="font-mono text-[9px] md:text-xs uppercase tracking-wider text-muted-foreground/80 p-2 md:p-4 text-center font-semibold">
                  <span className="hidden sm:inline">Freelance Designer</span>
                  <span className="inline sm:hidden">Freelancer</span>
                </div>
                <div className="relative font-mono text-[9px] md:text-xs uppercase tracking-wider text-[#3ECFB2] font-extrabold p-2 md:p-4 text-center bg-gradient-to-b from-[#3ECFB2]/12 to-[#3ECFB2]/6 rounded-t-xl border-t border-x border-[#3ECFB2]/20 shadow-md shadow-[#3ECFB2]/5">
                  Screenify
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-[#3ECFB2] text-slate-950 font-sans text-[7px] md:text-[9px] font-extrabold px-2 md:px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                    Winner
                  </span>
                </div>

                {/* Rows */}
                {[
                  { f: <>
                      <span className="hidden sm:inline">Generation Speed</span>
                      <span className="inline sm:hidden">Speed</span>
                    </>,
                    c: <>
                      <span className="hidden sm:inline">1 - 2 Hours</span>
                      <span className="inline sm:hidden">1-2 hrs</span>
                    </>,
                    d: <>
                      <span className="hidden sm:inline">3 - 5 Days</span>
                      <span className="inline sm:hidden">3-5 days</span>
                    </>,
                    s: <>
                      <span className="hidden sm:inline">Under 30 Seconds</span>
                      <span className="inline sm:hidden">&lt; 30s</span>
                    </>
                  },
                  { f: <>
                      <span className="hidden sm:inline">Project Pricing</span>
                      <span className="inline sm:hidden">Price</span>
                    </>,
                    c: <>
                      <span className="hidden sm:inline">$15 - $20 / mo</span>
                      <span className="inline sm:hidden">$15-$20/mo</span>
                    </>,
                    d: <>
                      <span className="hidden sm:inline">$150 - $400 / project</span>
                      <span className="inline sm:hidden">$150-$400</span>
                    </>,
                    s: <>
                      <span className="hidden sm:inline">Free / Starter plan</span>
                      <span className="inline sm:hidden">Free / Pro</span>
                    </>
                  },
                  { f: <>
                      <span className="hidden sm:inline">Shopify Dimension Fitting</span>
                      <span className="inline sm:hidden">Shopify Fit</span>
                    </>,
                    c: <>
                      <span className="hidden sm:inline">Manual adjust</span>
                      <span className="inline sm:hidden">Manual</span>
                    </>,
                    d: <>
                      <span className="hidden sm:inline">Needs correction</span>
                      <span className="inline sm:hidden">Needs edit</span>
                    </>,
                    s: <>
                      <span className="hidden sm:inline">Exact 1600x900 default</span>
                      <span className="inline sm:hidden">1600x900</span>
                    </>
                  },
                  { f: <>
                      <span className="hidden sm:inline">Brand Color Extraction</span>
                      <span className="inline sm:hidden">Color Match</span>
                    </>,
                    c: <>
                      <span className="hidden sm:inline">Manual eye-drop</span>
                      <span className="inline sm:hidden">Manual</span>
                    </>,
                    d: <>
                      <span className="hidden sm:inline">Required guidelines</span>
                      <span className="inline sm:hidden">Manual</span>
                    </>,
                    s: <>
                      <span className="hidden sm:inline">Automatic (1-Click)</span>
                      <span className="inline sm:hidden">Auto</span>
                    </>
                  },
                  { f: <>
                      <span className="hidden sm:inline">Contextual Copywriting</span>
                      <span className="inline sm:hidden">AI Copy</span>
                    </>,
                    c: <>
                      <span className="hidden sm:inline">Manual brainstorm</span>
                      <span className="inline sm:hidden">Manual</span>
                    </>,
                    d: <>
                      <span className="hidden sm:inline">Requires copywriter</span>
                      <span className="inline sm:hidden">Manual</span>
                    </>,
                    s: <>
                      <span className="hidden sm:inline">Built-in AI Generation</span>
                      <span className="inline sm:hidden">AI Built-in</span>
                    </>
                  },
                  { f: <>
                      <span className="hidden sm:inline">Batch Style Sync</span>
                      <span className="inline sm:hidden">Style Sync</span>
                    </>,
                    c: <>
                      <span className="hidden sm:inline">Duplicate & adjust</span>
                      <span className="inline sm:hidden">Manual</span>
                    </>,
                    d: <>
                      <span className="hidden sm:inline">N/A</span>
                      <span className="inline sm:hidden">N/A</span>
                    </>,
                    s: <>
                      <span className="hidden sm:inline">Apply to All (1-Click)</span>
                      <span className="inline sm:hidden">1-Click Sync</span>
                    </>
                  }
                ].map((row, idx, arr) => (
                  <div key={idx} className="col-span-4 grid grid-cols-4 items-center gap-x-2 md:gap-x-4 hover:bg-white/5 dark:hover:bg-white/2.5 -mx-2 md:-mx-4 px-2 md:px-4 rounded-lg transition-colors group">
                    {/* Feature Cell */}
                    <div className="py-2.5 md:py-4 font-semibold text-foreground/90 border-b border-border/20 text-left">{row.f}</div>
                    
                    {/* Canva Cell */}
                    <div className="py-2.5 md:py-4 text-muted-foreground text-center border-b border-border/20 font-medium">{row.c}</div>
                    
                    {/* Designer Cell */}
                    <div className="py-2.5 md:py-4 text-muted-foreground text-center border-b border-border/20 font-medium">{row.d}</div>
                    
                    {/* Screenify Cell - Highlighted 3D Pop-out */}
                    <div className={`py-2.5 md:py-4 font-bold text-center bg-[#3ECFB2]/4 border-x border-[#3ECFB2]/15 relative group-hover:bg-[#3ECFB2]/8 transition-colors ${
                      idx === arr.length - 1 ? "rounded-b-xl border-b border-[#3ECFB2]/25 shadow-lg shadow-[#3ECFB2]/3" : "border-b border-border/20"
                    }`}>
                      <span className="flex items-center justify-center gap-1 text-emerald-400 dark:text-[#3ECFB2]">
                        <Check className="size-3 md:size-3.5 shrink-0 text-emerald-500 dark:text-[#3ECFB2]" />
                        <span>{row.s}</span>
                      </span>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>

        </div>
      </section>





      {/* FEATURE HIGHLIGHTS BENTO GRID */}
      <section className="py-24 max-w-5xl mx-auto px-6">

        <div className="text-center space-y-4 mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Everything You Need to Convert</h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            A comprehensive suite of screenshot tools tailored specifically to the requirements of the Shopify ecosystem.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Card 1: One Screenshot */}
          <div className="md:col-span-2 bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-[#3ECFB2]/10 flex items-center justify-center text-[#3ECFB2] border border-[#3ECFB2]/20">
                <Smartphone className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Single Input Storytelling</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload one screenshot. Screenify automatically duplicates, structures, and creates distinct copy overlays across your slides to form a complete narrative sequence.
              </p>
            </div>
            <div className="mt-6 h-28 bg-muted/40 dark:bg-[#121415] rounded-xl border border-border/60 p-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#3ECFB2]/5 to-transparent pointer-events-none" />
              {/* Graphic representing timeline branching */}
              <div className="flex items-center gap-4 h-full">
                <div className="size-14 rounded-lg bg-card border border-border/85 flex items-center justify-center text-[10px] text-muted-foreground font-mono shadow-sm">
                  Input
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
                <div className="flex gap-2 flex-1">
                  <div className="h-14 flex-1 rounded border border-indigo-900/10 bg-indigo-500/5 dark:bg-indigo-950/20 text-[6px] p-1.5 text-muted-foreground flex flex-col justify-between">
                    <span>Hook</span>
                    <div className="h-1 w-8 bg-indigo-650/40 rounded" />
                  </div>
                  <div className="h-14 flex-1 rounded border border-indigo-900/10 bg-indigo-500/5 dark:bg-indigo-950/20 text-[6px] p-1.5 text-muted-foreground flex flex-col justify-between">
                    <span>Feature 1</span>
                    <div className="h-1 w-6 bg-indigo-650/40 rounded" />
                  </div>
                  <div className="h-14 flex-1 rounded border border-indigo-900/10 bg-indigo-500/5 dark:bg-indigo-950/20 text-[6px] p-1.5 text-muted-foreground flex flex-col justify-between">
                    <span>Feature 2</span>
                    <div className="h-1 w-10 bg-indigo-650/40 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Brand Color Detection */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-[#C8E84A]/10 flex items-center justify-center text-[#C8E84A] border border-[#C8E84A]/20">
                <Palette className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Smart Brand Color Detection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Extracts the primary, secondary, and accent colors from your dashboard dashboard automatically to match your brand style exactly.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 pt-2">
              <div className="size-6 rounded-full bg-[#3ECFB2] ring-4 ring-border/40" />
              <div className="size-6 rounded-full bg-[#C8E84A] ring-4 ring-border/40" />
              <div className="size-6 rounded-full bg-indigo-650 ring-4 ring-border/40" />
              <span className="text-xs font-mono text-muted-foreground ml-2">Colors extracted</span>
            </div>
          </div>

          {/* Card 3: Layout Engine */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-indigo-400/10 flex items-center justify-center text-indigo-400 border border-indigo-400/20">
                <Layers className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Smart Layout Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Wrap your screenshots in premium device shells. Toggle between clean browser windows, minimal shadows, or mobile phones.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded bg-muted/30 dark:bg-zinc-900 border border-border text-[10px] text-foreground font-mono">Chrome browser</span>
              <span className="px-2.5 py-1 rounded bg-muted/30 dark:bg-zinc-900 border border-border text-[10px] text-foreground font-mono">Safari header</span>
              <span className="px-2.5 py-1 rounded bg-muted/30 dark:bg-zinc-900 border border-border text-[10px] text-foreground font-mono">iPhone 16 Shell</span>
            </div>
          </div>

          {/* Card 4: Preservation */}
          <div className="md:col-span-2 bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400 border border-emerald-400/20">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Strict Screenshot UI Preservation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We do not use destructive AI models that distort numbers, text, or elements. Your screenshot remains crisp, readable, and true to your product.
              </p>
            </div>
            <div className="mt-6 h-24 bg-muted/40 dark:bg-[#121415] rounded-xl border border-border/60 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="size-5 text-emerald-500" />
                <span className="text-xs font-mono text-foreground font-bold">100% Original Resolution Maintained</span>
              </div>
              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 font-mono">Pixel-Perfect ✓</span>
            </div>
          </div>

          {/* Bento row 3 - details */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-orange-400/10 flex items-center justify-center text-orange-400 border border-orange-400/20">
                <Flame className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">ASO Copy Generation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                App Store Optimization narrative copy is generated automatically based on target merchant profile and category.
              </p>
            </div>
          </div>

          <div className="bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-[#3ECFB2]/10 flex items-center justify-center text-[#3ECFB2] border border-[#3ECFB2]/20">
                <Download className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">1-Click ZIP Packaging</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Compress all modified slides into a single, high-quality, lightweight archive ready to download instantly.
              </p>
            </div>
          </div>

          <div className="bg-card/45 border border-border/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:bg-card/75 transition-colors group">
            <div className="space-y-4">
              <div className="size-10 rounded-xl bg-pink-400/10 flex items-center justify-center text-pink-400 border border-pink-400/20">
                <Zap className="size-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Lightning-Fast Rendering</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built on local HTML Canvas processes. Render and scale multiple 1600x900 slides in milliseconds on your device.
              </p>
            </div>
          </div>

        </div>
      </section>



      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 max-w-4xl mx-auto px-6 text-center space-y-16">

        <div className="space-y-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            Get started for free or unlock high-resolution exports and premium layouts.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-2xl mx-auto">

          {/* Free Tier */}
          <div className="border border-border bg-card/35 rounded-2xl p-8 flex flex-col justify-between text-left space-y-8 hover:border-border/80 transition-colors">
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Free Tier</h3>
                <p className="text-xs text-muted-foreground">Perfect for testing templates and copy.</p>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-foreground">$0</span>
                <span className="text-xs text-muted-foreground">/ forever</span>
              </div>
              <div className="space-y-2.5 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="size-4 text-[#3ECFB2] shrink-0" /> 1 Active Screenshot</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-[#3ECFB2] shrink-0" /> Standard Layout Presets</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-[#3ECFB2] shrink-0" /> AI Copy Generation</div>
                <div className="flex items-center gap-2 text-muted-foreground"><X className="size-4 text-red-500 shrink-0" /> Watermarked Exports</div>
              </div>
            </div>
            <Button onClick={onPick} variant="outline" className="w-full py-5 rounded-xl border-border cursor-pointer hover:bg-card">
              Get Started Free
            </Button>
          </div>

          {/* Pro Tier */}
          <div className="border-2 border-[#3ECFB2] bg-gradient-to-b from-card to-background/40 dark:to-zinc-950/40 rounded-2xl p-8 flex flex-col justify-between text-left space-y-8 relative shadow-xl shadow-emerald-500/5 group hover:-translate-y-1 transition-transform">

            {/* Recommended Badge */}
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#C8E84A] text-ink font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
              Most Popular
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Pro Lifetime</h3>
                <p className="text-xs text-muted-foreground">For serious Shopify builders & agencies.</p>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-extrabold text-foreground">$9</span>
                <span className="text-xs text-muted-foreground">/ one-time fee</span>
              </div>
              <div className="space-y-2.5 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="size-4 text-emerald-600 dark:text-[#C8E84A] shrink-0" /> Unlimited Screenshots</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-emerald-600 dark:text-[#C8E84A] shrink-0" /> High-Resolution Exports</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-emerald-600 dark:text-[#C8E84A] shrink-0" /> No Watermarks (Clean PNGs)</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-emerald-600 dark:text-[#C8E84A] shrink-0" /> Apply Style to All Slides (1-Click)</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-emerald-600 dark:text-[#C8E84A] shrink-0" /> Support for Mockup Shells</div>
              </div>
            </div>

            <Button onClick={onPick} className="w-full bg-[#3ECFB2] hover:bg-[#059669] text-ink font-semibold py-5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10">
              Upgrade to Pro
            </Button>
          </div>

        </div>
      </section>

      {/* FAQ SECTION (ACCORDION) */}
      <section id="faq" className="py-20 border-t border-border/40 bg-card/5">
        <div className="max-w-3xl mx-auto px-6">

          <div className="text-center space-y-4 mb-16">
            <span className="text-xs font-mono text-[#C8E84A] uppercase tracking-wider">Common Questions</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">Frequently Asked</h2>
          </div>

          {/* Accordion list */}
          <div className="flex flex-col border border-border/80 rounded-2xl overflow-hidden divide-y divide-border/60 bg-card/35 backdrop-blur-md">
            {faqs.map((faq, i) => (
              <div key={i} className="transition-colors hover:bg-muted/5">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-foreground text-sm md:text-base">{faq.q}</span>
                  <span className={`w-6 h-6 rounded-full border border-border/85 flex items-center justify-center shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-45 border-[#3ECFB2] text-[#3ECFB2]" : "rotate-0 text-muted-foreground"
                    }`}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="stroke-current">
                      <path d="M6 1v10M1 6h10" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FINAL CALL TO ACTION (CTA) */}
      <section className="py-24 max-w-5xl mx-auto px-6 text-center">
        <div className="relative rounded-3xl border-2 border-emerald-500/20 bg-gradient-to-b from-card to-background/60 dark:to-zinc-950 p-8 md:p-16 overflow-hidden shadow-2xl flex flex-col items-center space-y-6">

          {/* Glowing dot grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

          <span className="text-xs font-mono text-[#3ECFB2] uppercase tracking-[0.2em] font-semibold z-10">Instant Generation</span>

          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-none text-foreground max-w-2xl text-balance z-10">
            Create Your First Shopify App Store Creative Today
          </h2>

          <p className="max-w-lg mx-auto text-base text-muted-foreground z-10">
            Stop spending hours manually resizing templates. Upload one screenshot and let Screenify build your marketing sequence in seconds.
          </p>

          <div className="pt-4 z-10">
            <Button
              onClick={onPick}
              className="bg-[#3ECFB2] hover:bg-[#059669] text-ink font-bold text-base py-6 px-10 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center gap-2 border-0"
            >
              <Upload className="size-5" /> Get Started Free <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>

          <span className="text-xs font-mono text-muted-foreground pt-2 z-10">
            No credit card required · Instant download · 100% compliant with Shopify listing rules
          </span>

        </div>
      </section>

    </div>
  );
}
