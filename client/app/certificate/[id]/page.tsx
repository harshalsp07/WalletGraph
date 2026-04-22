"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FloatingHeader from "@/components/FloatingHeader";
import { viewCertificate, viewIssuer } from "@/hooks/contract";
import CertificateRenderer from "@/components/CertificateRenderer";
import { XCircle, CheckCircle2 } from "lucide-react";

export default function CertificateVerification() {
  const params = useParams();
  const certId = Number(params.id);

  const [certData, setCertData] = useState<any>(null);
  const [issuerData, setIssuerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!certId) throw new Error("Invalid Certificate ID");
        
        const cert = await viewCertificate(certId) as any;
        if (!cert) throw new Error("Certificate not found on-chain");

        setCertData(cert);

        // Fetch issuer data
        const issuerId = Number(cert.issuer_id);
        if (issuerId > 0) {
          const issuer = await viewIssuer(issuerId);
          setIssuerData(issuer);
        }

      } catch (err: any) {
        setError(err.message || "Failed to load certificate");
      } finally {
        setLoading(false);
      }
    })();
  }, [certId]);

  return (
    <div className="min-h-screen bg-[var(--warm-cream)] relative overflow-hidden">
      <FloatingHeader />

      <main className="relative max-w-5xl mx-auto px-6 pt-32 pb-24 z-10 w-full animate-fade-in-up">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-32">
             <div className="h-12 w-12 rounded-full border-3 border-[var(--forest)] border-t-transparent animate-spin" />
             <p className="mt-4 text-sm text-[var(--stone)]">Reading from Stellar Testnet...</p>
           </div>
        ) : error ? (
          <div className="card-botanical p-12 text-center max-w-2xl mx-auto">
            <XCircle className="w-16 h-16 text-[var(--terra)] mx-auto mb-6 opacity-80" />
            <h1 className="text-3xl font-heading font-black text-[var(--dark-ink)] mb-4">Certificate Not Found</h1>
            <p className="text-[var(--stone)] mb-8">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
               <CertificateRenderer data={{
                 cert_id: certId,
                 title: String(certData.title),
                 description: String(certData.description),
                 category: String(certData.category),
                 image_url: String(certData.image_url),
                 issue_date: Number(certData.issue_date),
                 recipient_wallet: String(certData.recipient_wallet_id),
                 issuer_name: issuerData ? String(issuerData.name) : "Unknown Issuer",
                 issuer_logo: issuerData ? String(issuerData.logo_url) : ""
               }} />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="card-botanical p-6">
                <div className="flex items-center gap-3 mb-6">
                   {certData.is_valid ? (
                     <CheckCircle2 className="w-8 h-8 text-[var(--forest)]" />
                   ) : (
                     <XCircle className="w-8 h-8 text-[var(--terra)]" />
                   )}
                   <div>
                     <h3 className="font-heading font-bold text-xl text-[var(--dark-ink)]">
                       {certData.is_valid ? "Valid Credential" : "Revoked"}
                     </h3>
                     <p className="text-xs text-[var(--stone)] font-mono-data">ON-CHAIN VERIFIED</p>
                   </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="pb-4 border-b border-[var(--faded-sage)]">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold">Recipient Wallet ID</span>
                    <span className="font-mono-data text-[var(--dark-ink)]">#{Number(certData.recipient_wallet_id)}</span>
                  </div>
                  <div className="pb-4 border-b border-[var(--faded-sage)]">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold">Date Issued</span>
                    <span className="text-[var(--dark-ink)]">{new Date(Number(certData.issue_date) * 1000).toLocaleString()}</span>
                  </div>
                  <div className="pb-4 border-b border-[var(--faded-sage)]">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold">Issuer</span>
                    <span className="text-[var(--dark-ink)]">{issuerData ? String(issuerData.name) : `Issuer #${Number(certData.issuer_id)}`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
