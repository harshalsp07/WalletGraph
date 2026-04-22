"use client";

import { useEffect, useState } from "react";
import FloatingHeader from "@/components/FloatingHeader";
import { 
  checkConnection, 
  getWalletAddress, 
  getIssuerByAddress, 
  viewIssuer, 
  registerIssuer, 
  issueCertificate,
  getWalletIdByAddress,
  viewIssuerCertificates
} from "@/hooks/contract";
import { ShieldCheck, Award, Upload, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";

interface IssuerRecord {
  issuer_id: number;
  name: string;
  description: string;
  logo_url: string;
  is_verified: boolean;
  total_issued: number;
}

export default function CertificatesHub() {
  const { showToast } = useToast();
  const [address, setAddress] = useState<string | null>(null);
  const [issuer, setIssuer] = useState<IssuerRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"issue" | "history">("issue");

  // Issue Form
  const [issueForm, setIssueForm] = useState({
    recipientAddress: "",
    title: "",
    description: "",
    category: "",
    imageUrl: ""
  });
  const [issuing, setIssuing] = useState(false);

  // Register Form
  const [regForm, setRegForm] = useState({ name: "", description: "", logoUrl: "" });
  const [registering, setRegistering] = useState(false);
  
  // Pinata IPFS Logo Upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setLogoFile(f);
      setLogoPreview(URL.createObjectURL(f));
    }
  };

  const uploadToPinata = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload logo to IPFS");
    const data = await res.json();
    return data.IpfsHash;
  };

  useEffect(() => {
    (async () => {
      try {
        const isConn = await checkConnection();
        if (isConn) {
          const addr = await getWalletAddress();
          setAddress(addr);

          if (addr) {
            const issuerIdRaw = await getIssuerByAddress(addr);
            const iid = typeof issuerIdRaw === 'bigint' ? Number(issuerIdRaw) : Number(issuerIdRaw?.value || 0);

            if (iid > 0) {
              const issuerData = await viewIssuer(iid) as any;
              setIssuer({
                issuer_id: iid,
                name: String(issuerData.name || ""),
                description: String(issuerData.description || ""),
                logo_url: String(issuerData.logo_url || ""),
                is_verified: Boolean(issuerData.is_verified || false),
                total_issued: Number(issuerData.total_issued || 0),
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading issuer data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setRegistering(true);
    try {
      showToast("Awaiting signature to register as Issuer...", "info");
      
      let finalLogoUrl = regForm.logoUrl;
      if (logoFile) {
        showToast("Uploading logo to IPFS...", "info");
        finalLogoUrl = await uploadToPinata(logoFile);
      }
      
      await registerIssuer(address, regForm.name, regForm.description, finalLogoUrl);
      showToast("Registered successfully!", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      showToast(e.message || "Registration failed", "error");
    } finally {
      setRegistering(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !issuer) return;
    setIssuing(true);
    try {
      // Find beneficiary ID
      const recipientIdRaw = await getWalletIdByAddress(issueForm.recipientAddress);
      const recipientId = typeof recipientIdRaw === 'bigint' ? Number(recipientIdRaw) : Number(recipientIdRaw?.value || 0);

      if (recipientId === 0) {
        throw new Error("Target address is not registered on the reputation graph.");
      }

      showToast("Awaiting signature to issue certificate...", "info");
      await issueCertificate(
        address,
        recipientId,
        issueForm.title,
        issueForm.description,
        issueForm.category,
        issueForm.imageUrl
      );

      showToast("Certificate issued on-chain!", "success");
      setIssueForm({ recipientAddress: "", title: "", description: "", category: "", imageUrl: "" });
    } catch (e: any) {
      showToast(e.message || "Failed to issue certificate", "error");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--parchment)] relative overflow-hidden">
      <FloatingHeader />

      <main className="relative max-w-4xl mx-auto px-6 pt-32 pb-24 z-10 w-full animate-fade-in-up">
        <div className="mb-10 animate-fade-in-up uppercase tracking-widest text-[#2c3e2e] text-sm font-semibold flex items-center gap-2">
          <span>WalletGraph</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra)]" />
          <span>Certificate Authority</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-[var(--dark-ink)] leading-tight tracking-tight mb-4 group animate-fade-in-up animation-delay-100">
          Verifiable <span className="text-[var(--forest)] italic pr-2">Credentials</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--stone)] max-w-2xl leading-relaxed mb-12 animate-fade-in-up animation-delay-200">
          Issue cryptographically secure, on-chain certificates directly to wallet addresses. Verify skills, attendance, and achievements.
        </p>

        {!loading && (
          <div className="animate-fade-in-up animation-delay-300">
            {!address ? (
              <div className="card-botanical p-10 text-center">
                <ShieldCheck className="w-16 h-16 text-[var(--stone)] mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)] mb-2">Connect to Issue Certificates</h3>
                <p className="text-sm text-[var(--stone)] mb-6">You must connect your Stellar wallet to access the Certificate Authority.</p>
                <Link href="/login" className="btn-forest inline-block cursor-pointer">Connect Wallet</Link>
              </div>
            ) : !issuer ? (
              <div className="card-botanical p-8 sm:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[var(--forest)]/10 text-[var(--forest)] rounded-2xl flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)]">Register as Issuer</h3>
                    <p className="text-sm text-[var(--stone)]">Create your organization identity on-chain.</p>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Organization Name</label>
                    <input 
                      required
                      value={regForm.name}
                      onChange={e => setRegForm({...regForm, name: e.target.value})}
                      className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans"
                      placeholder="e.g. Stellar Development Foundation"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Description</label>
                    <textarea 
                      required
                      value={regForm.description}
                      onChange={e => setRegForm({...regForm, description: e.target.value})}
                      className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans resize-none"
                      placeholder="Describe your organization..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)] flex justify-between">
                      <span>Organization Logo</span>
                      <span className="opacity-50">Optional</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--sage)] flex items-center justify-center overflow-hidden bg-white hover:border-[var(--forest)] transition-colors cursor-pointer">
                        {logoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-6 h-6 text-[var(--stone)]" />
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoChange} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--stone)] leading-tight">Upload a square image.</p>
                        <p className="text-[10px] text-[var(--stone)]/70 uppercase tracking-widest mt-1">Eternally pinned to IPFS</p>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={registering} className="btn-forest w-full mt-2 cursor-pointer">
                    {registering ? "Registering..." : "Register Organization"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Issuer Header */}
                <div className="card-botanical p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
                  <div className="w-20 h-20 bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] rounded-2xl flex items-center justify-center text-white text-3xl font-heading shadow-lg border-2 border-[var(--parchment)] z-10 overflow-hidden">
                    {issuer.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://gateway.pinata.cloud/ipfs/${issuer.logo_url}`} className="w-full h-full object-cover" alt="" />
                    ) : (
                      issuer.name.slice(0, 1)
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left z-10 mt-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h2 className="text-2xl font-heading font-bold text-[var(--dark-ink)]">{issuer.name}</h2>
                      {issuer.is_verified && <span title="Verified Authority"><CheckCircle2 className="w-5 h-5 text-blue-500" /></span>}
                    </div>
                    <p className="text-sm text-[var(--stone)] mb-3">{issuer.description}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 border border-[var(--faded-sage)] rounded-full text-xs font-mono-data text-[var(--forest)]">
                      <span>{issuer.total_issued} Certificates Issued</span>
                    </div>
                  </div>
                </div>

                <div className="card-botanical overflow-hidden">
                  <div className="flex border-b border-[var(--faded-sage)]">
                    <button 
                      onClick={() => setActiveTab("issue")}
                      className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-colors border-b-2 ${activeTab === "issue" ? "text-[var(--forest)] border-[var(--forest)]" : "text-[var(--stone)] border-transparent hover:text-[var(--dark-ink)]"}`}
                    >
                      Issue Certificate
                    </button>
                    <button 
                      onClick={() => setActiveTab("history")}
                      className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-colors border-b-2 ${activeTab === "history" ? "text-[var(--forest)] border-[var(--forest)]" : "text-[var(--stone)] border-transparent hover:text-[var(--dark-ink)]"}`}
                    >
                      Issue History
                    </button>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    {activeTab === "issue" ? (
                      <form onSubmit={handleIssue} className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Recipient Wallet Address</label>
                          <input 
                            required
                            value={issueForm.recipientAddress}
                            onChange={e => setIssueForm({...issueForm, recipientAddress: e.target.value})}
                            className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans text-sm font-mono-data"
                            placeholder="G..."
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Certificate Title</label>
                            <input 
                              required
                              value={issueForm.title}
                              onChange={e => setIssueForm({...issueForm, title: e.target.value})}
                              className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans text-sm"
                              placeholder="e.g. Completed Rust Bootcamp"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Category</label>
                            <input 
                              value={issueForm.category}
                              onChange={e => setIssueForm({...issueForm, category: e.target.value})}
                              className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans text-sm"
                              placeholder="e.g. Education, Employment"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Description</label>
                          <textarea 
                            required
                            value={issueForm.description}
                            onChange={e => setIssueForm({...issueForm, description: e.target.value})}
                            className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans text-sm resize-none"
                            placeholder="Detail the achievement..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Media IPFS CID (Optional)</label>
                          <input 
                            value={issueForm.imageUrl}
                            onChange={e => setIssueForm({...issueForm, imageUrl: e.target.value})}
                            className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-3 outline-none focus:border-[var(--forest)] font-sans text-sm"
                            placeholder="Qm... (link to custom badge image)"
                          />
                        </div>

                        <button type="submit" disabled={issuing} className="btn-forest w-full mt-4 flex items-center justify-center gap-2 cursor-pointer">
                          {issuing ? "Signing..." : <><Upload className="w-5 h-5"/> Issue On-Chain</>}
                        </button>
                      </form>
                    ) : (
                      <HistoryTab issuerId={issuer.issuer_id} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function HistoryTab({ issuerId }: { issuerId: number }) {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await viewIssuerCertificates(issuerId);
        if (data && Array.isArray(data)) {
          setCerts(data.reverse());
        }
      } catch (err) {
        console.error("Failed to load certs", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [issuerId]);

  if (loading) {
    return <div className="text-center py-10 text-[var(--stone)] text-sm">Loading history...</div>;
  }

  if (certs.length === 0) {
    return <div className="text-center py-10 text-[var(--stone)] text-sm">You haven't issued any certificates yet.</div>;
  }

  return (
    <div className="space-y-4">
      {certs.map((c: any, i) => (
        <div key={i} className="flex flex-col sm:flex-row items-center sm:justify-between p-4 bg-white border border-[var(--faded-sage)] rounded-2xl gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h4 className="font-bold text-[var(--dark-ink)] font-heading">{c.title || "Certificate"}</h4>
            <span className="text-xs font-mono-data text-[var(--stone)]">Certificate #{Number(c.cert_id || 0)} • Recipient Wallet #{Number(c.recipient_wallet_id || 0)}</span>
          </div>
          <Link href={`/certificate/${Number(c.cert_id || 0)}`} className="btn-outline text-xs px-4 py-2 cursor-pointer shadow-sm">
            View / Verify
          </Link>
        </div>
      ))}
    </div>
  );
}
