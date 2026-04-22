"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FloatingHeader from "@/components/FloatingHeader";
import { viewCertificate, viewIssuer } from "@/hooks/contract";
import CertificateRenderer from "@/components/CertificateRenderer";
import { XCircle, CheckCircle2, Calendar, Wallet, Building2, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface CertData {
  cert_id: number;
  issuer_id: number;
  recipient_wallet_id: number;
  title: string;
  description: string;
  category: string;
  image_cid: string;
  issued_at: number;
  expires_at: number;
  is_revoked: boolean;
}

interface IssuerData {
  name: string;
  logo_url: string;
  description: string;
}

export default function CertificateVerification() {
  const params = useParams();
  const certId = Number(params.id);

  const [certData, setCertData] = useState<CertData | null>(null);
  const [issuerData, setIssuerData] = useState<IssuerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!certId || isNaN(certId)) throw new Error("Invalid Certificate ID");
        
        const cert = await viewCertificate(certId) as any;
        if (!cert) throw new Error("Certificate not found on-chain");

        const parsedCert: CertData = {
          cert_id: Number(cert.cert_id) || certId,
          issuer_id: Number(cert.issuer_id) || 0,
          recipient_wallet_id: Number(cert.recipient_wallet_id) || 0,
          title: String(cert.title || "Certificate"),
          description: String(cert.description || ""),
          category: String(cert.category || "Achievement"),
          image_cid: String(cert.image_cid || ""),
          issued_at: Number(cert.issued_at) || 0,
          expires_at: Number(cert.expires_at) || 0,
          is_revoked: Boolean(cert.is_revoked) || false,
        };

        setCertData(parsedCert);

        const issuerId = Number(parsedCert.issuer_id);
        if (issuerId > 0) {
          const issuer = await viewIssuer(issuerId) as any;
          if (issuer) {
            setIssuerData({
              name: String(issuer.name || "Unknown Issuer"),
              logo_url: String(issuer.logo_url || ""),
              description: String(issuer.description || ""),
            });
          }
        }

      } catch (err: any) {
        setError(err.message || "Failed to load certificate");
      } finally {
        setLoading(false);
      }
    })();
  }, [certId]);

  const isValid = certData ? !certData.is_revoked : false;
  const isExpired = certData && certData.expires_at > 0 ? Date.now() / 1000 > certData.expires_at : false;

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return "N/A";
    try {
      return format(new Date(timestamp * 1000), "MMMM d, yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  const formatDateTime = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return "N/A";
    try {
      return format(new Date(timestamp * 1000), "MMMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--warm-cream)] relative overflow-hidden">
      <FloatingHeader />

      <main className="relative max-w-5xl mx-auto px-6 pt-32 pb-24 z-10 w-full animate-in fade-in duration-500">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-32">
             <div className="h-12 w-12 rounded-full border-3 border-[var(--forest)] border-t-transparent animate-spin" />
             <p className="mt-4 text-sm text-[var(--stone)]">Reading from Stellar Testnet...</p>
           </div>
        ) : error ? (
          <div className="card-botanical p-12 text-center max-w-2xl mx-auto">
            <AlertTriangle className="w-16 h-16 text-[var(--terra)] mx-auto mb-6 opacity-80" />
            <h1 className="text-3xl font-heading font-black text-[var(--dark-ink)] mb-4">Certificate Not Found</h1>
            <p className="text-[var(--stone)] mb-8">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
               <CertificateRenderer data={{
                 cert_id: certData?.cert_id || certId,
                 title: certData?.title || "Certificate",
                 description: certData?.description || "",
                 category: certData?.category || "Achievement",
                 image_url: certData?.image_cid ? `https://gateway.pinata.cloud/ipfs/${certData.image_cid}` : "",
                 issue_date: certData?.issued_at || 0,
                 recipient_wallet: String(certData?.recipient_wallet_id || ""),
                 issuer_name: issuerData?.name || `Issuer #${certData?.issuer_id}`,
                 issuer_logo: issuerData?.logo_url || ""
               }} />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="card-botanical p-6">
                <div className="flex items-center gap-3 mb-6">
                  {isExpired ? (
                    <Clock className="w-8 h-8 text-[var(--amber-sap)]" />
                  ) : isValid ? (
                    <ShieldCheck className="w-8 h-8 text-[var(--forest)]" />
                  ) : (
                    <XCircle className="w-8 h-8 text-[var(--terra)]" />
                  )}
                  <div>
                    <h3 className="font-heading font-bold text-xl text-[var(--dark-ink)]">
                      {isExpired ? "Expired" : isValid ? "Valid Credential" : "Revoked"}
                    </h3>
                    <p className="text-xs text-[var(--stone)] font-mono-data">ON-CHAIN VERIFIED</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="pb-4 border-b border-[var(--faded-sage)]">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold flex items-center gap-1">
                      <Wallet className="w-3 h-3" /> Recipient Wallet ID
                    </span>
                    <span className="font-mono-data text-[var(--dark-ink)] text-lg">#{certData?.recipient_wallet_id}</span>
                  </div>
                  
                  <div className="pb-4 border-b border-[var(--faded-sage)]">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date Issued
                    </span>
                    <span className="text-[var(--dark-ink)] font-medium">{formatDate(certData?.issued_at || 0)}</span>
                    <span className="block text-xs text-[var(--faded-sage)] mt-1">
                      {formatDateTime(certData?.issued_at || 0)}
                    </span>
                  </div>

                  {certData?.expires_at && certData.expires_at > 0 && (
                    <div className="pb-4 border-b border-[var(--faded-sage)]">
                      <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Expires
                      </span>
                      <span className={`font-medium ${isExpired ? "text-[var(--terra)]" : "text-[var(--dark-ink)]"}`}>
                        {formatDate(certData.expires_at)}
                      </span>
                      {isExpired && (
                        <span className="block text-xs text-[var(--terra)] mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> This certificate has expired
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pb-4 border-b border-[var(--faded-sage)]">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Issuer
                    </span>
                    <span className="text-[var(--dark-ink)] font-medium">{issuerData?.name || `Issuer #${certData?.issuer_id}`}</span>
                  </div>

                  <div className="pt-2">
                    <span className="block text-[var(--stone)] mb-1 uppercase tracking-wider text-xs font-semibold">Certificate ID</span>
                    <span className="font-mono-data text-[var(--dark-ink)]">#{certData?.cert_id}</span>
                  </div>
                </div>
              </div>

              {certData?.category && (
                <div className="bg-white rounded-2xl p-5 border border-[var(--faded-sage)]/50 shadow-sm">
                  <p className="text-xs font-semibold text-[var(--stone)] uppercase tracking-wider mb-2">Category</p>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--forest)]/10 text-[var(--forest)] text-sm font-medium">
                    {certData.category}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}