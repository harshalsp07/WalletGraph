"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, Check, Link2, Globe, Hash, User, Image, Loader2, AlertCircle, Maximize2, Trash2, Camera, Sparkles } from "lucide-react";
import { setWalletProfile, setProfileImage, viewWalletProfile, getProfileImage, checkConnection, getWalletAddress, getWalletIdByAddress } from "@/hooks/contract";
import { useToast } from "@/context/ToastContext";

interface Props {
  walletAddress?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface FormErrors {
  name?: string;
  bio?: string;
  avatar?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export default function EditProfileModal({ walletAddress, onClose, onSuccess }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarCid, setCurrentAvatarCid] = useState<string>("");
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Please upload a PNG, JPG, GIF, or WebP image";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be smaller than 5MB";
    }
    return null;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileProcess(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleFileProcess = (f: File) => {
    const validationError = validateFile(f);
    if (validationError) {
      setErrors(prev => ({ ...prev, avatar: validationError }));
      showToast(validationError, "error");
      return;
    }
    
    setErrors(prev => ({ ...prev, avatar: undefined }));
    setFile(f);
    setAvatarPreview(URL.createObjectURL(f));
    setHasUnsavedChanges(true);
    setShowRemoveConfirm(false);
  };

  const handleRemoveAvatar = () => {
    if (currentAvatarCid || file) {
      setShowRemoveConfirm(true);
    }
  };

  const confirmRemoveAvatar = () => {
    setFile(null);
    setAvatarPreview(null);
    setCurrentAvatarCid("");
    setHasUnsavedChanges(true);
    setShowRemoveConfirm(false);
  };

  const cancelRemoveAvatar = () => {
    setShowRemoveConfirm(false);
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (name.length > 32) {
      newErrors.name = "Display name must be 32 characters or less";
    }
    
    if (bio.length > 160) {
      newErrors.bio = "Bio must be 160 characters or less";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    if (!validateForm()) {
      showToast("Please fix the errors below", "error");
      return;
    }
    
    setSaving(true);

    try {
      showToast("Awaiting signature to update profile...", "info");
      
      let avatarCid = null;
      if (file && avatarPreview && !currentAvatarCid) {
        setUploadingAvatar(true);
        setUploadProgress(10);
        
        try {
          avatarCid = await uploadToPinata(file);
          setUploadProgress(80);
          setUploadingAvatar(false);
          
          await setProfileImage(address, avatarCid);
          showToast("Avatar updated!", "success");
        } catch (uploadError) {
          setUploadingAvatar(false);
          throw uploadError;
        }
      } else if (!file && (currentAvatarCid || showRemoveConfirm)) {
        await setProfileImage(address, "");
        showToast("Avatar removed", "success");
      }
      
      let socialParts: string[] = [];
      if (twitter) socialParts.push("Twitter: " + twitter.replace('@', ''));
      if (website) socialParts.push("Web: " + website);
      if (github) socialParts.push("GitHub: " + github);
      const fullBio = bio + (socialParts.length > 0 ? " | " + socialParts.join(" | ") : "");
      
      await setWalletProfile(address, name, fullBio);
      showToast("Profile saved!", "success");
      
      setHasUnsavedChanges(false);
      
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
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirm) return;
    }
    
    if (onClose) {
      onClose();
    } else if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const handleInputChange = (setter: (value: string) => void, field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setTouched(prev => ({ ...prev, [field]: true }));
    setHasUnsavedChanges(true);
    
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getCharacterLimitColor = (current: number, max: number) => {
    const percentage = current / max;
    if (percentage > 0.9) return "text-[var(--terra)]";
    if (percentage > 0.75) return "text-[var(--amber-sap)]";
    return "text-[var(--faded-sage)]";
  };

  const getCharacterBarWidth = (current: number, max: number) => {
    const percentage = Math.min((current / max) * 100, 100);
    if (percentage > 90) return "bg-[var(--terra)]";
    if (percentage > 75) return "bg-[var(--amber-sap)]";
    return "bg-[var(--forest)]";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-[var(--parchment)] rounded-3xl p-10 flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[var(--forest)] animate-spin" />
          <p className="mt-4 text-sm text-[var(--stone)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--parchment)] border border-[var(--faded-sage)] rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl relative my-8 animate-in zoom-in-95 duration-300">
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 text-[var(--stone)] hover:text-[var(--dark-ink)] hover:bg-[var(--warm-cream)] p-2 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-[var(--dark-ink)]">Edit Profile</h2>
            <p className="text-sm text-[var(--stone)]">Manage your public identity</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">
              Avatar
            </label>
            
            <div 
              ref={dropZoneRef}
              className={`
                relative rounded-2xl border-2 border-dashed transition-all duration-300
                ${isDragOver 
                  ? "border-[var(--forest)] bg-[var(--faded-sage)]/20 scale-[1.02]" 
                  : "border-[var(--faded-sage)] hover:border-[var(--sage)]"
                }
                ${errors.avatar ? "border-[var(--terra)] bg-[var(--terra)]/5" : ""}
                ${uploadingAvatar ? "pointer-events-none opacity-70" : "cursor-pointer"}
              `}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileChange}
                className="hidden"
                disabled={uploadingAvatar}
              />
              
              {uploadingAvatar ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <Loader2 className="w-10 h-10 text-[var(--forest)] animate-spin mb-3" />
                  <p className="text-sm font-medium text-[var(--dark-ink)]">Uploading to IPFS...</p>
                  <div className="w-48 h-2 bg-[var(--faded-sage)] rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--forest)] to-[var(--moss)] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--stone)] mt-2">{uploadProgress}%</p>
                </div>
              ) : avatarPreview ? (
                <div className="relative">
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-[var(--faded-sage)]/30 flex-shrink-0">
                      <img 
                        src={avatarPreview} 
                        alt="Avatar Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--dark-ink)] flex items-center gap-2">
                        <Check className="w-4 h-4 text-[var(--forest)]" />
                        Preview ready
                      </p>
                      <p className="text-sm text-[var(--stone)] mt-1">
                        {file ? file.name : "Current avatar"}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--terra)] bg-[var(--terra)]/10 hover:bg-[var(--terra)]/20 rounded-full transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--forest)] bg-[var(--forest)]/10 hover:bg-[var(--forest)]/20 rounded-full transition-colors flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {isDragOver && (
                    <div className="absolute inset-0 bg-[var(--forest)]/10 flex items-center justify-center rounded-2xl">
                      <p className="text-[var(--forest)] font-medium">Drop new image</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--faded-sage)]/30 flex items-center justify-center mb-3">
                    <Image className="w-8 h-8 text-[var(--stone)]" />
                  </div>
                  <p className="text-base font-medium text-[var(--dark-ink)]">
                    Drop your avatar here
                  </p>
                  <p className="text-sm text-[var(--stone)] mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-[var(--faded-sage)] mt-3 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    PNG, JPG, GIF or WebP • Max 5MB
                  </p>
                </div>
              )}
            </div>
            
            {errors.avatar && (
              <p className="text-sm text-[var(--terra)] flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4" />
                {errors.avatar}
              </p>
            )}
            
            {showRemoveConfirm && (
              <div className="flex items-center gap-2 p-3 bg-[var(--terra)]/10 rounded-xl border border-[var(--terra)]/30">
                <AlertCircle className="w-5 h-5 text-[var(--terra)] flex-shrink-0" />
                <p className="text-sm text-[var(--dark-ink)] flex-1">Remove avatar?</p>
                <button
                  type="button"
                  onClick={confirmRemoveAvatar}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--terra)] rounded-full"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={cancelRemoveAvatar}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--stone)] bg-[var(--faded-sage)]/30 rounded-full"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 space-y-5 border border-[var(--faded-sage)]/50 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[var(--dark-ink)]">Display Name</label>
                <span className={`text-xs ${getCharacterLimitColor(name.length, 32)}`}>
                  {name.length}/32
                </span>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  maxLength={32}
                  value={name}
                  onChange={handleInputChange(setName, "name")}
                  onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                  className={`
                    w-full bg-[var(--warm-cream)] border rounded-xl px-4 py-3 outline-none transition-all
                    focus:ring-2 focus:ring-[var(--forest)]/30
                    ${errors.name && touched.name 
                      ? "border-[var(--terra)] focus:border-[var(--terra)]" 
                      : "border-[var(--faded-sage)] focus:border-[var(--forest)]"
                    }
                  `}
                  placeholder="Enter your display name"
                />
                <div className="absolute bottom-0 left-0 h-1 bg-[var(--faded-sage)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${getCharacterBarWidth(name.length, 32)}`}
                    style={{ width: `${(name.length / 32) * 100}%` }}
                  />
                </div>
              </div>
              {errors.name && touched.name && (
                <p className="text-sm text-[var(--terra)] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[var(--dark-ink)]">Bio</label>
                <span className={`text-xs ${getCharacterLimitColor(bio.length, 160)}`}>
                  {bio.length}/160
                </span>
              </div>
              <div className="relative">
                <textarea 
                  maxLength={160}
                  value={bio}
                  onChange={handleInputChange(setBio, "bio")}
                  onBlur={() => setTouched(prev => ({ ...prev, bio: true }))}
                  className={`
                    w-full bg-[var(--warm-cream)] border rounded-xl px-4 py-3 outline-none transition-all resize-none
                    focus:ring-2 focus:ring-[var(--forest)]/30
                    ${errors.bio && touched.bio 
                      ? "border-[var(--terra)] focus:border-[var(--terra)]" 
                      : "border-[var(--faded-sage)] focus:border-[var(--forest)]"
                    }
                  `}
                  placeholder="Tell others about yourself..."
                  rows={3}
                />
                <div className="absolute bottom-0 left-0 h-1 bg-[var(--faded-sage)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${getCharacterBarWidth(bio.length, 160)}`}
                    style={{ width: `${(bio.length / 160) * 100}%` }}
                  />
                </div>
              </div>
              {errors.bio && touched.bio && (
                <p className="text-sm text-[var(--terra)] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.bio}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[var(--faded-sage)]/50 shadow-sm">
            <p className="text-sm font-semibold text-[var(--dark-ink)] mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Social Links
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--stone)] flex items-center gap-1">
                  <User className="w-3 h-3" /> X/Twitter
                </label>
                <input 
                  type="text" 
                  value={twitter}
                  onChange={(e) => { setTwitter(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full bg-[var(--warm-cream)] border border-[var(--faded-sage)] rounded-xl px-3 py-2.5 outline-none focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--forest)]/30 transition-all font-sans text-sm"
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--stone)] flex items-center gap-1">
                  <Hash className="w-3 h-3" /> GitHub
                </label>
                <input 
                  type="text" 
                  value={github}
                  onChange={(e) => { setGithub(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full bg-[var(--warm-cream)] border border-[var(--faded-sage)] rounded-xl px-3 py-2.5 outline-none focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--forest)]/30 transition-all font-sans text-sm"
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--stone)] flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Website
                </label>
                <input 
                  type="text" 
                  value={website}
                  onChange={(e) => { setWebsite(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full bg-[var(--warm-cream)] border border-[var(--faded-sage)] rounded-xl px-3 py-2.5 outline-none focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--forest)]/30 transition-all font-sans text-sm"
                  placeholder="yoursite.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[var(--forest)]/5 to-[var(--moss)]/5 rounded-2xl p-5 border border-[var(--forest)]/20">
            <p className="text-sm font-semibold text-[var(--dark-ink)] mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Live Preview
            </p>
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] flex items-center justify-center text-white font-bold overflow-hidden ring-4 ring-[var(--forest)]/20 flex-shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-[var(--dark-ink)] truncate">{name || "Your Name"}</p>
                <p className="text-sm text-[var(--stone)] truncate">{bio || "Your bio will appear here..."}</p>
                {(twitter || github || website) && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {twitter && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--forest)]/10 text-[var(--forest)] rounded-full">
                        @{twitter.replace('@', '')}
                      </span>
                    )}
                    {github && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--dark-ink)]/10 text-[var(--dark-ink)] rounded-full">
                        {github}
                      </span>
                    )}
                    {website && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--amber-sap)]/10 text-[var(--amber-sap)] rounded-full">
                        {website}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving || !address}
            className="w-full btn-forest flex items-center justify-center gap-2 py-4 text-lg disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Updating Profile...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>
          
          {!address && (
            <p className="text-center text-sm text-[var(--terra)] flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Please connect your wallet to edit profile
            </p>
          )}
          
          <p className="text-center text-xs text-[var(--faded-sage)]">
            Press <kbd className="px-1.5 py-0.5 bg-[var(--faded-sage)]/20 rounded">Esc</kbd> to close
          </p>
        </form>
      </div>
    </div>
  );
}