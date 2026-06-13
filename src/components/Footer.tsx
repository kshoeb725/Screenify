import { Link } from "@tanstack/react-router";

interface FooterProps {
  onHomeClick?: () => void;
}

export function Footer({ onHomeClick }: FooterProps) {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/screenmint-icon.png"
                alt="Screenify icon"
                className="h-10 w-10 rounded-xl object-cover"
              />
              <span className="font-display text-xl tracking-tight">
                Screen<span className="text-lime">ify</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The ultimate marketing design engine for Shopify developers. Transform raw app screenshots into high-converting, premium storefront graphics that build trust and drive installs.
            </p>
          </div>

          {/* About */}
          <div>
            <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-lime">
              About
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/"
                  onClick={(e) => {
                    if (onHomeClick) {
                      onHomeClick();
                    } else {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="transition-colors hover:text-foreground"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="transition-colors hover:text-foreground"
                >
                  About Us
                </Link>
              </li>
              <li>
                <a
                  href="#faq"
                  className="transition-colors hover:text-foreground"
                >
                  FAQ
                </a>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="transition-colors hover:text-foreground"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-lime">
              Get Started
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/"
                  onClick={(e) => {
                    if (onHomeClick) {
                      onHomeClick();
                    } else {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="transition-colors hover:text-foreground"
                >
                  Generate Promos
                </Link>
              </li>
              <li>
                <a
                  href="#faq"
                  className="transition-colors hover:text-foreground"
                >
                  How it works
                </a>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="transition-colors hover:text-foreground"
                >
                  Contact & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us / Follow Us */}
          <div>
            <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-lime">
              Contact & Follow
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/contact"
                  className="transition-colors hover:text-foreground"
                >
                  Contact Form
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@screenify.cloud"
                  className="transition-colors hover:text-foreground"
                >
                  support@screenify.cloud
                </a>
              </li>
              <li className="flex items-center gap-3 pt-1">
                <a
                  href="https://x.com/screenify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-border p-2 transition hover:bg-muted hover:text-foreground"
                  aria-label="Twitter"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.reddit.com/r/screenify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-border p-2 transition hover:bg-muted hover:text-foreground"
                  aria-label="Reddit"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286A.72.72 0 0 0 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 12.683a1.61 1.61 0 0 1 .536 1.196c0 2.394-2.787 4.336-6.225 4.336s-6.225-1.942-6.225-4.336a1.61 1.61 0 0 1 .536-1.196 1.617 1.617 0 1 1 2.156-2.398c1.057-.715 2.503-1.174 4.108-1.221l.78-3.673a.341.341 0 0 1 .405-.262l2.585.55a1.165 1.165 0 1 1-.114.536l-2.318-.493-.701 3.302c1.583.06 3.006.518 4.052 1.227a1.617 1.617 0 1 1 2.156 2.398l-.032-.166ZM9.075 13.823a1.165 1.165 0 1 0 0-2.33 1.165 1.165 0 0 0 0 2.33Zm6.225-1.165a1.165 1.165 0 1 0-2.33 0 1.165 1.165 0 0 0 2.33 0Zm-.954 2.581a.341.341 0 0 0-.482 0c-.476.475-1.495.516-1.864.516s-1.388-.041-1.864-.516a.341.341 0 1 0-.482.482c.6.6 1.747.65 2.346.65.6 0 1.747-.05 2.346-.65a.341.341 0 0 0 0-.482Z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-border pt-6 sm:flex-row">
          <div className="flex flex-col gap-2.5 text-left">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Screenify by Adil Jakir Husen Shaikh. All rights reserved.
            </p>
            {/* Accepted payment logos */}
            <div className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
              <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
                <rect width="36" height="24" rx="3" fill="#1A1F71" />
                <path d="M13.6 15.6h1.9l1.2-7.3h-1.9l-1.2 7.3zm7.8-7.1c-.4-.2-.9-.3-1.5-.3-1.6 0-2.8.9-2.8 2.1 0 .9.8 1.4 1.4 1.7.6.3.8.5.8.8 0 .4-.5.6-1 .6-.7 0-1.1-.1-1.7-.4l-.2-.1-.3 1.8c.5.2 1.4.4 2.3.4 2.1 0 3.5-1 3.5-2.7 0-.9-.5-1.6-1.7-2.1-.7-.4-1.1-.6-1.1-.9 0-.3.3-.6 1-.6.6 0 1 .1 1.4.3l.2.1.2-1.8zm5.7-.2h-1.8c-.6 0-1 .3-1.2.9l-3.4 8h2l.4-1.1h2.4l.2 1.1h1.8l-1.6-8.9zm-2 5.1l.8-2.2.4 2.2h-1.2zm-16.7-5.1L11.7 15h2l3-8.9h-2l-1.9 6.2-2.3-6.2H8.4z" fill="#FFF" />
              </svg>
              <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
                <rect width="36" height="24" rx="3" fill="#0A0A0A" />
                <circle cx="15.5" cy="12" r="7" fill="#EB001B" />
                <circle cx="20.5" cy="12" r="7" fill="#F79E1B" />
                <path d="M18 7.3a6.9 6.9 0 010 9.4 6.9 6.9 0 010-9.4z" fill="#FF5F00" />
              </svg>
              <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
                <rect width="36" height="24" rx="3" fill="#0170B9" />
                <path d="M7 15.5h2.2l.3-.9H11l.3.9h2.3l-2-5.7H9.1l-2.1 5.7zm3.1-2.4l.6-1.8.6 1.8H10.1zm4.8 2.4h3.5v-1.1h-2.1v-1.1h2v-1.1h-2v-1.1h2.1v-1.2h-3.5v5.7zm5.5 0h1.5l1.1-2 1.1 2h1.5l-1.7-2.8 1.6-2.9h-1.5l-1 1.9-1-1.9h-1.5l1.6 2.9-1.8 2.8z" fill="#FFF" />
              </svg>
              <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
                <rect width="36" height="24" rx="3" fill="#FFF" stroke="#E2E8F0" strokeWidth="1" />
                <path d="M12.5 11.2c0-1.2 1-2.1 2.2-2.1s2.2.9 2.2 2.1c0 1.2-1 2.1-2.2 2.1s-2.2-.9-2.2-2.1zm.5 0c0 .9.7 1.6 1.7 1.6s1.7-.7 1.7-1.6c0-.9-.7-1.6-1.7-1.6s-1.7.7-1.7 1.6zm8.8-2.6h-1.4v4.7h.8v-1.7h.6c1 0 1.7-.7 1.7-1.5s-.7-1.5-1.7-1.5zm-.6 2.3v-1.5h.6c.5 0 .9.3.9.7 0 .5-.4.8-.9.8h-.6zm6.3-1.8l-1 2.6-1-2.6h-.9l1.4 3.5-.2.5c-.1.3-.3.4-.6.4h-.2v.7c.3 0 .7-.1.9-.4l2.2-5.1h-.9z" fill="#000" />
                <path d="M9.8 11.8c.2 0 .5-.1.6-.3.2-.2.3-.5.3-.9 0-.6-.5-.9-.9-.9-.3 0-.6.1-.7.4-.2.2-.3.5-.3.8 0 .6.5.9 1 .9zm.1.6c-.7 0-1.1-.3-1.3-.8h-.1v2.1h-.7V9.7h.6v.7h.1c.2-.5.7-.8 1.3-.8.9 0 1.6.6 1.6 1.7 0 1.1-.7 1.8-1.5 1.8z" fill="#000" />
              </svg>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:justify-end">
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <span className="text-border">|</span>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <span className="text-border">|</span>
            <Link to="/refunds" className="transition-colors hover:text-foreground">
              Refunds
            </Link>
            <span className="text-border">|</span>
            <Link to="/cookies" className="transition-colors hover:text-foreground">
              Cookies
            </Link>
            <span className="text-border">|</span>
            <Link to="/acceptable-use" className="transition-colors hover:text-foreground">
              Acceptable Use
            </Link>
            <span className="text-border">|</span>
            <Link to="/disclaimer" className="transition-colors hover:text-foreground">
              Disclaimer
            </Link>
            <span className="text-border">|</span>
            <Link to="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
