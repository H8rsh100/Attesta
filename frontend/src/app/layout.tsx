import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attesta | Decentralized Credential Verification Platform",
  description:
    "Issue and publicly verify tamper-proof credentials on-chain using cryptographic hash commitments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Navigation Bar */}
          <header
            style={{
              borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
              backdropFilter: "blur(12px)",
              position: "sticky",
              top: 0,
              zIndex: 50,
              backgroundColor: "rgba(9, 13, 22, 0.8)",
            }}
          >
            <div
              style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    color: "#fff",
                    fontSize: "1.2rem",
                  }}
                >
                  A
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.35rem",
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  Attesta
                </span>
              </Link>

              <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <Link
                  href="/"
                  style={{
                    color: "#94a3b8",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "0.95rem",
                    transition: "color 0.2s",
                  }}
                >
                  Verify Portal
                </Link>
                <Link
                  href="/issue"
                  style={{
                    color: "#94a3b8",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "0.95rem",
                    transition: "color 0.2s",
                  }}
                >
                  Issuer Dashboard
                </Link>
                <a
                  href="https://github.com/H8rsh100/Attesta"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#f8fafc",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  GitHub
                </a>
              </nav>
            </div>
          </header>

          {/* Main Content Area */}
          <main style={{ flex: 1, maxWidth: "1200px", width: "100%", margin: "0 auto", padding: "2rem 1.5rem" }}>
            {children}
          </main>

          {/* Footer */}
          <footer
            style={{
              borderTop: "1px solid rgba(148, 163, 184, 0.1)",
              padding: "2rem 1.5rem",
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.875rem",
            }}
          >
            <p>
              Attesta: Decentralized Identity & Credential Verification Platform. Built with Next.js, Express, Solidity & Sepolia Testnet.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
