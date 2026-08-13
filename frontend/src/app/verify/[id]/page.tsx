"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, FileX, Calendar, User, ExternalLink, ArrowLeft } from "lucide-react";

interface VerificationData {
  credentialId: string;
  status: "VALID" | "REVOKED" | "NOT_FOUND";
  valid: boolean;
  onChain?: {
    issuer: string;
    subjectHash: string;
    credentialHash: string;
    issuedAt: string;
    revoked: boolean;
  };
  offChain?: {
    name: string;
    credentialType: string;
    description?: string;
    metadata?: Record<string, unknown>;
    issuedAt: string;
  } | null;
  message?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    fetch(`${API_URL}/api/verify/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok && res.status !== 404) {
          throw new Error(json.error || "Failed to verify credential");
        }
        setData(json);
      })
      .catch((err) => {
        console.error("Verification error:", err);
        setError(err.message || "An unexpected error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "3px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "#6366f1",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1.5rem",
          }}
        />
        <p style={{ color: "#94a3b8" }}>Verifying credential on-chain...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: "600px", margin: "2rem auto" }}>
        <ShieldAlert size={48} color="#f43f5e" style={{ margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Verification Request Failed</h2>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>{error}</p>
        <Link href="/" className="gradient-button">
          <ArrowLeft size={16} /> Return to Verification Portal
        </Link>
      </div>
    );
  }

  if (!data || data.status === "NOT_FOUND") {
    return (
      <div className="glass-card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: "600px", margin: "2rem auto" }}>
        <FileX size={48} color="#94a3b8" style={{ margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Credential Not Found</h2>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          No credential record exists on-chain for ID: <br />
          <code style={{ background: "rgba(15, 23, 42, 0.8)", padding: "4px 8px", borderRadius: "6px", fontSize: "0.85rem", color: "#38bdf8" }}>{id}</code>
        </p>
        <Link href="/" className="gradient-button">
          <ArrowLeft size={16} /> Search Another Credential
        </Link>
      </div>
    );
  }

  const isRevoked = data.status === "REVOKED";

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}>
        <ArrowLeft size={16} /> Back to Search
      </Link>

      {/* Main Verification Card */}
      <div className="glass-card" style={{ padding: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <div style={{ marginBottom: "0.5rem" }}>
              {isRevoked ? (
                <span className="status-badge status-revoked">
                  <ShieldAlert size={14} /> Revoked Credential
                </span>
              ) : (
                <span className="status-badge status-valid">
                  <ShieldCheck size={14} /> Valid On-Chain Credential
                </span>
              )}
            </div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0.5rem 0" }}>
              {data.offChain?.name || "Verified Credential"}
            </h1>
            {data.offChain?.credentialType && (
              <p style={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.95rem" }}>
                Type: {data.offChain.credentialType}
              </p>
            )}
          </div>
        </div>

        {data.offChain?.description && (
          <div style={{ padding: "1rem", borderRadius: "10px", background: "rgba(15, 23, 42, 0.6)", marginBottom: "2rem", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.5 }}>
              {data.offChain.description}
            </p>
          </div>
        )}

        {/* Detailed Metadata Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", borderTop: "1px solid rgba(148, 163, 184, 0.1)", paddingTop: "1.5rem" }}>
          <div>
            <span style={{ color: "#64748b", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 700 }}>Issuer Wallet</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.35rem" }}>
              <User size={16} color="#6366f1" />
              <code style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                {data.onChain?.issuer.slice(0, 10)}...{data.onChain?.issuer.slice(-8)}
              </code>
            </div>
          </div>

          <div>
            <span style={{ color: "#64748b", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 700 }}>Issuance Date</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.35rem" }}>
              <Calendar size={16} color="#a855f7" />
              <span style={{ fontSize: "0.9rem", color: "#f8fafc" }}>
                {data.onChain?.issuedAt ? new Date(data.onChain.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Hashes Section */}
        <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(148, 163, 184, 0.1)", paddingTop: "1.5rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>Cryptographic Proofs</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <span style={{ color: "#64748b", fontSize: "0.8rem", display: "block" }}>Credential ID (On-Chain)</span>
              <code style={{ fontSize: "0.8rem", color: "#38bdf8", wordBreak: "break-all" }}>{id}</code>
            </div>

            <div>
              <span style={{ color: "#64748b", fontSize: "0.8rem", display: "block" }}>Credential Data Hash</span>
              <code style={{ fontSize: "0.8rem", color: "#94a3b8", wordBreak: "break-all" }}>{data.onChain?.credentialHash}</code>
            </div>

            <div>
              <span style={{ color: "#64748b", fontSize: "0.8rem", display: "block" }}>Subject Hash (PII Commitment)</span>
              <code style={{ fontSize: "0.8rem", color: "#94a3b8", wordBreak: "break-all" }}>{data.onChain?.subjectHash}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
