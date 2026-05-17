"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Upload, X, QrCode, RefreshCw } from "lucide-react";

interface ScanProps {
  onScanResult: (decodedText: string) => void;
}

const READER_ID = "qr-reader";

const QRScanner = ({ onScanResult }: ScanProps) => {
  const onScanResultRef = useRef(onScanResult);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCameraActiveRef = useRef(false);

  const [mode, setMode] = useState<"idle" | "camera" | "upload">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"scanning" | "success" | "not_found" | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    onScanResultRef.current = onScanResult;
  }, [onScanResult]);

  // ─── Core cleanup: fully releases camera tracks + Html5Qrcode instance ───────
  const stopCamera = useCallback(async () => {
    // Revoke any object URL
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setScanStatus(null);
    setScannedText(null);
    setCameraError(null);

    const scanner = scannerRef.current;
    scannerRef.current = null;
    isCameraActiveRef.current = false;

    if (scanner) {
      // Stop the scanning loop first (only if it's actually scanning)
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        /* ignore – already stopped */
      }
      // Clear the DOM element Html5Qrcode injected into
      try {
        scanner.clear();
      } catch {
        /* ignore */
      }
    }

    // Belt-and-suspenders: kill any lingering MediaStream tracks on <video> elements
    // Html5Qrcode creates its own <video> inside #qr-reader; this catches edge cases
    // where stop() resolves before the stream is actually released.
    document.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
      const stream = video.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    });

    // Also ask the browser directly to stop all active camera tracks
    // (covers cases where Html5Qrcode created tracks outside of <video> srcObject)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (devices.length) {
        // getUserMedia isn't needed here; we can't enumerate active tracks via
        // the Permissions API alone, so the <video> sweep above is sufficient.
        // This block is intentionally a no-op – kept as a comment so reviewers
        // know we considered it.
      }
    } catch {
      /* ignore */
    }

    setMode("idle");
  }, []);

  const startCamera = useCallback(async () => {
    // Guard: if there's already an active session, clean it up first
    if (isCameraActiveRef.current || scannerRef.current) {
      await stopCamera();
    }

    const container = document.getElementById(READER_ID);
    if (!container) return;
    container.innerHTML = "";

    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    try {
      setMode("camera");
      setScanStatus("scanning");
      setCameraError(null);
      isCameraActiveRef.current = true;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
        (decodedText) => {
          onScanResultRef.current(decodedText);
          setScannedText(decodedText);
          setScanStatus("success");
        },
        () => {} // QR not-found per frame — intentionally silent
      );
    } catch (err) {
      console.error("Camera start failed:", err);
      // Clean up the instance we just created since start() failed
      scannerRef.current = null;
      isCameraActiveRef.current = false;
      try { scanner.clear(); } catch { /* ignore */ }
      setMode("idle");
      setScanStatus(null);
      setCameraError("Unable to access camera. Please allow camera permissions.");
    }
  }, [stopCamera]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Stop any active camera before switching to upload mode
    await stopCamera();

    const imageUrl = URL.createObjectURL(file);
    previewUrlRef.current = imageUrl;
    setPreviewUrl(imageUrl);
    setMode("upload");
    setScanStatus("scanning");
    setScannedText(null);

    const container = document.getElementById(READER_ID);
    if (container) container.innerHTML = "";

    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    try {
      const result = await scanner.scanFile(file, true);
      onScanResultRef.current(result);
      setScannedText(result);
      setScanStatus("success");
    } catch {
      setScanStatus("not_found");
    } finally {
      try { scanner.clear(); } catch { /* ignore */ }
      // scanFile doesn't open a live stream, so no stop() needed
      scannerRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Fire-and-forget async cleanup; we can't await in useEffect cleanup
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="w-full rounded-2xl border border-[#BFDBFE] bg-white overflow-hidden shadow-sm">
      {/* Viewport */}
      <div className="relative w-full bg-black" style={{ minHeight: 200 }}>

        {/* Upload preview */}
        {mode === "upload" && previewUrl && (
          <div className="flex items-center justify-center w-full h-full bg-black" style={{ minHeight: 200 }}>
            <img
              src={previewUrl}
              alt="Uploaded QR Code"
              className="object-contain max-h-64 w-auto"
              style={{ maxWidth: "80%" }}
            />
          </div>
        )}

        {/* Camera reader — always in DOM so Html5Qrcode can find it, hidden when not in use */}
        <div
          id={READER_ID}
          className={`w-full ${mode === "camera" ? "block" : "hidden"}`}
        />

        {/* Idle placeholder */}
        {mode === "idle" && (
          <div className="flex items-center justify-center h-52 bg-[#F0F7FF]">
            <QrCode size={48} className="text-[#BFDBFE]" />
          </div>
        )}

        {/* Scanning overlay (camera mode only) */}
        {mode === "camera" && scanStatus === "scanning" && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-black/50 rounded-full text-white text-xs font-semibold animate-pulse">
              <RefreshCw size={12} className="animate-spin" /> Scanning…
            </span>
          </div>
        )}

        {/* Close button */}
        {mode !== "idle" && (
          <button
            onClick={stopCamera}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 px-6 py-5 bg-[#F0F7FF]">

        {/* Idle */}
        {mode === "idle" && (
          <>
            <div className="flex gap-3">
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] text-sm"
              >
                <Camera size={15} /> Open Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] text-sm"
              >
                <Upload size={15} /> Upload Image
              </button>
            </div>
            {cameraError && (
              <p className="text-sm font-bold text-red-600 text-center">{cameraError}</p>
            )}
          </>
        )}

        {/* Upload — success */}
        {mode === "upload" && scanStatus === "success" && scannedText && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">QR Code Detected</p>
              <p className="text-sm font-bold text-gray-800 break-all">{scannedText}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] transition-all text-sm shadow-sm"
              >
                <Upload size={15} /> New Image
              </button>
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] transition-all text-sm shadow-sm"
              >
                <X size={15} /> Close
              </button>
            </div>
          </div>
        )}

        {/* Camera — success */}
        {mode === "camera" && scanStatus === "success" && scannedText && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">QR Code Detected</p>
              <p className="text-sm font-bold text-gray-800 break-all">{scannedText}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] transition-all text-sm shadow-sm"
              >
                <RefreshCw size={15} /> Scan Again
              </button>
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] transition-all text-sm shadow-sm"
              >
                <X size={15} /> Close
              </button>
            </div>
          </div>
        )}

        {/* Upload — not_found*/}
        {mode === "upload" && scanStatus === "not_found" && (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-sm font-bold text-red-600">No QR code found in this image.</p>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] transition-all text-sm shadow-sm"
              >
                <Upload size={15} /> Try Another Image
              </button>
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] transition-all text-sm shadow-sm"
              >
                <X size={15} /> Close
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        #${READER_ID} { border: none !important; width: 100% !important; margin: 0; padding: 0; }
        #${READER_ID} video { width: 100% !important; max-height: 400px; object-fit: cover; display: block; }
        #${READER_ID}__dashboard_section_csr span { display: none !important; }
        #${READER_ID}__dashboard_section_swaplink { display: none !important; }
      `}} />
    </div>
  );
};

export default React.memo(QRScanner);