import { createFileRoute, Link } from "@tanstack/react-router";
import { renderLegalContent } from "@/lib/legal-formatter";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const lastUpdated = "June 12, 2026";

  const sections = [
    {
      title: "1. Introduction",
      content: `Screenify ("we", "our", or "us") refers to the SaaS platform and service operated by individual developer Adil Jakir Husen Shaikh, based in Mumbai, Maharashtra, India. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit and use our website (screenify.dev) and SaaS service (collectively, the "Service"). 
      
      We act as a Data Controller for account registration and billing data, and as a Data Processor for any User Content (such as raw screenshots) uploaded to our service. By accessing or using the Service, you consent to the data practices described in this policy.`
    },
    {
      title: "2. Information We Collect",
      content: `We collect several types of information from and about users of our Service:
      - **Account Information**: When you register, log in, or subscribe, we collect your email address, name, avatar image, and authentication tokens through Supabase Auth.
      - **Uploaded Screenshots & Content**: We process raw screenshots, brand logos, app names, objectives, and target audience text inputs uploaded by you to generate your marketing storefront images.
      - **Billing and Payment Details**: Transactions are handled directly by Dodo Payments. We do not store credit card or bank details on our servers; however, we receive transaction identifiers and subscription statuses to unlock your designs.
      - **Usage Data & Device Information**: We automatically collect logs about your interactions with the Service, including your IP address, browser type, operating system, page views, and timestamps.`
    },
    {
      title: "3. Legal Basis for Processing (GDPR)",
      content: `If you are in the European Economic Area (EEA) or UK, we process your personal data under the following legal bases:
      - **Performance of a Contract**: To provide the Service, manage your account, process payments, and render your storefront graphics.
      - **Consent**: When you explicitly upload screenshots or opt-in to marketing newsletters.
      - **Legitimate Interests**: To analyze usage trends, improve our design templates and AI outputs, secure the platform, and protect against fraudulent activity.`
    },
    {
      title: "4. Cookies and Tracking Technologies",
      content: `We use cookies, local storage, and similar tracking technologies to enhance your experience. These include:
      - **Essential Cookies**: Necessary to maintain your session authentication (provided by Supabase).
      - **Functional Cookies**: To remember your design studio preferences, custom colors, active templates, and configurations.
      - **Analytics Cookies**: Used to monitor site traffic and conversion statistics.
      You can manage your cookie preferences through your web browser settings. Disabling essential cookies may prevent you from logging in or using the design studio.`
    },
    {
      title: "5. How We Use Your Information",
      content: `We utilize your information for the following commercial purposes:
      - To create, run, and maintain your user account.
      - To process and render your uploaded screenshots inside our template editor.
      - To provide customer support and handle billing inquiries.
      - To send transactional notifications (e.g., receipt confirmations, design summaries).
      - To safeguard the Service against security threats, bots, and abuse.
      - We do **not** sell, rent, or lease your personal information or uploaded screenshots to third parties.`
    },
    {
      title: "6. Data Sharing & Third-Party Subprocessors",
      content: `We share personal data with trusted third-party service providers (subprocessors) that perform operational tasks for Screenify. These subprocessors are contractually bound to protect your data and are prohibited from using it for any other purpose:
      - **Supabase Inc.**: Database hosting, user authentication, and secure file/screenshot storage.
      - **OpenAI, L.L.C. / Google LLC**: Multi-modal artificial intelligence APIs used to analyze screenshots and write high-converting copy suggestions.
      - **Dodo Payments**: Our Merchant of Record and payment gateway that processes checkouts, taxes, and subscriptions.
      - **Analytics Providers**: Tools used to collect anonymous usage metrics to optimize site performance.`
    },
    {
      title: "7. Data Security and Storage",
      content: `We implement industry-standard technical and organizational security measures to protect your data. All connections are encrypted over HTTPS (SSL/TLS), and user database instances are secured with row-level security (RLS) policies through Supabase. While we strive to protect your personal information, no transmission over the internet or electronic storage method can be guaranteed 100% secure.`
    },
    {
      title: "8. Data Retention Policy",
      content: `We retain your account details and subscription statuses for as long as your account remains active. 
      - **Uploaded Screenshots**: Raw screenshots uploaded to the design studio are processed in real-time and may be cached on secure storage for up to 30 days to facilitate continuous editing, after which they are automatically archived or deleted.
      - **Submission History**: Records of your generated layouts and slide settings are stored in your dashboard unless you request their deletion.`
    },
    {
      title: "9. International Data Transfers",
      content: `Your information may be transferred to, and maintained on, servers located outside of your state, province, or country, where data protection laws may differ. When transferring data internationally (such as to servers located in the United States), we utilize standard contractual clauses (SCCs) and verify that our subprocessors adhere to equivalent security standards.`
    },
    {
      title: "10. Your Privacy Rights (GDPR & CCPA)",
      content: `Depending on your jurisdiction (such as the EU, UK, or California), you hold specific statutory rights regarding your personal data:
      - **Right of Access**: You can request copies of the personal data we hold about you.
      - **Right to Rectification**: You can ask us to correct inaccurate or incomplete data.
      - **Right to Erasure (Deletions)**: You can request that we delete your account and all associated screenshots.
      - **Right to Portability**: You can request a copy of your configurations in a structured, machine-readable format.
      - **Right to Object/Restrict**: You can object to processing based on legitimate interests.
      To exercise any of these rights, please submit a request to support@screenify.cloud.`
    },
    {
      title: "11. Children's Privacy",
      content: `Our Service is strictly designed for commercial developers and merchants and is not directed to children under 16 years of age. We do not knowingly collect personal data from children. If we discover that a child under 16 has registered an account, we will take immediate steps to delete that account and all associated files.`
    },
    {
      title: "12. Policy Updates",
      content: `We reserve the right to amend this Privacy Policy at any time. When we make changes, we will update the "Last updated" date at the top of this page. We encourage you to review this policy periodically to stay informed about how we safeguard your information.`
    },
    {
      title: "13. Contact Information",
      content: `For any inquiries, data rights requests, or complaints regarding this Privacy Policy or our data processing practices, please contact us at:
      - **Developer**: Adil Jakir Husen Shaikh
      - **Location**: Mumbai, Maharashtra, India
      - **Email**: support@screenify.cloud`
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
          Privacy <span className="italic text-lime">Policy</span>
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
            Questions about your privacy? Reach out to us at{" "}
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
