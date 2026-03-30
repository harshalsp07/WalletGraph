"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { animate } from "animejs";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container - Bottom Right */}
      <div className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const elRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elRef.current) {
      animate(elRef.current, {
        translateX: [40, 0],
        opacity: [0, 1],
        duration: 400,
        easing: "easeOutExpo"
      });
    }
  }, []);

  const handleClose = () => {
    if (elRef.current) {
      animate(elRef.current, {
        translateX: [0, 50],
        opacity: [1, 0],
        duration: 300,
        easing: "easeInQuad",
        complete: () => onRemove(toast.id)
      });
    } else {
      onRemove(toast.id);
    }
  };

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  const bgColor = isError ? "bg-[var(--terra)]/10" : isSuccess ? "bg-[var(--forest)]/10" : "bg-[var(--sage)]/20";
  const borderColor = isError ? "border-[var(--terra)]/30" : isSuccess ? "border-[var(--forest)]/30" : "border-[var(--sage)]";
  const textColor = isError ? "text-[var(--terra)]" : isSuccess ? "text-[var(--forest)]" : "text-[var(--dark-ink)]";

  return (
    <div
      ref={elRef}
      className={`relative flex items-center gap-3 w-80 p-4 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto ${bgColor} ${borderColor}`}
    >
      <div className={`flex-1 text-sm font-semibold ${textColor}`}>
        {toast.message}
      </div>
      <button 
        onClick={handleClose}
        className={`shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${textColor}`}
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
