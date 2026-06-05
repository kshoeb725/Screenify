import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  const sections = [
    {
      title: "1. Introduction",
      content: `Welcome to Screenify ("we", "our", or "us"). These Terms and Conditions ("Terms") govern your access to and use of the Screenify website and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.`,
    },
    {
      title: "2. Description of Service",
      content: `Screenify is an AI-powered tool that generates promotional images for Shopify App Store listings. Users upload screenshots and provide app details, and our service generates up to three polished, store-ready promo images.`,
    },
    {
      title: "3. Eligibility",
      content: `You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you are of legal age to form a binding contract and meet all eligibility requirements.`,
    },
    {
      title: "4. Accounts and Registration",
      content: `Some features of the Service may require you to provide information such as your email address. You agree to provide accurate, current, and complete information and to update it as necessary. You are responsible for maintaining the confidentiality of your account information.`,
    },
    {
      title: "5. Payment and Refunds",
      content: `Screenify charges a one-time fee per generation to unlock and download full-resolution promo images. All payments are processed securely via Lemon Squeezy. Due to the digital nature of the product, all sales are final once the images have been generated and unlocked. If you experience technical issues, please contact us at Screenify786@gmail.com.`,
    },
    {
      title: "6. User Content",
      content: `You retain ownership of any images, screenshots, or text you upload to the Service ("User Content"). By uploading User Content, you grant us a limited, non-exclusive license to process it solely for the purpose of providing the Service to you. You represent that you have all necessary rights to your User Content and that it does not infringe on the rights of any third party.`,
    },
    {
      title: "7. Prohibited Uses",
      content: `You agree not to use the Service to: (a) generate content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable; (b) infringe any patent, trademark, trade secret, copyright, or other intellectual property rights; (c) upload malicious software or viruses; (d) interfere with or disrupt the Service or servers; (e) attempt to gain unauthorized access to any part of the Service.`,
    },
    {
      title: "8. Intellectual Property",
      content: `The Service, its original content (excluding User Content), features, and functionality are and will remain the exclusive property of Screenify and its licensors. The generated promo images are provided to you under a personal, non-exclusive license for use in your Shopify App Store listing. You may not resell, redistribute, or sublicense the generated images without our prior written consent.`,
    },
    {
      title: "9. Disclaimer of Warranties",
      content: `The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will be uninterrupted, secure, or error-free, or that any generated images will meet your specific requirements.`,
    },
    {
      title: "10. Limitation of Liability",
      content: `To the maximum extent permitted by law, Screenify shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the Service, even if we have been advised of the possibility of such damages.`,
    },
    {
      title: "11. Indemnification",
      content: `You agree to indemnify and hold harmless Screenify and its affiliates, officers, agents, and employees from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of your use of the Service, your violation of these Terms, or your violation of any rights of another.`,
    },
    {
      title: "12. Termination",
      content: `We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.`,
    },
    {
      title: "13. Governing Law",
      content: `These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Screenify operates, without regard to its conflict of law provisions.`,
    },
    {
      title: "14. Changes to Terms",
      content: `We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.`,
    },
    {
      title: "15. Contact Us",
      content: `If you have any questions about these Terms, please contact us at Screenify786@gmail.com.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground grain">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Back link */}
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
          Terms & <span className="italic text-lime">Conditions</span>
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

        {/* Bottom contact */}
        <div className="mt-14 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Questions about these terms? Reach out at{" "}
            <a
              href="mailto:Screenify786@gmail.com"
              className="text-foreground underline underline-offset-4 transition hover:text-lime"
            >
              Screenify786@gmail.com
            </a>
          </p>
        </div>
      </div>

      {/* Simple footer for terms page */}
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
