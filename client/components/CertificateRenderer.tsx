"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { format } from "date-fns";

interface CertData {
  cert_id: number;
  title: string;
  description: string;
  category: string;
  image_url: string;
  issue_date: number;
  recipient_wallet: string; // The recipient wallet ID
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

      // Certificate dimensions (A4 Landscape at ~150 DPI)
      const w = 1754;
      const h = 1240;
      canvas.width = w;
      canvas.height = h;

      // Load fonts using Web Font API if needed, but defaults work.
      
      // 1. Background
      ctx.fillStyle = "#FFFAED"; // parchment color
      ctx.fillRect(0, 0, w, h);

      // 2. Botanical Borders
      ctx.strokeStyle = "#4B6E48"; // forest color
      ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      
      ctx.strokeStyle = "rgba(75, 110, 72, 0.3)";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, w - 120, h - 120);

      // Watermark symbol
      ctx.font = "italic 400px serif";
      ctx.fillStyle = "rgba(160, 82, 45, 0.03)"; // faint terra
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText("ON-CHAIN", 0, 0);
      ctx.rotate(Math.PI / 4);
      ctx.translate(-w / 2, -h / 2);

      // Helper function to render images with proper CORS and fallbacks
      const renderImage = (src: string, dx: number, dy: number, dw: number, dh: number) => {
        return new Promise<void>((resolve) => {
          if (!src) return resolve();
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, dx, dy, dw, dh);
            resolve();
          };
          img.onerror = () => resolve(); // Continue if image fails
          img.src = src.startsWith("Qm") || src.startsWith("bafy") ? `https://gateway.pinata.cloud/ipfs/${src}` : src;
        });
      };

      // 3. Header Texts & Issuer Logo
      
      let startY = 160;
      
      // If we have an issuer logo, draw it
      if (data.issuer_logo) {
        // Draw a subtle border for the logo
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#4B6E48"; // forest
        ctx.lineWidth = 2;
        ctx.beginPath();
        const logoSize = 140;
        ctx.roundRect(w / 2 - logoSize / 2, startY, logoSize, logoSize, 20);
        ctx.fill();
        ctx.stroke();
        
        await renderImage(data.issuer_logo, w / 2 - logoSize / 2 + 5, startY + 5, logoSize - 10, logoSize - 10);
        startY += logoSize + 40; // Push text down
      }
      
      ctx.fillStyle = "#1A1A18"; // dark-ink
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      
      ctx.font = "bold 80px serif";
      ctx.fillText(data.issuer_name || "CERTIFICATE OF ACHIEVEMENT", w / 2, startY);

      ctx.fillStyle = "#A0522D"; // terra
      ctx.font = "italic 36px sans-serif";
      ctx.fillText(`Certificate of ${data.category || "Excellence"}`, w / 2, startY + 100);

      // 4. Recipient
      ctx.fillStyle = "#5c5c56"; // stone
      ctx.font = "30px sans-serif";
      ctx.fillText("This verifies that Wallet", w / 2, startY + 240);

      ctx.fillStyle = "#1A1A18";
      ctx.font = "bold 60px monospace";
      ctx.fillText(`#${data.recipient_wallet}`, w / 2, startY + 290);

      ctx.fillStyle = "#5c5c56";
      ctx.font = "30px sans-serif";
      ctx.fillText("has been successfully awarded", w / 2, startY + 380);

      // 5. Title & Description
      ctx.fillStyle = "#4B6E48"; // forest
      ctx.font = "bold 70px serif";
      ctx.fillText(data.title, w / 2, startY + 470);

      ctx.fillStyle = "#1A1A18";
      ctx.font = "34px sans-serif";
      
      // Wrap text
      const maxWidth = -300;
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

      // 6. Footer (Date, On-Chain ID)
      ctx.fillStyle = "#5c5c56";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "left";
      const dateStr = data.issue_date > 0 ? format(new Date(data.issue_date * 1000), "PPP") : "N/A";
      ctx.fillText(`ISSUED: ${dateStr}`, 140, h - 140);
      
      ctx.textAlign = "right";
      ctx.fillText(`ON-CHAIN ID: ${data.cert_id}`, w - 140, h - 140);

      // 7. Render Custom Media/Image (if provided as part of certificate)
      if (data.image_url) {
        await renderImage(data.image_url, w / 2 - 100, descEndY + 80, 200, 200);
      }

      setDownloadUrl(canvas.toDataURL("image/png"));
    };

    drawCertificate();
  }, [data]);

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
    </div>
  );
}
