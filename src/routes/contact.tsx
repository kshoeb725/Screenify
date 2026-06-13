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
import { MessageSquare, Mail, User, Send, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
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
      const { error } = await supabase
        .from("contact_submissions" as any)
        .insert({
          name,
          email,
          type,
          message,
        });

      if (error) throw error;

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
              We love to hear feedback, submit your form below we will get back in with 1-2 business days.
            </CardDescription>
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

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground bg-card/10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Screenify. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
