import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { MessageSquare, Mail, User, Send, CheckCircle2, Loader2, Upload, X } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const insertData: any = {
        name,
        email,
        type,
        message,
      };
      if (imageUrl) {
        insertData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from("contact_submissions" as any)
        .insert(insertData);

      if (error) {
        // Fallback if image_url column is missing (e.g. database migration not run yet)
        const isMissingColumn = error.code === "42703" || 
                                error.message?.includes("column") || 
                                error.message?.includes("does not exist");
                                
        if (isMissingColumn && imageUrl) {
          console.warn("image_url column missing from contact_submissions table, retrying with appended image...");
          const fallbackMessage = `${message}\n\n[Attached Image (Base64): ${imageUrl}]`;
          const { error: retryError } = await supabase
            .from("contact_submissions" as any)
            .insert({
              name,
              email,
              type,
              message: fallbackMessage,
            });
            
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      setSuccess(true);
      toast.success("Message sent successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground grain flex flex-col justify-between">
      {/* Header / Navbar */}
      <header className="border-b border-border bg-card/30 w-full py-4 px-6">
        <div className="mx-auto max-w-6xl flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/screenmint-icon.png"
              alt="Screenify icon"
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="font-display text-lg tracking-tight font-bold">
              Screen<span className="text-lime">ify</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 my-10 animate-fade-in">
        <Card className="w-full max-w-lg border border-border bg-card/45 backdrop-blur-md shadow-2xl rounded-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3ECFB2]/20 to-transparent" />
          
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              <MessageSquare className="size-6 text-lime" /> Contact Us
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We love to hear feedback. Submit your form below, or reach out directly to our support team.
            </CardDescription>
            {/* Registered Business Details for Compliance */}
            <div className="mt-4 pt-4 border-t border-border/40 text-left text-xs text-muted-foreground/85 max-w-xs mx-auto space-y-1 font-sans">
              <p className="font-mono text-[9px] uppercase tracking-widest text-lime font-bold mb-1.5 text-center">Business Credentials</p>
              <div className="flex justify-between"><span className="font-mono text-[10px]">Developer:</span> <span className="font-bold text-foreground">Adil Jakir Husen Shaikh</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px]">Entity:</span> <span className="font-bold text-foreground">Individual Developer</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px]">Location:</span> <span className="font-bold text-foreground">Mumbai, Maharashtra, India</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px]">Email:</span> <span className="font-bold text-foreground">support@screenify.cloud</span></div>
              <div className="flex justify-between"><span className="font-mono text-[10px]">Fulfillment:</span> <span className="font-bold text-foreground">Instant digital delivery</span></div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {success ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#3ECFB2]/10 text-[#3ECFB2]">
                  <CheckCircle2 className="size-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Message Sent!</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Thank you for contacting us. Your message has been received, and our team will respond within 1-2 business days.
                  </p>
                </div>
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      setSuccess(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                      setImageUrl(null);
                    }}
                    variant="outline"
                    className="rounded-xl border-border hover:bg-card cursor-pointer text-xs"
                  >
                    Send Another Message
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-mono text-muted-foreground">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-9 bg-background/50 border-border focus:border-[#3ECFB2]/50 rounded-xl py-5 text-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-mono text-muted-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 bg-background/50 border-border focus:border-[#3ECFB2]/50 rounded-xl py-5 text-sm"
                    />
                  </div>
                </div>

                {/* Submission Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-xs font-mono text-muted-foreground">Inquiry Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-background/50 border-border focus:border-[#3ECFB2]/50 rounded-xl py-5 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="support">Support / Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-mono text-muted-foreground">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what you're looking for, or share your thoughts..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    className="bg-background/50 border-border focus:border-[#3ECFB2]/50 rounded-xl text-sm leading-relaxed resize-none p-3"
                  />
                </div>

                {/* Image Upload Field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Attach Screenshot / Image (Optional)</Label>
                  {imageUrl ? (
                    <div className="relative border border-border bg-background/30 rounded-xl p-3 flex items-center justify-between gap-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="Attachment preview" 
                          className="size-12 rounded-lg object-cover border border-border bg-slate-900 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">screenshot_attachment.png</p>
                          <p className="text-[10px] text-muted-foreground font-mono">Ready to submit</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <label 
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-[#3ECFB2]/50 hover:bg-[#3ECFB2]/5 rounded-xl py-6 cursor-pointer transition-all duration-200 select-none group"
                    >
                      <Upload className="size-6 text-muted-foreground group-hover:text-[#3ECFB2] mb-1.5 transition-colors" />
                      <span className="text-xs font-bold text-foreground">Upload an Image</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WEBP (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            const file = files[0];
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("Image size exceeds 5MB limit.");
                              return;
                            }
                            try {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImageUrl(reader.result as string);
                                toast.success("Image attached successfully!");
                              };
                              reader.readAsDataURL(file);
                            } catch (err) {
                              toast.error("Failed to process image file.");
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#3ECFB2] text-slate-950 hover:bg-[#3ECFB2]/90 font-bold py-5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Form
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground bg-card/10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Screenify by Adil Jakir Husen Shaikh. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link to="/about" className="transition-colors hover:text-foreground">About</Link>
            <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
