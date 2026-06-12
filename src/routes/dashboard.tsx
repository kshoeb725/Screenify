import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";
import { 
  Loader2, 
  Image as ImageIcon, 
  CreditCard, 
  User as UserIcon, 
  Download, 
  LogOut, 
  Settings as SettingsIcon, 
  Plus,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PaymentDialog } from "@/components/PaymentDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, loading, logout } = useAuth();
  const { theme, toggle } = useTheme();
  
  const [activeTab, setActiveTab] = useState("screenshots");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const toastId = toast.loading("Processing screenshot(s)...");
    const fileArray = Array.from(files);
    const processedDataUrls: string[] = [];
    let loadedCount = 0;

    fileArray.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image.`);
        loadedCount++;
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" is too large (>10MB).`);
        loadedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processedDataUrls.push(event.target.result as string);
        }
        loadedCount++;
        if (loadedCount === fileArray.length) {
          if (processedDataUrls.length === 0) {
            toast.dismiss(toastId);
            toast.error("No valid images selected.");
            return;
          }

          // Build a clean 6-slot array matching the landing page expectation
          const nextPreviews = Array(6).fill(null);
          processedDataUrls.forEach((url, idx) => {
            if (idx < 6) nextPreviews[idx] = url;
          });

          // Reset all other editor states
          localStorage.removeItem("screenmint_result");
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

          // Save screenshots
          localStorage.setItem("screenmint_previews", JSON.stringify(nextPreviews));
          localStorage.setItem("screenmint_status", "preview");

          toast.dismiss(toastId);
          toast.success("Screenshots loaded! Opening design editor.");
          
          navigate({ to: "/" });
        }
      };
      reader.onerror = () => {
        loadedCount++;
        toast.error(`Failed to read "${file.name}".`);
      };
      reader.readAsDataURL(file);
    });
  };

  // Protected Route: Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  // Fetch submissions and payments when user is loaded
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoadingData(true);
      try {
        // Fetch submissions matching user's email
        const { data: subData, error: subError } = await supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false });

        if (!subError && subData) {
          // Client-side filter to double-check matching email if needed, 
          // although RLS policy already handles filtering on email = auth.jwt()->>'email'
          setSubmissions(subData);
        }

        // Fetch payments matching user's email
        const { data: payData, error: payError } = await supabase
          .from("payments")
          .select("*")
          .order("created_at", { ascending: false });

        if (!payError && payData) {
          setPayments(payData);
          const activePro = payData.some((p) => p.status === "completed" || p.status === "paid");
          setHasPaid(activePro);
        }
      } catch (err) {
        console.error("Error loading user dashboard data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  const handlePaidSuccess = () => {
    setHasPaid(true);
    // Refresh payments list
    if (user) {
      supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setPayments(data);
        });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-[#3ECFB2]" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Creator";
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const loginProvider = user?.app_metadata?.provider || "email";

  return (
    <main className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden flex flex-col grain">
      
      {/* Background radial blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden -z-10 opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] rounded-full bg-gradient-to-br from-[#3ECFB2] to-transparent blur-[130px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-bl from-[#C8E84A] to-transparent blur-[130px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition">
              <img src="/screenmint-icon.png" alt="Screenify Logo" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Screen<span className="text-[#3ECFB2]">ify</span>
              </span>
            </Link>
          </div>

          {/* Centered 3D Dashboard Title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
            <span className="text-lg md:text-xl font-black uppercase tracking-widest text-3d font-sans">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 z-10">

            {/* Theme Toggle Button */}
            <button
              onClick={toggle}
              className="inline-flex items-center justify-center rounded-full border border-border p-2.5 hover:bg-card transition cursor-pointer text-foreground"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full border border-border/80 p-0.5 focus:outline-none cursor-pointer hover:border-[#3ECFB2]/50 transition">
                {userAvatar ? (
                  <Avatar className="size-8">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="size-8 rounded-full bg-[#3ECFB2]/15 text-[#3ECFB2] flex items-center justify-center text-xs font-bold font-mono">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border border-border/60 text-popover-foreground min-w-[160px] rounded-xl p-1.5 space-y-1">
                <DropdownMenuItem className="rounded-lg text-xs hover:bg-[#3ECFB2]/15 hover:text-[#3ECFB2] cursor-pointer py-2 px-3">
                  <Link to="/" className="w-full h-full flex items-center gap-2">
                    <Plus className="size-3.5" /> Editor View
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
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-12 space-y-10">
        
        {/* Welcome Section */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Hello, {displayName}</h1>
              {hasPaid && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3ECFB2]/15 text-[#3ECFB2] text-[10px] font-mono font-bold tracking-wide uppercase border border-[#3ECFB2]/20">
                  <Sparkles className="size-3" /> Pro Lifetime
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage your generated creatives, billing info, and account settings.</p>
          </div>
        </section>

        {/* Core Tabbed Layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <TabsList className="flex items-center gap-6 border-b border-border/40 bg-transparent rounded-none p-0 w-full justify-start h-auto">
            <TabsTrigger 
              value="screenshots" 
              className="relative pb-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#3ECFB2] data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition font-semibold text-xs px-1 flex items-center gap-2 cursor-pointer"
            >
              <ImageIcon className="size-4" /> Generated Screenshots
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="relative pb-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#3ECFB2] data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition font-semibold text-xs px-1 flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="size-4" /> Billing & License
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="relative pb-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#3ECFB2] data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition font-semibold text-xs px-1 flex items-center gap-2 cursor-pointer"
            >
              <UserIcon className="size-4" /> Account Profile
            </TabsTrigger>
          </TabsList>

          {/* Screenshots Content */}
          <TabsContent value="screenshots" className="space-y-6">
            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="size-8 animate-spin text-[#3ECFB2]" />
              </div>
            ) : submissions.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {submissions.map((sub) => {
                  const date = new Date(sub.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });
                  // Parse generated slides array from public.submissions table
                  let slidesList: any[] = [];
                  try {
                    if (sub.generated_images) {
                      slidesList = Array.isArray(sub.generated_images) 
                        ? sub.generated_images 
                        : JSON.parse(sub.generated_images as string);
                    }
                  } catch (e) {
                    console.error("Failed to parse generated slides:", e);
                  }

                  // Parse color palette
                  let paletteList: string[] = [];
                  try {
                    if (sub.palette) {
                      paletteList = Array.isArray(sub.palette)
                        ? sub.palette
                        : JSON.parse(sub.palette as string);
                    }
                  } catch (e) {}

                  const primaryColor = paletteList[0] || "#3ECFB2";
                  const accentColor = paletteList[1] || "#8B5CF6";
                  const bgColor = paletteList[2] || "#0F0F11";

                  return (
                    <Card key={sub.id} className="border border-border/40 bg-card/20 hover:bg-card/50 hover:border-border/80 transition-all duration-300 flex flex-col justify-between overflow-hidden group rounded-2xl shadow-lg hover:shadow-2xl">
                      <div className="p-6 space-y-5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono text-[#3ECFB2] font-semibold bg-[#3ECFB2]/5 px-2.5 py-1 rounded-full border border-[#3ECFB2]/15 capitalize">
                            {sub.objective || "Optimize"}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3" /> {date}
                          </span>
                        </div>
                        <div className="text-left space-y-1">
                          <CardTitle className="text-lg font-bold text-foreground group-hover:text-[#3ECFB2] transition-colors">{sub.app_name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-1 text-muted-foreground">{sub.target_audience}</CardDescription>
                        </div>

                        {/* CSS-based simulated slides preview */}
                        {slidesList.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 pt-1.5">
                            {slidesList.slice(0, 3).map((slide, idx) => {
                              const headline = slide.variants?.benefit?.headline || 
                                               slide.variants?.feature?.headline || 
                                               slide.variants?.outcome?.headline || 
                                               "Feature Highlight";
                              
                              const template = slide.suggestedTemplate || "showcase";
                              const preset = slide.suggestedPreset || "gradient";
                              
                              // Setup dynamic background style based on preset/palette
                              let bgStyle: React.CSSProperties = {};
                              if (preset === "gradient" || preset === "modern") {
                                bgStyle = {
                                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
                                };
                              } else if (preset === "dark" || bgColor === "#000000" || bgColor === "#0C0C0E") {
                                bgStyle = {
                                  background: `linear-gradient(135deg, #151518 0%, #0C0C0E 100%)`
                                };
                              } else {
                                bgStyle = {
                                  background: `linear-gradient(135deg, ${bgColor} 0%, #1F2937 100%)`
                                };
                              }

                              return (
                                <div 
                                  key={idx} 
                                  style={bgStyle}
                                  className="aspect-[16/9] rounded-xl overflow-hidden border border-white/10 relative p-2 flex flex-col justify-between shadow-inner select-none pointer-events-none group-hover:scale-[1.02] transition-all duration-300"
                                >
                                  {/* Slide text preview */}
                                  <div className="space-y-0.5 text-left max-w-[90%]">
                                    <p className="text-[6px] font-black leading-tight tracking-tight text-white line-clamp-1">
                                      {headline}
                                    </p>
                                    <div className="w-4 h-[1px] bg-white/40 rounded-full" />
                                  </div>

                                  {/* Device mock simulation */}
                                  <div className="h-6 w-[80%] mx-auto bg-white/5 backdrop-blur-[2px] border border-white/10 rounded-t-md flex flex-col p-0.5 gap-0.5 mt-auto overflow-hidden">
                                    <div className="flex items-center gap-0.5 scale-75 origin-left mb-0.5">
                                      <div className="size-0.5 rounded-full bg-white/30" />
                                      <div className="size-0.5 rounded-full bg-white/20" />
                                    </div>
                                    <div className="w-full h-full bg-black/40 rounded flex flex-col items-center justify-center p-0.5 gap-0.5">
                                      <div className="w-5 h-0.5 bg-white/10 rounded-full" />
                                    </div>
                                  </div>
                                  
                                  {/* Template indicator badge */}
                                  <span className="absolute bottom-1 right-1 text-[5px] font-mono text-white/50 bg-black/35 px-1 py-0.2 rounded uppercase tracking-wider scale-75 origin-bottom-right">
                                    {template.slice(0, 4)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-border/40 bg-muted/20 px-6 py-4 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">{slidesList.length} slide creatives</span>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            toast.info("Opening screenshot templates...");
                            navigate({ to: "/" });
                          }}
                          className="text-xs font-semibold text-[#3ECFB2] hover:opacity-85 cursor-pointer hover:bg-transparent p-0 flex items-center gap-1"
                        >
                          View set <Download className="size-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border border-dashed border-border/80 bg-card/10 py-16 text-center max-w-xl mx-auto flex flex-col items-center justify-center p-6 space-y-6 rounded-2xl">
                <div className="size-16 rounded-2xl bg-card border flex items-center justify-center text-muted-foreground shadow-inner shadow-black/40">
                  <ImageIcon className="size-8" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-lg font-bold text-foreground">No generated screenshots yet</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload a raw merchant screenshot, pick style colors, and let our AI generate a high-converting graphic sequence.
                  </p>
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-[#3ECFB2]/15 hover:bg-[#3ECFB2]/25 text-[#3ECFB2] font-semibold py-5 px-6 rounded-xl border border-[#3ECFB2]/30 cursor-pointer shadow-md text-xs active:scale-98 transition"
                >
                  Upload Your First Screenshot
                </button>
              </Card>
            )}
          </TabsContent>

          {/* Billing & License Content */}
          <TabsContent value="billing" className="space-y-6 max-w-xl mx-auto text-left">
            <Card className="border border-border/80 bg-card/25 rounded-2xl">
              <CardHeader className="border-b border-border/40 pb-6">
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="size-5 text-[#3ECFB2]" /> Current License Info
                </CardTitle>
                <CardDescription>View, manage, and upgrade your active billing license.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Active Plan Detail Box */}
                <div className="rounded-xl border border-border/40 bg-muted/20 p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Active Tier</p>
                    <p className="text-lg font-bold text-foreground">
                      {hasPaid ? "Pro Lifetime Plan" : "Free Trial Plan"}
                    </p>
                  </div>
                  {!hasPaid ? (
                    <Button
                      onClick={() => setPayOpen(true)}
                      className="bg-[#3ECFB2] hover:bg-[#059669] text-ink font-semibold rounded-xl px-5 py-4 cursor-pointer text-xs"
                    >
                      Upgrade to Pro
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="size-4" /> Lifetime Unlocked
                    </div>
                  )}
                </div>

                {/* Features Checklist */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wide">License features:</h4>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#3ECFB2]" /> Unlimited AI copy sequences
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`size-4 ${hasPaid ? "text-[#3ECFB2]" : "text-gray-500"}`} /> High-resolution PNG exports (1600x900)
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`size-4 ${hasPaid ? "text-[#3ECFB2]" : "text-gray-500"}`} /> Watermark-free downloads
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`size-4 ${hasPaid ? "text-[#3ECFB2]" : "text-gray-500"}`} /> 1-Click apply style presets
                    </div>
                  </div>
                </div>

                {/* Purchase History */}
                {payments.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="size-4 text-muted-foreground" /> Receipt Invoices
                    </h4>
                    <div className="space-y-2">
                      {payments.map((pay) => {
                        const payDate = pay.created_at 
                          ? new Date(pay.created_at).toLocaleDateString()
                          : "Recently";
                        return (
                          <div key={pay.id} className="flex justify-between items-center text-xs font-mono bg-card/30 p-3 rounded-lg border border-border/50">
                            <div>
                              <p className="text-foreground font-semibold capitalize">Order ID: {pay.lemon_squeezy_order_id || pay.id.slice(0, 8)}</p>
                              <p className="text-[10px] text-muted-foreground">{payDate}</p>
                            </div>
                            <span className="text-[#3ECFB2] font-semibold uppercase text-[10px] border border-[#3ECFB2]/20 bg-[#3ECFB2]/15 px-2 py-0.5 rounded">
                              {pay.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile & Account Content */}
          <TabsContent value="profile" className="space-y-6 max-w-xl mx-auto text-left">
            <Card className="border border-border/80 bg-card/25 rounded-2xl">
              <CardHeader className="border-b border-border/40 pb-6">
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserIcon className="size-5 text-[#3ECFB2]" /> Account Credentials
                </CardTitle>
                <CardDescription>Your authenticated account profile credentials.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Profile Details List */}
                <div className="flex items-center gap-4">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile Avatar" className="size-16 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="size-16 rounded-full border border-border bg-[#3ECFB2]/10 flex items-center justify-center font-bold text-[#3ECFB2] text-2xl uppercase">
                      {displayName.slice(0, 2)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-foreground">{displayName}</h3>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/40 text-xs font-mono">
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="text-foreground select-all">{user.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-muted-foreground">Login Provider:</span>
                    <span className="text-[#3ECFB2] capitalize font-semibold">{loginProvider}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Account Created:</span>
                    <span className="text-foreground">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                </div>

                {/* Edit settings navigation shortcut */}
                <div className="pt-4 flex justify-end">
                  <Link to="/settings">
                    <Button variant="outline" className="py-4 rounded-xl border-border hover:bg-card text-xs flex items-center gap-1.5 cursor-pointer">
                      <SettingsIcon className="size-3.5" /> Edit Profile Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upgrade Checkout Dialog Trigger */}
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        onSuccess={handlePaidSuccess}
        email={user?.email || ""}
      />

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </main>
  );
}
