import { createFileRoute, Link } from "@tanstack/react-router";
import { renderLegalContent } from "@/lib/legal-formatter";

export const Route = createFileRoute("/acceptable-use")({
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
  const lastUpdated = "June 12, 2026";

  const sections = [
    {
      title: "1. Purpose and Scope",
      content: `The purpose of this Acceptable Use Policy ("AUP") is to define the rules, limitations, and guidelines governing the use of Screenify's website, platform, and SaaS rendering engine (collectively, the "Service").
      
      This AUP applies to all registered developers, merchants, guests, and entities who access or interact with our Service. By using the Service, you agree to comply with this AUP at all times. Failure to comply may result in account termination and legal reporting.`
    },
    {
      title: "2. Illegal and Infringing Content",
      content: `You may not upload, store, generate, or share any User Content that:
      - Violates any local, state, national, or international laws or regulations.
      - Infringes upon the patents, trademarks, copyrights, trade secrets, or other intellectual property rights of any third party.
      - Contains child exploitation materials, obscene materials, hate speech, or promotes violence and harassment.
      - Depicts or shares private personal information without explicit consent (doxxing).`
    },
    {
      title: "3. Fraudulent and Deceptive Activity",
      content: `You are strictly prohibited from using Screenify to facilitate fraudulent schemes or deceive users. Prohibited behaviors include:
      - Creating screenshot sequences designed to impersonate official Shopify app listings or other popular software products.
      - Generating marketing copy that makes false, deceptive, or unsubstantiated claims about your software's capabilities or certifications.
      - Uploading mock dashboards containing fabricated ratings, reviews, or metrics with the intent to mislead Shopify merchants.`
    },
    {
      title: "4. System Abuse & Reverse Engineering",
      content: `You must respect the security, code structure, and availability of our platform. You agree not to:
      - Attempt to reverse engineer, decompile, disassemble, or reconstruct the source code, layout algorithms, or design configurations of Screenify.
      - Probe, scan, or test the vulnerability of our databases, APIs, or hosting endpoints.
      - Bypass watermark protections, license gates, or digital lock controls on any templates.`
    },
    {
      title: "5. Automated Abuse & Rate Limits",
      content: `Our rendering servers are optimized for direct human use. You may not:
      - Access the Service using bots, automated scripts, crawlers, scrapers, or other automated utilities.
      - Perform bulk API calls, batch image creations, or automated screenshot uploads that generate excessive load on our database and AI endpoints.
      - Maintain multiple accounts with the intent of bypassing free trial limits or credit restrictions.`
    },
    {
      title: "6. Security Threats and Malware",
      content: `You may not upload screenshots, upload payloads, or transmit documents containing:
      - Viruses, Trojan horses, worms, time bombs, keyloggers, or other malicious software.
      - Corrupted file structures designed to disrupt the server-side rendering pipelines.
      - Tracking scripts, malware downloaders, or malicious redirects.`
    },
    {
      title: "7. Enforcement and Investigations",
      content: `We reserve the right, but hold no obligation, to monitor User Content and investigate reports of AUP violations. If we determine that you have violated these rules, we may take immediate action:
      - Issue a warning notice.
      - Remove or block the violating User Content or Generated Content.
      - Suspend or permanently terminate your Screenify account without a refund.
      - Cooperate with law enforcement or third-party intellectual property owners if legal violations are suspected.
      - File civil lawsuits to recover damages caused by automated scraping, system attacks, or reverse engineering.`
    },
    {
      title: "8. Report Violations",
      content: `If you discover any content or behaviors on Screenify that violate this Acceptable Use Policy, please report them to support@screenify.cloud.`
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
          Acceptable <span className="italic text-lime">Use Policy</span>
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
            Questions about acceptable use? Reach out to us at{" "}
            <a
              href="mailto:support@screenify.cloud"
              className="text-foreground underline underline-offset-4 transition hover:text-lime"
            >
              support@screenify.cloud
            </a>
          </p>
        </div>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; 2026 Screenify. All rights reserved</span>
          <Link to="/" className="transition-colors hover:text-foreground">
            Back to Home
          </Link>
        </div>
      </footer>
    </main>
  );
}
