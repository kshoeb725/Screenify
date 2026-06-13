import { createFileRoute, Link } from "@tanstack/react-router";
import { renderLegalContent } from "@/lib/legal-formatter";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const sections = [
    {
      title: "Our Mission",
      content: `Screenify is the ultimate marketing design engine built specifically for Shopify app developers. Our mission is simple: to help developers transform raw application screenshots into high-converting, premium storefront graphics that build trust and drive installations on the Shopify App Store.`
    },
    {
      title: "Why We Built Screenify",
      content: `As developers, we understand the friction of launching and marketing Shopify apps. Traditional storefront banner creation is tedious and painful:
      - **Manual Formatting**: Manually resizing screenshots, centering mockups, and aligning text elements inside tools like Figma or Canva takes hours.
      - **Design & Copy Obstacles**: Choosing professional, brand-matched color palettes and writing high-converting marketing copywriting (Hooks, Problem statements, CTAs) requires specialized marketing skills.
      
      We built Screenify to solve these issues. By uploading a single raw screenshot, Screenify automatically detects your brand colors, wraps the UI in accurate device mockup frames, and generates compelling copywriting templates to build a cohesive 5-slide visual marketing sequence in minutes.`
    },
    {
      title: "Our Product Goals",
      content: `- **Elevate Quality**: Elevate storefront visuals to meet the high trust standards expected by modern Shopify merchants.
      - **Save Time**: Reduce creative design work from hours to a few seconds, allowing developers to focus on building great features.
      - **Optimize Conversions**: Provide conversion-focused layout templates that align with recommended app store visual structures.`
    },
    {
      title: "Business & Legal Information",
      content: `To ensure complete transparency with our users and payment compliance partners, here are our registered credentials:
      - **Legal Name**: Adil Jakir Husen Shaikh
      - **Business Trade Name**: Screenify
      - **Operating Entity**: Individual Developer
      - **Registered Location**: Mumbai, Maharashtra, India
      - **Operational Support**: support@screenify.cloud
      - **Fulfillment & Delivery**: Access to generated assets, high-resolution downloads, and billing memberships is delivered instantly online to the user's dashboard upon successful checkout validation.`
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
          About <span className="italic text-lime">Us</span>
        </h1>
        <p className="mb-10 text-sm text-muted-foreground font-mono">
          Screenify Design Engine
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="border-b border-border/40 pb-8 last:border-0 last:pb-0">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-lime font-bold">
                {section.title}
              </h2>
              <div className="text-sm leading-relaxed space-y-2 whitespace-pre-line">
                {renderLegalContent(section.content)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Have questions about our project or team? Reach out to us at{" "}
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
