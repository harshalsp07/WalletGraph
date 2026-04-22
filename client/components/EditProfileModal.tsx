"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Check, Link2, Globe, Hash, User } from "lucide-react";
import { setWalletProfile, setProfileImage, viewWalletProfile, getProfileImage, checkConnection, getWalletAddress, getWalletIdByAddress } from "@/hooks/contract";
import { useToast } from "@/context/ToastContext";

interface Props {
  walletAddress?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function EditProfileModal({ walletAddress, onClose, onSuccess }: Props) {
  const { showToast } = useToast();
  const [address, setAddress] = useState<string | null>(walletAddress || null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarCid, setCurrentAvatarCid] = useState<string>("");

useEffect(() => {
    (async () => {
      try {
        if (!address) {
          const connected = await checkConnection();
          if (connected) {
            const addr = await getWalletAddress();
            setAddress(addr);
          }
        }
        
        if (address) {
          const wIdRaw = await getWalletIdByAddress(address);
          const wId = typeof wIdRaw === 'bigint' ? Number(wIdRaw) : Number(wIdRaw?.value || 0);
          
          if (wId > 0) {
            const [profile, avatarCid] = await Promise.all([
              viewWalletProfile(wId),
              getProfileImage(wId)
            ]);
            
            if (profile) {
              setName(profile.display_name || "");
              setBio(profile.bio || "");
            }
            if (avatarCid) {
              setCurrentAvatarCid(String(avatarCid));
              setAvatarPreview("https://gateway.pinata.cloud/ipfs/" + avatarCid);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setAvatarPreview(URL.createObjectURL(f));
    }
  };

  const uploadToPinata = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload to IPFS via Pinata");
    }
    const data = await res.json();
    return data.IpfsHash;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    setSaving(true);

    try {
      showToast("Awaiting signature to update profile...", "info");
      
      let avatarCid = null;
      if (file) {
        setUploadingAvatar(true);
        avatarCid = await uploadToPinata(file);
        setUploadingAvatar(false);
        
        await setProfileImage(address, avatarCid);
        showToast("Avatar updated!", "success");
      }

      let socialParts: string[] = [];
      if (twitter) socialParts.push("Twitter: " + twitter.replace('@', ''));
      if (website) socialParts.push("Web: " + website);
      if (github) socialParts.push("GitHub: " + github);
      const fullBio = bio + (socialParts.length > 0 ? " | " + socialParts.join(" | ") : "");
      
      await setWalletProfile(address, name, fullBio);
      showToast("Profile saved!", "success");

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Profile update failed", "error");
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-[var(--parchment)] rounded-3xl p-10 flex flex-col items-center">
          <div className="h-10 w-10 border-3 border-[var(--forest)] border-t-transparent animate-spin rounded-full" />
          <p className="mt-4 text-sm text-[var(--stone)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[var(--parchment)] border border-[var(--faded-sage)] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative my-8">
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 text-[var(--stone)] hover:text-[var(--dark-ink)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-heading font-bold text-[var(--dark-ink)] mb-1">Edit Profile</h2>
        <p className="text-sm text-[var(--stone)] mb-6">Manage your public identity on the reputation graph.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-[var(--sage)] flex items-center justify-center overflow-hidden bg-white hover:border-[var(--forest)] transition-colors cursor-pointer group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-8 h-8 text-[var(--stone)] group-hover:text-[var(--forest)]" />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold">Change</span>
              </div>
            </div>
            <p className="text-xs text-[var(--stone)] text-center">
              Click to upload Avatar<br/><span className="text-[10px] text-[var(--faded-sage)]">(Stored on IPFS)</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Display Name</label>
              <span className="text-[10px] text-[var(--stone)]">{name.length}/32</span>
            </div>
            <input 
              type="text" 
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)] transition-all font-sans text-[var(--dark-ink)]"
              placeholder="e.g. Alice"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Bio</label>
              <span className="text-[10px] text-[var(--stone)]">{bio.length}/160</span>
            </div>
            <textarea 
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)] transition-all font-sans text-[var(--dark-ink)] resize-none"
              placeholder="Tell others about yourself..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--stone)] flex items-center gap-1">
                <User className="w-3 h-3" /> X/Twitter
              </label>
              <input 
                type="text" 
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-3 py-2 outline-none focus:border-[var(--forest)] transition-all font-sans text-sm text-[var(--dark-ink)]"
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--stone)] flex items-center gap-1">
                <Hash className="w-3 h-3" /> GitHub
              </label>
              <input 
                type="text" 
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-3 py-2 outline-none focus:border-[var(--forest)] transition-all font-sans text-sm text-[var(--dark-ink)]"
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--stone)] flex items-center gap-1">
                <Globe className="w-3 h-3" /> Website
              </label>
              <input 
                type="text" 
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-3 py-2 outline-none focus:border-[var(--forest)] transition-all font-sans text-sm text-[var(--dark-ink)]"
                placeholder="yoursite.com"
              />
            </div>
          </div>

          <div className="bg-[var(--parchment)] rounded-xl p-4 border border-[var(--faded-sage)]">
            <p className="text-xs text-[var(--stone)] mb-2">Profile Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--forest)] flex items-center justify-center text-white font-bold">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  address?.slice(0, 2) || "?"
                )}
              </div>
              <div>
                <p className="font-bold text-[var(--dark-ink)]">{name || "Unnamed"}</p>
                <p className="text-xs text-[var(--stone)] truncate max-w-[200px]">{bio || "No bio yet"}</p>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving || !address}
            className="w-full btn-forest flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            ) : (
              <><Check className="w-5 h-5" /> Save Profile</>
            )}
          </button>
          
          {!address && (
            <p className="text-center text-xs text-[var(--terra)]">Please connect your wallet to edit profile</p>
          )}
        </form>
      </div>
    </div>
  );
}
