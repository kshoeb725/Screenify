import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";
import { Loader2, Settings, User, Lock, Sun, Moon, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { theme, toggle } = useTheme();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Load profile full name initially
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    } else if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  // Protected Route check
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update auth user metadata too so they stay in sync
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
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

  const loginProvider = user?.app_metadata?.provider || "email";
  const isEmailUser = loginProvider === "email";

  return (
    <main className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden flex flex-col grain">
      
      {/* Decorative blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none overflow-hidden -z-10 opacity-15">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] rounded-full bg-gradient-to-br from-[#3ECFB2] to-transparent blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-20 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="size-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-[#3ECFB2]" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">Account Settings</span>
          </div>
        </div>
      </header>

      {/* Settings Forms Body */}
      <div className="flex-1 mx-auto w-full max-w-4xl px-6 py-12 space-y-8 text-left">
        
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your personal settings, security, and theme preferences.</p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 pt-4">
          {/* Left / Main Column */}
          <div className="md:col-span-8 space-y-8">
            
            {/* Profile Info Form */}
            <Card className="border border-border/80 bg-card/25 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="size-4.5 text-[#3ECFB2]" /> Public Profile
                </CardTitle>
                <CardDescription>Update your display name.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="settingsName">Full Name</Label>
                    <Input
                      id="settingsName"
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="py-5 rounded-xl border-border bg-input/40 text-sm focus:border-[#3ECFB2]"
                      required
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={updatingProfile}
                      className="bg-[#3ECFB2] hover:bg-[#059669] text-ink font-semibold rounded-xl px-5 py-4 cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      {updatingProfile ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Password Security Form (Only for email users) */}
            {isEmailUser && (
              <Card className="border border-border/80 bg-card/25 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Lock className="size-4.5 text-[#3ECFB2]" /> Change Password
                  </CardTitle>
                  <CardDescription>Configure a new secure password for your account login.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="settingsPassword">New Password</Label>
                      <Input
                        id="settingsPassword"
                        type="password"
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="py-5 rounded-xl border-border bg-input/40 text-sm focus:border-[#3ECFB2]"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="settingsConfirmPassword">Confirm New Password</Label>
                      <Input
                        id="settingsConfirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="py-5 rounded-xl border-border bg-input/40 text-sm focus:border-[#3ECFB2]"
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={updatingPassword}
                        className="bg-[#3ECFB2] hover:bg-[#059669] text-ink font-semibold rounded-xl px-5 py-4 cursor-pointer text-xs flex items-center gap-1.5"
                      >
                        {updatingPassword ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                        Change Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right / Sidebar Column (Appearance preferences) */}
          <div className="md:col-span-4 space-y-6">
            <Card className="border border-border/80 bg-card/25 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">Appearance</CardTitle>
                <CardDescription>Select website styling mode.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Dark Theme:</span>
                  <Button
                    onClick={toggle}
                    variant="outline"
                    className="rounded-xl border-border hover:bg-card px-4 py-3 cursor-pointer flex items-center gap-2"
                  >
                    {theme === "dark" ? (
                      <>
                        <Moon className="size-4 text-[#3ECFB2]" /> Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="size-4 text-[#C8E84A]" /> Light Mode
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
