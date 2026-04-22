"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Share2, Award } from "lucide-react";
import { format } from "date-fns";

interface CertData {
  cert_id: number;
  title: string;
  description: string;
  category: string;
  image_url: string;
  issue_date: number; // Unix timestamp in seconds
  recipient_wallet: string;
  issuer_name: string;
  issuer_logo: string;
}

export default function CertificateRenderer({ data }: { data: CertData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  useEffect(() => {
    const drawCertificate = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = 1754;
      const h = 1240;
      canvas.width = w;
      canvas.height = h;

      ctx.fillStyle = "#FFFAED";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#4B6E48";
      ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      
      ctx.strokeStyle = "rgba(75, 110, 72, 0.3)";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, w - 120, h - 120);

      ctx.font = "italic 400px serif";
      ctx.fillStyle = "rgba(160, 82, 45, 0.03)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText("ON-CHAIN", 0, 0);
      ctx.rotate(Math.PI / 4);
      ctx.translate(-w / 2, -h / 2);

      const renderImage = (src: string, dx: number, dy: number, dw: number, dh: number) => {
        return new Promise<void>((resolve) => {
          if (!src) return resolve();
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, dx, dy, dw, dh);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src.startsWith("Qm") || src.startsWith("bafy") || src.startsWith("blob") 
            ? src 
            : src.includes("ipfs") ? src : `https://gateway.pinata.cloud/ipfs/${src}`;
        });
      };

      let startY = 160;
      
      if (data.issuer_logo) {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#4B6E48";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const logoSize = 140;
        ctx.roundRect(w / 2 - logoSize / 2, startY, logoSize, logoSize, 20);
        ctx.fill();
        ctx.stroke();
        
        await renderImage(data.issuer_logo, w / 2 - logoSize / 2 + 5, startY + 5, logoSize - 10, logoSize - 10);
        startY += logoSize + 40;
      }
      
      ctx.fillStyle = "#1A1A18";
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      
      ctx.font = "bold 80px serif";
      ctx.fillText(data.issuer_name || "CERTIFICATE OF ACHIEVEMENT", w / 2, startY);

      ctx.fillStyle = "#A0522D";
      ctx.font = "italic 36px sans-serif";
      ctx.fillText(`Certificate of ${data.category || "Excellence"}`, w / 2, startY + 100);

      ctx.fillStyle = "#5c5c56";
      ctx.font = "30px sans-serif";
      ctx.fillText("This verifies that Wallet", w / 2, startY + 240);

      ctx.fillStyle = "#1A1A18";
      ctx.font = "bold 60px monospace";
      ctx.fillText(`#${data.recipient_wallet}`, w / 2, startY + 290);

      ctx.fillStyle = "#5c5c56";
      ctx.font = "30px sans-serif";
      ctx.fillText("has been successfully awarded", w / 2, startY + 380);

      ctx.fillStyle = "#4B6E48";
      ctx.font = "bold 70px serif";
      ctx.fillText(data.title, w / 2, startY + 470);

      ctx.fillStyle = "#1A1A18";
      ctx.font = "34px sans-serif";
      
      const wrapText = (text: string, x: number, y: number, maxW: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if(metrics.width > maxW && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          }
          else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, currentY);
        return currentY;
      };
      
      const descEndY = wrapText(data.description, w / 2, startY + 570, 1000, 48);

      ctx.fillStyle = "#5c5c56";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "left";
      
      let dateStr = "N/A";
      if (data.issue_date > 0) {
        try {
          dateStr = format(new Date(data.issue_date * 1000), "PPP");
        } catch {
          dateStr = "N/A";
        }
      }
      ctx.fillText(`ISSUED: ${dateStr}`, 140, h - 140);
      
      ctx.textAlign = "right";
      ctx.fillText(`ON-CHAIN ID: ${data.cert_id}`, w - 140, h - 140);

      if (data.image_url) {
        await renderImage(data.image_url, w / 2 - 100, descEndY + 80, 200, 200);
      }

      setDownloadUrl(canvas.toDataURL("image/png"));
    };

    drawCertificate();
  }, [data]);

  const formatDisplayDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return "N/A";
    try {
      return format(new Date(timestamp * 1000), "MMMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="w-full">
      <div className="card-botanical p-6 bg-[var(--parchment)] shadow-lg mb-6 overflow-hidden flex justify-center">
        <canvas 
          ref={canvasRef} 
          className="w-full max-w-full h-auto border-2 border-[var(--faded-sage)] rounded-lg shadow-sm"
          style={{ maxHeight: "70vh", objectFit: "contain" }}
        />
      </div>
      
      <div className="flex gap-4">
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={`wallet_${data.recipient_wallet}_certificate_${data.cert_id}.png`}
            className="btn-forest flex-1 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" /> Download Digital Certificate
          </a>
        )}
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Verification Link copied to clipboard!");
          }}
          className="btn-outline flex items-center gap-2"
        >
          <Share2 className="w-5 h-5" /> Copy Link
        </button>
      </div>

      {data.issue_date > 0 && (
        <p className="text-center text-sm text-[var(--stone)] mt-4 flex items-center justify-center gap-2">
          <Award className="w-4 h-4" />
          Issued on {formatDisplayDate(data.issue_date)}
        </p>
      )}
    </div>
  );
}