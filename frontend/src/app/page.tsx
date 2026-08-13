"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Cpu, QrCode, ArrowRight, Search, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  const [credentialId, setCredentialId] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentialId.trim()) {
      router.push(`/verify/${credentialId.trim()}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
      {/* Hero Section */}
      <section style={{ textAlign: "center", paddingTop: "2rem", paddingBottom: "1rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "6px 16px",
            borderRadius: "9999px",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            color: "#38bdf8",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "1.5rem",
          }}
        >
          <ShieldCheck size={16} /> Verifiable Credentials on Sepolia Testnet
        </div>

        <h1
          style={{
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "1.25rem",
          }}
        >
          Decentralized Identity & <br />
          <span className="gradient-text">Verifiable Credential</span> Platform
        </h1>

        <p
          style={{
            fontSize: "1.15rem",
            color: "#94a3b8",
            maxWidth: "680px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.6,
          }}
        >
          Authorized issuers mint cryptographic on-chain credentials. Holders store non-PII credentials, and any third party can instantly verify authenticity publicly with zero login required.
        </p>

        {/* Verification Search Bar */}
        <form
          onSubmit={handleSearch}
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "280px", position: "relative" }}>
            <input
              type="text"
              placeholder="Paste Credential ID (0x...)"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "2.75rem" }}
            />
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            />
          </div>
          <button type="submit" className="gradient-button">
            Verify Credential <ArrowRight size={18} />
          </button>
        </form>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.75rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <Lock size={24} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Hash Commit Privacy
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Raw PII is never stored on the blockchain. Keccak256 cryptographic commitments preserve privacy and ensure tamper evidence.
          </p>
        </div>

        <div className="glass-card" style={{ padding: "1.75rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <Cpu size={24} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Dual-Layer RBAC
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5 }}>
            OpenZeppelin AccessControl enforces role limits directly in smart contract bytecode alongside fast off-chain backend validation.
          </p>
        </div>

        <div className="glass-card" style={{ padding: "1.75rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(168, 85, 247, 0.15)",
              color: "#a855f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <QrCode size={24} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Instant QR Verification
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Issued credentials generate shareable QR codes pointing directly to public verification endpoints for instant authenticity checks.
          </p>
        </div>
      </section>

      {/* Action Banner */}
      <section
        className="glass-card"
        style={{
          padding: "2.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          background: "linear-gradient(135deg, rgba(18, 24, 38, 0.9), rgba(30, 27, 75, 0.5))",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Are you an authorized issuer?
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
            Connect your Web3 wallet and authenticate via SIWE signature to issue credentials.
          </p>
        </div>
        <Link href="/issue" className="gradient-button">
          Open Issuer Dashboard <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
