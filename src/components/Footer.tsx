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
                <a
                  href="mailto:Screenify786@gmail.com"
                  className="transition-colors hover:text-foreground"
                >
                  Support
                </a>
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
                <a
                  href="mailto:Screenify786@gmail.com"
                  className="transition-colors hover:text-foreground"
                >
                  Screenify786@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3 pt-1">
                <a
                  href="https://x.com/as6379301"
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
                  href="https://www.reddit.com/u/AdilShaikh5786/s/j8JQeoj6aB"
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Screenify. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
