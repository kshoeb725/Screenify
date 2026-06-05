import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const sections = [
    {
      title: "1. Introduction",
      content: `This Privacy Policy describes how Screenify ("we", "our", or "us") collects, uses, and protects your personal information when you use our website and services (the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.`,
    },
    {
      title: "2. Information We Collect",
      content: `We may collect the following types of information: (a) information you provide directly, such as your email address and app details; (b) content you upload, including screenshots and text; (c) payment information processed securely by our payment provider; and (d) technical data such as IP address, browser type, and usage data collected automatically.`,
    },
    {
      title: "3. How We Use Your Information",
      content: `We use the information we collect to: provide and maintain the Service; process your transactions; generate your promo images; communicate with you about your account or support requests; improve and optimize the Service; and comply with legal obligations.`,
    },
    {
      title: "4. Uploaded Content",
      content: `Screenshots and other content you upload are processed solely to generate your promo images. We do not use your uploaded content to train AI models or share it with third parties for marketing purposes.`,
    },
    {
      title: "5. Payment Information",
      content: `All payments are processed securely by our third-party payment provider. We do not store your full credit card or payment details on our servers. Please refer to the payment provider's privacy policy for details on how they handle your data.`,
    },
    {
      title: "6. Cookies and Tracking",
      content: `We may use cookies and similar tracking technologies to enhance your experience, analyze usage, and remember your preferences. You can control cookies through your browser settings, though disabling them may affect the functionality of the Service.`,
    },
    {
      title: "7. Data Sharing and Disclosure",
      content: `We do not sell your personal information. We may share your information with trusted service providers who assist us in operating the Service (such as payment processors and hosting providers), or when required by law to comply with legal processes.`,
    },
    {
      title: "8. Data Security",
      content: `We implement reasonable technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.`,
    },
    {
      title: "9. Data Retention",
      content: `We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.`,
    },
    {
      title: "10. Your Rights",
      content: `Depending on your location, you may have the right to access, correct, delete, or restrict the processing of your personal information. To exercise these rights, please contact us at Screenify786@gmail.com.`,
    },
    {
      title: "11. Children's Privacy",
      content: `The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so we can remove it.`,
    },
    {
      title: "12. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.`,
    },
    {
      title: "13. Contact Us",
      content: `If you have any questions about this Privacy Policy, please contact us at Screenify786@gmail.com.`,
    },
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
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-lime">
                {section.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Questions about your privacy? Reach out at{" "}
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
