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

  // 3D Card Tilt State
  const card3DRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isCardHovered, setIsCardHovered] = useState(false);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!card3DRef.current) return;
    const rect = card3DRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    // Rotate max 12 degrees
    const rotateX = -(mouseY / (height / 2)) * 12;
    const rotateY = (mouseX / (width / 2)) * 12;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleCardMouseLeave = () => {
    setIsCardHovered(false);
    setTilt({ x: 0, y: 0 });
  };

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

  return (
    <div className="w-full text-foreground select-none">
      
      {/* BACKGROUND DECORATIVE ELEMENTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden -z-10 opacity-30 dark:opacity-45">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] rounded-full bg-gradient-to-br from-[#3ECFB2] to-transparent blur-[120px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-bl from-[#C8E84A] to-transparent blur-[120px]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-10 pb-20 md:pb-28 max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column - Headline & Call to Action */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[#3ECFB2] text-xs font-mono tracking-wider uppercase">
              <Sparkles className="size-3.5" /> Built Exclusively for Shopify Creators
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-balance">
              Transform One Screenshot Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-[#3ECFB2] to-emerald-500 dark:from-[#3ECFB2] dark:via-[#5EEAD4] dark:to-[#C8E84A]">App Store Images</span> That Convert
            </h1>
            
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed text-balance">
              Upload a single screenshot and generate professional Shopify App Store marketing creatives in seconds. No designers, no Canva, no wasted time.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
              <Button 
                onClick={onPick}
                className="bg-[#3ECFB2] dark:bg-gradient-to-r dark:from-[#3ECFB2] dark:to-[#059669] text-ink hover:opacity-95 font-semibold text-base py-6 px-10 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 border-0"
              >
                <Upload className="size-5" /> Get Started — Upload Screenshot
              </Button>
            </div>

            {/* Micro proof badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-4 text-xs font-mono text-muted-foreground border-t border-border/60 w-full">
              <span className="flex items-center gap-1"><Check className="size-3.5 text-[#3ECFB2]" /> 1600x900 Optimized</span>
              <span className="flex items-center gap-1"><Check className="size-3.5 text-[#3ECFB2]" /> Exact Brand Matching</span>
              <span className="flex items-center gap-1"><Check className="size-3.5 text-[#3ECFB2]" /> No Figma Skills Required</span>
            </div>
          </div>
          
          {/* Right Column - Interactive 3D Showcase */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div 
              ref={card3DRef}
              onMouseMove={handleCardMouseMove}
              onMouseEnter={() => setIsCardHovered(true)}
              onMouseLeave={handleCardMouseLeave}
              className="relative w-full max-w-[420px] aspect-[4/5] rounded-3xl border border-border/80 bg-card/65 backdrop-blur-xl p-6 shadow-2xl transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
              style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isCardHovered ? 1.02 : 1}, ${isCardHovered ? 1.02 : 1}, 1)`,
                transformStyle: "preserve-3d"
              }}
            >
              {/* Mesh ambient glow inside card */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-lime-500/5 pointer-events-none -z-10" />

              {/* Card top banner */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4" style={{ transform: "translateZ(30px)" }}>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500" />
                  <div className="size-3 rounded-full bg-yellow-500" />
                  <div className="size-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">screenify.app/preview</span>
              </div>

              {/* Center visuals - before and after stacking */}
              <div className="relative flex-1 my-6 flex items-center justify-center" style={{ transform: "preserve-3d" }}>
                
                {/* Visual Connector / Scanning Laser */}
                {isCardHovered && (
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#3ECFB2] to-transparent shadow-[0_0_10px_#3ECFB2] z-30 animate-pulse" style={{ top: "45%" }} />
                )}                 {/* Back Element: Raw Input Screenshot */}
                <div 
                  className="absolute w-[85%] aspect-[16/10] rounded-xl border border-border/80 bg-white shadow-lg transition-transform duration-500 overflow-hidden"
                  style={{ 
                    transform: isCardHovered 
                      ? "translateZ(10px) translateY(-50px) rotateX(10deg) rotateY(-5deg) scale(0.9)" 
                      : "translateZ(20px) translateY(-20px) rotate(-3deg)" 
                  }}
                >
                  {/* Browser top header */}
                  <div className="h-5 bg-slate-100 flex items-center px-2.5 gap-1 border-b border-border/40">
                    <div className="size-1.5 rounded-full bg-red-400" />
                    <div className="size-1.5 rounded-full bg-yellow-400" />
                    <div className="size-1.5 rounded-full bg-green-400" />
                    <div className="h-3 w-32 bg-slate-200/60 rounded ml-4" />
                  </div>
                  
                  {/* Main dashboard content */}
                  <div className="flex h-[calc(100%-20px)] bg-slate-50">
                    {/* Tiny Sidebar */}
                    <div className="w-10 bg-slate-900 flex flex-col items-center py-2 gap-3 shrink-0">
                      <div className="size-4 rounded bg-slate-700" />
                      <div className="size-4 rounded bg-slate-700" />
                      <div className="size-4 rounded bg-slate-700" />
                      <div className="size-4 rounded bg-slate-700" />
                    </div>
                    {/* Tiny Content area */}
                    <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <div className="h-3.5 w-24 bg-slate-300 rounded" />
                        <div className="h-3 w-12 bg-slate-200 rounded" />
                      </div>
                      
                      {/* Metric widgets */}
                      <div className="grid grid-cols-3 gap-2 shrink-0">
                        <div className="bg-white border border-border/50 rounded p-1.5 flex flex-col gap-1 shadow-sm">
                          <div className="h-1.5 w-8 bg-slate-200 rounded" />
                          <div className="h-3 w-12 bg-slate-400 rounded" />
                        </div>
                        <div className="bg-white border border-border/50 rounded p-1.5 flex flex-col gap-1 shadow-sm">
                          <div className="h-1.5 w-8 bg-slate-200 rounded" />
                          <div className="h-3 w-10 bg-slate-400 rounded" />
                        </div>
                        <div className="bg-white border border-border/50 rounded p-1.5 flex flex-col gap-1 shadow-sm">
                          <div className="h-1.5 w-8 bg-slate-200 rounded" />
                          <div className="h-3 w-8 bg-slate-400 rounded" />
                        </div>
                      </div>

                      {/* Main Chart Graphic */}
                      <div className="flex-1 bg-white border border-border/50 rounded p-2 flex flex-col justify-between shadow-sm relative min-h-[48px]">
                        <div className="absolute inset-0 p-2 opacity-15 flex flex-col justify-between pointer-events-none">
                          <div className="w-full h-px bg-slate-300" />
                          <div className="w-full h-px bg-slate-300" />
                          <div className="w-full h-px bg-slate-300" />
                        </div>
                        {/* SVG Drawing of line chart */}
                        <svg className="w-full h-full text-emerald-500 overflow-visible z-10" viewBox="0 0 100 40">
                          <path 
                            d="M0 35 Q15 20, 30 25 T60 10 T90 5 T100 0" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                          />
                          {/* Points */}
                          <circle cx="30" cy="25" r="2" fill="currentColor" />
                          <circle cx="60" cy="10" r="2" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-zinc-900 border border-border px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 shadow-md z-20">
                    Before: Raw Screenshot
                  </div>
                </div>

                {/* Front Element: Screenify Rendered Creative */}
                <div 
                  className="absolute w-[90%] aspect-[16/9] rounded-xl border border-emerald-500/25 bg-gradient-to-br from-slate-950 via-[#0A1512] to-slate-950 p-3 shadow-2xl transition-transform duration-500 overflow-hidden"
                  style={{ 
                    transform: isCardHovered 
                      ? "translateZ(70px) translateY(40px) rotateX(5deg) rotateY(8deg) scale(1.05)" 
                      : "translateZ(50px) translateY(30px) rotate(2deg)" 
                  }}
                >
                  {/* Banner overlay glow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-lime-500/5 pointer-events-none" />

                  <div className="w-full h-full flex flex-col justify-between relative rounded-lg overflow-hidden border border-emerald-500/10 p-4 bg-[#0A1512]/40 backdrop-blur-sm">
                    
                    {/* Mock copy */}
                    <div className="space-y-1 text-left z-20">
                      <span className="text-[7px] font-bold font-mono text-[#3ECFB2] uppercase tracking-wider">01. Live Analytics</span>
                      <h4 className="text-sm font-extrabold text-slate-100 font-display leading-tight">Track Store LTV in Real-Time</h4>
                      <p className="text-[7px] text-slate-450">Increase merchant checkout value with live dashboards.</p>
                    </div>

                    {/* Framed device */}
                    <div className="w-[85%] mx-auto mt-2 h-[68px] bg-slate-900/90 rounded-t-lg border-t border-x border-slate-700/60 overflow-hidden p-1 shadow-2xl flex flex-col transform translate-y-1">
                      <div className="h-3 bg-slate-950/80 rounded-t-md flex items-center px-2 gap-1 border-b border-slate-800">
                        <div className="size-1 rounded-full bg-slate-700" />
                        <div className="size-1 rounded-full bg-slate-700" />
                        <span className="text-[6px] text-slate-500 ml-1 font-mono">dashboard / analytics</span>
                      </div>
                      <div className="flex-1 bg-white flex overflow-hidden">
                        {/* Miniature layout of raw screen */}
                        <div className="w-6 bg-slate-900 py-1 flex flex-col items-center shrink-0">
                          <div className="size-2 rounded-full bg-slate-700" />
                        </div>
                        <div className="flex-1 p-1 flex flex-col gap-1 overflow-hidden">
                          <div className="h-1.5 w-8 bg-slate-300 rounded" />
                          <div className="grid grid-cols-2 gap-1 shrink-0">
                            <div className="bg-slate-50 border border-slate-200 rounded p-0.5 flex flex-col gap-0.5">
                              <div className="h-[2px] w-4 bg-slate-300 rounded" />
                              <div className="h-1 bg-[#3ECFB2] rounded" />
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded p-0.5 flex flex-col gap-0.5">
                              <div className="h-[2px] w-4 bg-slate-300 rounded" />
                              <div className="h-1 bg-[#3ECFB2] rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-2 -left-2 bg-emerald-950 border border-emerald-500/35 px-2 py-0.5 rounded text-[10px] font-mono text-[#3ECFB2] shadow-md z-20">
                    After: Conversion Optimized
                  </div>
                </div>

                {/* Floating Tags (Depth Effect) */}
                <div 
                  className="absolute right-0 top-6 bg-[#C8E84A] text-ink text-[10px] font-bold font-mono px-2 py-1 rounded-lg shadow-lg transition-transform duration-500"
                  style={{ transform: isCardHovered ? "translateZ(100px) translateX(25px) translateY(-10px)" : "translateZ(30px) translateX(10px)" }}
                >
                  ✨ AI Copy
                </div>

                <div 
                  className="absolute left-[-10px] bottom-12 bg-zinc-900/90 text-[#3ECFB2] border border-border/80 text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-lg transition-transform duration-500"
                  style={{ transform: isCardHovered ? "translateZ(85px) translateX(-25px) translateY(20px)" : "translateZ(40px) translateX(-5px)" }}
                >
                  🎨 Brand Colors Match
                </div>

              </div>

              {/* Card bottom footer info */}
              <div className="flex items-center justify-between border-t border-border/40 pt-4" style={{ transform: "translateZ(40px)" }}>
                <span className="text-xs text-muted-foreground font-mono">Hover to inspect layout depth</span>
                <span className="text-xs text-[#3ECFB2] font-semibold flex items-center gap-1">Screenify AI <Sparkles className="size-3" /></span>
              </div>
            </div>
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
            onMouseDown={(e) => { e.preventDefault(); isSliding.current = true; handleSliderMove(e.clientX); }}
            onTouchStart={(e) => { isSliding.current = true; if(e.touches[0]) handleSliderMove(e.touches[0].clientX); }}
          >
            {/* Background Image / "BEFORE" SIDE (Visible on right) */}
            <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col items-center justify-center p-8 md:p-16">
              {/* Dull raw screenshot mockup */}
              <div className="w-full h-full rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg p-3 flex flex-col">
                <div className="h-5 bg-zinc-800/80 rounded-t flex items-center px-3 gap-1.5 border-b border-zinc-700/50">
                  <div className="size-2.5 rounded-full bg-zinc-700" />
                  <div className="size-2.5 rounded-full bg-zinc-700" />
                  <span className="text-[10px] font-mono text-zinc-500 ml-2">Shopify Admin / analytics</span>
                </div>
                <div className="flex-1 bg-zinc-950 p-4 flex flex-col gap-3">
                  <div className="h-6 w-32 bg-zinc-800 rounded" />
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <div className="bg-zinc-900 border border-zinc-850 rounded p-3 flex flex-col justify-between">
                      <div className="h-3 w-12 bg-zinc-850 rounded" />
                      <div className="h-6 w-20 bg-zinc-800 rounded" />
                    </div>
                    <div className="bg-zinc-900 border border-zinc-850 rounded p-3 flex flex-col justify-between">
                      <div className="h-3 w-12 bg-zinc-850 rounded" />
                      <div className="h-6 w-16 bg-zinc-800 rounded" />
                    </div>
                    <div className="bg-zinc-900 border border-zinc-850 rounded p-3 flex flex-col justify-between">
                      <div className="h-3 w-12 bg-zinc-850 rounded" />
                      <div className="h-6 w-14 bg-zinc-800 rounded" />
                    </div>
                  </div>
                  <div className="h-16 bg-zinc-900 border border-zinc-850 rounded" />
                </div>
              </div>
              
              {/* Before badge */}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
                Before: Raw Shopify Screenshot
              </div>
            </div>

            {/* Overlay Div / "AFTER" SIDE (Visible on left, size controlled by sliderPos) */}
            <div 
              className="absolute inset-y-0 left-0 overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900"
              style={{ width: `${sliderPos}%` }}
            >
              {/* Mirror of the complete inner layout, fixed at full container width */}
              <div className="absolute inset-0 w-[864px] md:w-[896px] lg:w-[896px] h-full flex flex-col justify-between p-8 md:p-12" style={{ width: sliderRef.current?.getBoundingClientRect().width }}>
                
                {/* Visual Header copywriting */}
                <div className="space-y-1.5 text-left max-w-md">
                  <span className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest">01. Live Analytics</span>
                  <h3 className="text-xl md:text-3xl font-bold font-display text-white">Track Store Revenue & LTV In Real-Time</h3>
                </div>

                {/* Styled screenshot inside a beautiful canvas device */}
                <div className="w-[85%] mx-auto mt-4 bg-slate-950 border border-slate-700/80 rounded-t-xl overflow-hidden p-2 shadow-2xl flex flex-col transform translate-y-2 border-b-0">
                  <div className="h-6 bg-slate-900/90 flex items-center px-4 gap-2 border-b border-slate-800">
                    <div className="size-2 rounded-full bg-red-500/80" />
                    <div className="size-2 rounded-full bg-yellow-500/80" />
                    <div className="size-2 rounded-full bg-green-500/80" />
                    <span className="text-[10px] font-mono text-slate-400 ml-2">Orderly Dashboard / Analytics</span>
                  </div>
                  <div className="bg-slate-950 p-4 flex flex-col gap-3">
                    <div className="h-5 w-24 bg-indigo-900/30 rounded border border-indigo-800/30" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded p-3 flex flex-col justify-between">
                        <div className="h-2 w-8 bg-slate-700 rounded" />
                        <div className="text-sm font-bold text-[#3ECFB2] font-mono mt-2">$24,930</div>
                      </div>
                      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded p-3 flex flex-col justify-between">
                        <div className="h-2 w-8 bg-slate-700 rounded" />
                        <div className="text-sm font-bold text-[#3ECFB2] font-mono mt-2">+12.4%</div>
                      </div>
                      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded p-3 flex flex-col justify-between">
                        <div className="h-2 w-8 bg-slate-700 rounded" />
                        <div className="text-sm font-bold text-[#3ECFB2] font-mono mt-2">1,824 orders</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* After badge */}
                <div className="absolute top-4 left-4 bg-indigo-950/90 backdrop-blur border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-mono text-indigo-400">
                  After Screenify: Ready to Publish
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

          <div className="flex justify-center gap-4 text-xs font-mono text-muted-foreground pt-2">
            <span>← Slide left to reveal the RAW SCREENSHOT</span>
            <span className="text-border">|</span>
            <span>Slide right to reveal the DESIGNED CREATIVE →</span>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS TIMELINE */}
      <section className="py-24 max-w-5xl mx-auto px-6 relative">
        
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

          {/* Table Container */}
          <div className="overflow-x-auto border border-border rounded-2xl bg-card/35 backdrop-blur-md">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-5">Feature</th>
                  <th className="p-5">Canva / Figma</th>
                  <th className="p-5">Freelance Designer</th>
                  <th className="p-5 text-[#3ECFB2] bg-[#3ECFB2]/5 font-bold">Screenify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  { f: "Generation Speed", c: "1 - 2 Hours", d: "3 - 5 Days", s: "Under 30 Seconds", highlight: true },
                  { f: "Project Pricing", c: "$15 - $20 / mo", d: "$150 - $400 / project", s: "Free / Starter plan", highlight: false },
                  { f: "Shopify Dimension Fitting", c: "Manual adjust", d: "Needs correction", s: "Exact 1600x900 default", highlight: false },
                  { f: "Brand Color Extraction", c: "Manual eye-drop", d: "Required guidelines", s: "Automatic (1-Click)", highlight: false },
                  { f: "Contextual Copywriting", c: "Manual brainstorm", d: "Requires copywriter", s: "Built-in AI Generation", highlight: false },
                  { f: "Batch Style Sync", c: "Duplicate & adjust", d: "N/A", s: "Apply to All (1-Click)", highlight: true }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="p-5 font-medium text-foreground">{row.f}</td>
                    <td className="p-5 text-muted-foreground">{row.c}</td>
                    <td className="p-5 text-muted-foreground">{row.d}</td>
                    <td className={`p-5 font-bold bg-[#3ECFB2]/5 ${row.highlight ? "text-emerald-600 dark:text-[#C8E84A]" : "text-emerald-500 dark:text-[#3ECFB2]"}`}>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500 dark:text-[#3ECFB2]" /> {row.s}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* TEMPLATE SHOWCASE CAROUSEL */}
      <section className="py-24 max-w-5xl mx-auto px-6 overflow-hidden">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Carousel Left Text */}
          <div className="lg:col-span-4 text-left space-y-6">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Designed For High Conversion
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We analyzed the top 100 most successful Shopify App Store listings. Screenify incorporates their exact design hierarchies, margins, and presentation structures.
            </p>
            
            {/* Slide list indicators */}
            <div className="flex flex-col gap-2 pt-2">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTemplate(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    activeTemplate === i 
                      ? "bg-card border-border/80 text-foreground shadow-md font-semibold font-sans" 
                      : "border-transparent text-muted-foreground hover:text-foreground font-sans"
                  }`}
                >
                  <span>{tpl.name}</span>
                  {activeTemplate === i && <ChevronRight className="size-4 text-[#3ECFB2]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Carousel Right Visual Preview */}
          <div className="lg:col-span-8 flex flex-col items-center">
            
            {/* Template Container Card */}
            <div className={`w-full aspect-[16/9] rounded-2xl ${templates[activeTemplate].bg} border ${templates[activeTemplate].borderColor} p-6 md:p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden transition-all duration-500`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              
              {/* Copy Area */}
              <div className="space-y-1.5 text-left max-w-lg z-10">
                <span className={`text-[10px] md:text-xs font-mono font-bold ${templates[activeTemplate].accent} uppercase tracking-widest`}>
                  02. Real-Time Tracking
                </span>
                <h3 className={`text-xl md:text-3xl font-bold font-display ${templates[activeTemplate].textColor}`}>
                  {templates[activeTemplate].headline}
                </h3>
                <p className="text-xs md:text-sm text-slate-400">
                  {templates[activeTemplate].subheadline}
                </p>
              </div>

              {/* Mock Dashboard Screenshot Container */}
              <div className="w-[85%] mx-auto mt-4 bg-slate-950 border border-slate-700/60 rounded-t-lg overflow-hidden p-1 shadow-2xl flex flex-col transform translate-y-4">
                <div className="h-4 bg-slate-900 flex items-center px-3 gap-1 border-b border-slate-800">
                  <div className="size-1.5 rounded-full bg-slate-700" /><div className="size-1.5 rounded-full bg-slate-700" />
                  <span className="text-[8px] text-slate-500 ml-1 font-mono">orderly-tracking-hub</span>
                </div>
                
                {/* Simulated charts inside screenshot */}
                <div className="bg-slate-950 p-2.5 flex flex-col gap-2">
                  <div className="h-3 w-16 bg-slate-800 rounded" />
                  <div className="flex gap-2">
                    <div className="bg-indigo-950/20 border border-indigo-900/10 rounded flex-1 p-2 flex flex-col justify-between">
                      <div className="h-1 w-6 bg-slate-700 rounded" />
                      <div className="text-[10px] font-bold text-slate-300 font-mono mt-1">$42,910</div>
                    </div>
                    <div className="bg-indigo-950/20 border border-indigo-900/10 rounded flex-1 p-2 flex flex-col justify-between">
                      <div className="h-1 w-6 bg-slate-700 rounded" />
                      <div className="text-[10px] font-bold text-slate-300 font-mono mt-1">+8.5%</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Template description */}
            <p className="text-xs font-mono text-muted-foreground mt-4">
              Preset style: <strong className="text-emerald-600 dark:text-[#3ECFB2]">{templates[activeTemplate].name}</strong> · {templates[activeTemplate].desc}
            </p>

          </div>

        </div>
      </section>

      {/* SHOPIFY DEVELOPER FOCUS SECTION */}
      <section className="py-20 border-t border-border/40 bg-muted/30 dark:bg-[#0c0f0d] relative overflow-hidden">
        
        {/* Subtle green ambient circle glow */}
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-950/10 dark:bg-emerald-950/20 blur-[150px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-4">
            <span className="text-xs font-mono text-emerald-600 dark:text-[#3ECFB2] uppercase tracking-[0.2em] font-semibold">Listing Simulator</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">Built Specifically for the Shopify App Store</h2>
            <p className="max-w-2xl mx-auto text-base text-muted-foreground">
              Merchant install rates are heavily driven by visual trust. Screenify formats your uploads to fit perfectly inside the App Store screenshot carousel.
            </p>
          </div>

          {/* Shopify App Store UI Simulator */}
          <div className="border border-border/80 rounded-2xl bg-card dark:bg-zinc-950/80 shadow-2xl p-4 md:p-6 text-left max-w-4xl mx-auto font-sans">
            
            {/* Mock Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
              <div className="flex items-center gap-4">
                {/* Mock Logo */}
                <div className="size-16 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
                  O
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground font-display">Orderly · Shipment Tracking</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">By Screenify Labs</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5 text-yellow-500"><Star className="size-3 fill-yellow-400" /> 4.9 (182 reviews)</span>
                  </div>
                </div>
              </div>
              <Button size="sm" className="bg-[#008060] hover:bg-[#006e52] text-white font-semibold rounded-lg px-5 py-2 pointer-events-none border-0">
                Install App
              </Button>
            </div>

            {/* Mock Screenshot Slider Container */}
            <div className="pt-6 space-y-4">
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Storefront Screenshot Carousel Preview</h4>
              
              {/* Flex Slider Track */}
              <div className="flex gap-4 overflow-x-auto pb-4 w-full scrollbar-thin">
                
                {/* Generated Slide 1 */}
                <div className="w-[300px] shrink-0 aspect-[16/9] rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 border border-slate-800/80 p-3 flex flex-col justify-between shadow">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[6px] font-bold text-indigo-400 font-mono">01. HOOK</span>
                    <h5 className="text-[9px] font-bold text-white font-display">Reduce Support Tickets & Chargebacks</h5>
                  </div>
                  <div className="w-[80%] mx-auto bg-slate-950 border border-slate-800 rounded-t-md p-0.5 flex flex-col transform translate-y-1 h-14 overflow-hidden">
                    <div className="h-1 bg-slate-900" />
                    <div className="flex-1 bg-slate-950 p-1 flex items-center justify-center text-[5px] text-[#3ECFB2] font-mono">
                      Order analytics mockup
                    </div>
                  </div>
                </div>

                {/* Generated Slide 2 */}
                <div className="w-[300px] shrink-0 aspect-[16/9] rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 border border-slate-800/80 p-3 flex flex-col justify-between shadow">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[6px] font-bold text-indigo-400 font-mono">02. VALUE</span>
                    <h5 className="text-[9px] font-bold text-white font-display">Provide Branded Post-Purchase Tracking</h5>
                  </div>
                  <div className="w-[80%] mx-auto bg-slate-950 border border-slate-800 rounded-t-md p-0.5 flex flex-col transform translate-y-1 h-14 overflow-hidden">
                    <div className="h-1 bg-slate-900" />
                    <div className="flex-1 bg-slate-950 p-1 flex items-center justify-center text-[5px] text-[#3ECFB2] font-mono">
                      Interactive track details mockup
                    </div>
                  </div>
                </div>

                {/* Generated Slide 3 */}
                <div className="w-[300px] shrink-0 aspect-[16/9] rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 border border-slate-800/80 p-3 flex flex-col justify-between shadow">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[6px] font-bold text-indigo-400 font-mono">03. DETAILS</span>
                    <h5 className="text-[9px] font-bold text-white font-display">Automate Shipment Notification Alerts</h5>
                  </div>
                  <div className="w-[80%] mx-auto bg-slate-950 border border-slate-800 rounded-t-md p-0.5 flex flex-col transform translate-y-1 h-14 overflow-hidden">
                    <div className="h-1 bg-slate-900" />
                    <div className="flex-1 bg-slate-950 p-1 flex items-center justify-center text-[5px] text-[#3ECFB2] font-mono">
                      SMS and Email template mockup
                    </div>
                  </div>
                </div>

              </div>

              {/* Slider footer bar */}
              <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border pt-4 font-mono">
                <span>← Swipe to explore sequences</span>
                <span className="text-emerald-600 dark:text-[#3ECFB2] font-semibold">Recommended sequence format compliant</span>
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

      {/* TRUST & SOCIAL PROOF */}
      <section className="py-20 border-y border-border/40 bg-card/15">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold tracking-tight text-muted-foreground uppercase text-xs tracking-[0.25em]">Loved by indie hackers & agencies</h2>
            <p className="max-w-xl mx-auto text-2xl md:text-3xl font-display font-medium text-foreground">
              "Finally, a tool built specifically for Shopify app store design guidelines."
            </p>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            
            {[
              {
                text: "I spent hours adjusting shadows and copywriting in Figma for our order-tracking app listing. Screenify did the entire sequence in 30 seconds. The brand color matching is eerily accurate.",
                author: "Dan L.",
                role: "Founder, Orderly App",
                stars: 5
              },
              {
                text: "As a Shopify App Agency, we launch 3-4 apps a month for clients. Screenify has saved our designer hours of work per project. The layouts fit the App Store specifications perfectly.",
                author: "Samantha K.",
                role: "Creative Director, Shopify Launch Lab",
                stars: 5
              },
              {
                text: "Indie hackers don't have time to master design. Screenify took my raw screenshot, wrote stellar hook copy, and generated a premium layout that got approved by Shopify on the first try.",
                author: "Marc-Andre F.",
                role: "Solo Creator, Bundler Express",
                stars: 5
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-md hover:border-border transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="size-4 fill-yellow-400 shrink-0" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>
                <div className="flex items-center gap-3 border-t border-border/40 pt-4 mt-2">
                  <div className="size-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-[#3ECFB2] border border-border">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{t.author}</h4>
                    <p className="text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}

          </div>

          {/* Client Logos / Tech details */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40 grayscale contrast-150">
            <span className="font-display font-extrabold text-lg text-foreground/45 dark:text-slate-100/45 tracking-wider">SHOPIFY AGENCIES</span>
            <span className="font-display font-extrabold text-lg text-foreground/45 dark:text-slate-100/45 tracking-wider">INDIE HACKERS CORP</span>
            <span className="font-display font-extrabold text-lg text-foreground/45 dark:text-slate-100/45 tracking-wider">APP GROWTH CO</span>
            <span className="font-display font-extrabold text-lg text-foreground/45 dark:text-slate-100/45 tracking-wider">SAAS LAUNCH</span>
          </div>

        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center space-y-16">
        
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
                <span className="text-4xl font-extrabold text-foreground">$29</span>
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
      <section className="py-20 border-t border-border/40 bg-card/5">
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
                  <span className={`w-6 h-6 rounded-full border border-border/85 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    openFaq === i ? "rotate-45 border-[#3ECFB2] text-[#3ECFB2]" : "rotate-0 text-muted-foreground"
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
