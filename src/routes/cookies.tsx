import { createFileRoute, Link } from "@tanstack/react-router";
import { renderLegalContent } from "@/lib/legal-formatter";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
});

function CookiesPage() {
  const lastUpdated = "June 12, 2026";

  const sections = [
    {
      title: "1. What Are Cookies?",
      content: `Cookies are small text files that are placed on your computer, smartphone, or other devices by websites that you visit. They are widely used to make websites work, or work more efficiently, as well as to provide statistical information to the owners of the site.
      
      We use cookies, web beacons, pixels, and local storage (such as HTML5 local storage) to identify your session, store design studio configurations, and track anonymous website performance.`
    },
    {
      title: "2. Types of Cookies We Use",
      content: `We categorise our cookies into the following sections:
      - **Essential (Strictly Necessary) Cookies**: These cookies are essential for you to move around the website and use its features, such as accessing secure areas, authentication tokens, and logging in. Without these cookies, services like user account registration and premium checkouts cannot be provided.
      - **Functional (Preference) Cookies**: These cookies allow us to remember choices you make (such as your UI presets, custom hex color palettes, app text fields, and configurations in the Design Studio) to provide a more personalised and efficient experience.
      - **Performance & Analytics Cookies**: These cookies collect information about how visitors use the website (e.g., which pages are visited most often, traffic sources). This data is completely aggregated and anonymised, and is used solely to improve the user experience and speed of the site.`
    },
    {
      title: "3. Specific Subprocessor Cookies",
      content: `Our third-party subprocessors place specific functional and session cookies when you navigate the platform:
      - **Supabase**: Places essential cookies and local storage tokens to store secure user session authentication.
      - **Lemon Squeezy**: Places cookies during the checkout flow to ensure secure order processing, coordinate payment statuses, and prevent transaction fraud.`
    },
    {
      title: "4. Session vs. Persistent Cookies",
      content: `- **Session Cookies**: These cookies are temporary and expire automatically once you close your web browser or end your active session.
      - **Persistent Cookies**: These cookies remain stored on your device's hard drive or local storage for a specified period (e.g., to keep you logged in or preserve your template designs across browser restarts) until they expire or are manually deleted.`
    },
    {
      title: "5. Cookie Management and Browser Controls",
      content: `Most web browsers allow you to control cookies through their settings preferences. You can configure your browser to:
      1. Block all cookies.
      2. Clear all cookies upon closing your browser.
      3. Accept cookies only from specific websites.
      4. Notify you when a new cookie is set.
      
      To learn more about how to manage cookies on popular browsers, please consult your browser's help center (e.g., Chrome, Safari, Firefox, Edge).
      
      **Please Note**: If you configure your browser to block all cookies (including essential cookies), you will not be able to log in, access your saved creative sets, or perform billing checkouts on Screenify.`
    },
    {
      title: "6. Changes to This Cookie Policy",
      content: `We may update this Cookie Policy from time to time to reflect changes in our technology or compliance requirements. Any modifications will be posted here with an updated "Last updated" timestamp.`
    },
    {
      title: "7. Contact Us",
      content: `If you have any questions or require additional details about our use of cookies, please email our privacy officer at Screenify786@gmail.com.`
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground grain">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <h1 className="font-display text-4xl sm:text-5xl mb-4">
          Cookie <span className="italic text-lime">Policy</span>
        </h1>
        <p className="mb-10 text-sm text-muted-foreground font-mono">
          Last updated: {lastUpdated}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="border-b border-border/40 pb-8 last:border-0 last:pb-0">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-lime font-bold">
                {section.title}
              </h2>
              <div className="text-sm leading-relaxed space-y-2">
                {renderLegalContent(section.content)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Questions about our cookies? Reach out to us at{" "}
            <a
              href="mailto:Screenify786@gmail.com"
              className="text-foreground underline underline-offset-4 transition hover:text-lime"
            >
              Screenify786@gmail.com
            </a>
          </p>
        </div>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Screenify</span>
          <Link to="/" className="transition-colors hover:text-foreground">
            Back to Home
          </Link>
        </div>
      </footer>
    </main>
  );
}
