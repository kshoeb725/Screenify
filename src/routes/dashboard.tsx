import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, loading, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState("screenshots");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

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
    <main className="min-h-screen bg-[#070708] text-foreground font-sans relative overflow-hidden flex flex-col grain">
      
      {/* Background radial blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden -z-10 opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] rounded-full bg-gradient-to-br from-[#3ECFB2] to-transparent blur-[130px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-bl from-[#C8E84A] to-transparent blur-[130px]" />
      </div>

      {/* Dashboard Top Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[#070708]/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition">
            <img src="/screenmint-icon.png" alt="Screenify Logo" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-xl font-bold tracking-tight text-white">
              Screen<span className="text-[#3ECFB2]">ify</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/settings" className="p-2.5 rounded-full border border-border bg-card/45 hover:bg-card transition text-muted-foreground hover:text-white" title="Settings">
              <SettingsIcon className="size-4" />
            </Link>
            <Button
              onClick={logout}
              variant="outline"
              className="py-5 px-4 rounded-xl border-border hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 cursor-pointer flex items-center gap-2"
            >
              <LogOut className="size-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-12 space-y-10">
        
        {/* Welcome Section */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Hello, {displayName}</h1>
              {hasPaid && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3ECFB2]/15 text-[#3ECFB2] text-[10px] font-mono font-bold tracking-wide uppercase border border-[#3ECFB2]/20">
                  <Sparkles className="size-3" /> Pro Lifetime
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage your generated creatives, billing info, and account settings.</p>
          </div>
          <Link to="/">
            <Button className="bg-[#3ECFB2] hover:bg-[#059669] text-ink font-semibold py-5 px-6 rounded-xl cursor-pointer flex items-center gap-2 active:scale-98 shadow-md">
              <Plus className="size-4" /> Create New Graphic
            </Button>
          </Link>
        </section>

        {/* Core Tabbed Layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <TabsList className="bg-[#101012] border border-border p-1 rounded-xl w-full sm:w-auto grid sm:flex">
            <TabsTrigger value="screenshots" className="rounded-lg font-medium text-xs py-2.5 px-6 cursor-pointer flex items-center gap-2">
              <ImageIcon className="size-3.5" /> Generated Screenshots
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg font-medium text-xs py-2.5 px-6 cursor-pointer flex items-center gap-2">
              <CreditCard className="size-3.5" /> Billing & License
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg font-medium text-xs py-2.5 px-6 cursor-pointer flex items-center gap-2">
              <UserIcon className="size-3.5" /> Account Profile
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
                  // Parse generated images array if stored as string/JSON
                  let imagesList: string[] = [];
                  try {
                    if (sub.generated_images) {
                      imagesList = Array.isArray(sub.generated_images) 
                        ? sub.generated_images 
                        : JSON.parse(sub.generated_images as string);
                    }
                  } catch (e) {
                    console.error("Failed to parse generated images:", e);
                  }

                  return (
                    <Card key={sub.id} className="border border-border/80 bg-card/25 hover:border-border transition-all flex flex-col justify-between overflow-hidden group">
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#3ECFB2] font-semibold bg-[#3ECFB2]/10 px-2 py-0.5 rounded border border-[#3ECFB2]/15 capitalize">
                            {sub.objective || "Optimize"}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3" /> {date}
                          </span>
                        </div>
                        <div className="text-left space-y-1">
                          <CardTitle className="text-lg font-bold text-white group-hover:text-[#3ECFB2] transition-colors">{sub.app_name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2">{sub.target_audience}</CardDescription>
                        </div>

                        {/* Images preview array */}
                        {imagesList.length > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 pt-2">
                            {imagesList.slice(0, 3).map((img, idx) => (
                              <div key={idx} className="aspect-[16/9] rounded overflow-hidden border border-white/5 bg-[#121214]">
                                <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover select-none pointer-events-none" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-border/50 bg-[#0C0C0E]/50 px-6 py-4 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">{imagesList.length} slide creatives</span>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            // Can pre-fill state or reload index page with loaded submissions
                            // For simplicity, navigate back to editor view with submission ID if needed
                            toast.info("Opening screenshot templates...");
                            navigate({ to: "/" });
                          }}
                          className="text-xs font-semibold text-[#3ECFB2] hover:text-white cursor-pointer hover:bg-transparent p-0 flex items-center gap-1"
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
                  <h3 className="text-lg font-bold text-white">No generated screenshots yet</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload a raw merchant screenshot, pick style colors, and let our AI generate a high-converting graphic sequence.
                  </p>
                </div>
                <Link to="/">
                  <Button className="bg-[#3ECFB2]/15 hover:bg-[#3ECFB2]/25 text-[#3ECFB2] font-semibold py-5 px-6 rounded-xl border border-[#3ECFB2]/30 cursor-pointer shadow-md">
                    Upload Your First Screenshot
                  </Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* Billing & License Content */}
          <TabsContent value="billing" className="space-y-6 max-w-xl mx-auto text-left">
            <Card className="border border-border/80 bg-card/20 rounded-2xl">
              <CardHeader className="border-b border-border/40 pb-6">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="size-5 text-[#3ECFB2]" /> Current License Info
                </CardTitle>
                <CardDescription>View, manage, and upgrade your active billing license.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Active Plan Detail Box */}
                <div className="rounded-xl border border-white/5 bg-[#121214] p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Active Tier</p>
                    <p className="text-lg font-bold text-white">
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
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide">License features:</h4>
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
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
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
                              <p className="text-white font-semibold capitalize">Order ID: {pay.lemon_squeezy_order_id || pay.id.slice(0, 8)}</p>
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
            <Card className="border border-border/80 bg-card/20 rounded-2xl">
              <CardHeader className="border-b border-border/40 pb-6">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
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
                    <h3 className="font-bold text-lg text-white">{displayName}</h3>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/40 text-xs font-mono">
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="text-white select-all">{user.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-muted-foreground">Login Provider:</span>
                    <span className="text-[#3ECFB2] capitalize font-semibold">{loginProvider}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Account Created:</span>
                    <span className="text-white">
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
    </main>
  );
}
