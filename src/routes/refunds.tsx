import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refunds")({
  component: RefundsPage,
});

function RefundsPage() {
  const sections = [
    {
      title: "1. Overview",
      content: `This Refund Policy explains the terms under which Screenify ("we", "our", or "us") offers refunds for purchases made through our website and services (the "Service"). By making a purchase, you agree to this Refund Policy.`,
    },
    {
      title: "2. Nature of the Product",
      content: `Screenify provides AI-generated digital promo images. Because the product is delivered digitally and generated on demand, purchases are generally considered final once the images have been generated and unlocked.`,
    },
    {
      title: "3. Eligibility for Refunds",
      content: `We may issue a refund in the following circumstances: (a) you were charged but did not receive your generated images due to a technical error on our side; (b) you were charged multiple times for the same order; or (c) the Service failed to deliver the product as described.`,
    },
    {
      title: "4. Non-Refundable Situations",
      content: `Refunds will generally not be granted for: (a) dissatisfaction with the creative style or output once images have been successfully generated; (b) change of mind after the images have been unlocked and downloaded; or (c) errors caused by incorrect information or low-quality screenshots provided by you.`,
    },
    {
      title: "5. How to Request a Refund",
      content: `To request a refund, please email us at Screenify786@gmail.com within 7 days of your purchase. Include your order details, the email used for the purchase, and a description of the issue. We will review your request and respond as soon as possible.`,
    },
    {
      title: "6. Processing of Refunds",
      content: `Approved refunds will be processed to your original payment method. Depending on your payment provider, it may take several business days for the refund to appear in your account.`,
    },
    {
      title: "7. Chargebacks",
      content: `If you believe a charge is incorrect, please contact us first so we can resolve the issue. Initiating a chargeback without contacting us may result in suspension of access to the Service.`,
    },
    {
      title: "8. Changes to This Policy",
      content: `We reserve the right to modify this Refund Policy at any time. Any changes will be posted on this page with an updated "Last updated" date.`,
    },
    {
      title: "9. Contact Us",
      content: `If you have any questions about this Refund Policy, please contact us at Screenify786@gmail.com.`,
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
          Refund <span className="italic text-lime">Policy</span>
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
            Questions about refunds? Reach out at{" "}
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
