"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";

export interface DetectedItem {
  name: string;
  count: number;
  confidence: number;
}

interface RoboflowPrediction {
  class: string;
  confidence: number;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
}

interface AIDetectorProps {
  onScanResult: (code: string, skipCooldown?: boolean) => void;
}

// Toast
type ToastType = "success" | "error" | "info";
interface Toast { id: number; type: ToastType; title: string; message: string; }
let toastIdCounter = 0;

const ToastIcon = ({ type }: { type: ToastType }) => {
  const color = type === "success" ? "bg-emerald-400" : type === "error" ? "bg-red-400" : "bg-[#1767AD]";
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${color}`} />;
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 350); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onDismiss]);

  const borderColor = toast.type === "success" ? "border-emerald-200" : toast.type === "error" ? "border-red-200" : "border-blue-200";
  const bgColor = toast.type === "success" ? "bg-emerald-50" : toast.type === "error" ? "bg-red-50" : "bg-blue-50";

  return (
    <div
      style={{ transition: "all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)" }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgColor} ${borderColor} min-w-[240px] max-w-[320px] pointer-events-auto`}
    >
      <ToastIcon type={toast.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 leading-tight">{toast.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{toast.message}</p>
      </div>
      <button onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 350); }} className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) => (
  <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
    {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
  </div>
);

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((type: ToastType, title: string, message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, push, dismiss };
}

// Helpers
function countDetections(predictions: RoboflowPrediction[]): DetectedItem[] {
  const CONF_THRESHOLD = 0.5;
  const groups: Record<string, RoboflowPrediction[]> = {};
  for (const pred of predictions) {
    if (pred.confidence < CONF_THRESHOLD) continue;
    if (!groups[pred.class]) groups[pred.class] = [];
    groups[pred.class].push(pred);
  }
  return Object.entries(groups).map(([name, preds]) => ({
    name,
    count: preds.length,
    confidence: preds.reduce((s, p) => s + p.confidence, 0) / preds.length,
  }));
}

// Component
const AIDetector = ({ onScanResult }: AIDetectorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"idle" | "camera" | "preview">("idle");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "not_found" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const { toasts, push, dismiss } = useToast();

  // Camera
  const startCamera = useCallback(async () => {
    setError(null);
    setScanStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setMode("camera");
    } catch {
      setError("Unable to access camera. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  }, []);

  // Detection
  const runDetection = useCallback(async (base64: string) => {
    setIsLoading(true);
    setError(null);
    setScanStatus("idle");
    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data: RoboflowResponse = await response.json();
      if (!data.predictions) throw new Error("No predictions returned from API");

      const items = countDetections(data.predictions);
      setDetectedItems(items);

      if (items.length === 0) {
        setScanStatus("not_found");
      } else {
        setScanStatus("success");
      }
    } catch (err: any) {
      setError("Detection failed: " + err.message);
      setScanStatus("error");
      push("error", "Detection Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [push]);

  // File upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      setPreviewSrc(result);
      setMode("preview");
      setDetectedItems([]);
      setError(null);
      setScanStatus("idle");
      const base64 = result.split(",")[1];
      if (base64) await runDetection(base64);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [stopCamera, runDetection]);

  // Capture
  const handleCapture = useCallback(async () => {
    const base64 = captureFrame();
    if (!base64) return;
    setPreviewSrc(`data:image/jpeg;base64,${base64}`);
    stopCamera();
    setMode("preview");
    await runDetection(base64);
  }, [captureFrame, stopCamera, runDetection]);

  const handleDetectFromPreview = useCallback(async () => {
    if (!previewSrc) return;
    await runDetection(previewSrc.split(",")[1]);
  }, [previewSrc, runDetection]);

  // Reset 
  const handleReset = useCallback(() => {
    stopCamera();
    setMode("idle");
    setPreviewSrc(null);
    setDetectedItems([]);
    setError(null);
    setScanStatus("idle");
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Item controls
  const handleUpdateCount = (name: string, delta: number) => {
    setDetectedItems((prev) =>
      prev.map((item) => item.name === name ? { ...item, count: item.count + delta } : item)
        .filter((item) => item.count > 0)
    );
  };
  const handleRemoveItem = (name: string) => {
    setDetectedItems((prev) => prev.filter((item) => item.name !== name));
  };
  const handleConfirmAll = () => {
    detectedItems.forEach((item) => {
      for (let i = 0; i < item.count; i++) onScanResult(item.name, true);
    });
    handleReset();
  };

  // Render 
  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="w-full rounded-2xl border border-[#BFDBFE] bg-white overflow-hidden shadow-sm">
        {/* Viewport */}
        <div className="relative w-full bg-black" style={{ minHeight: 200 }}>
          <video
            ref={videoRef}
            className={`w-full object-cover ${mode === "camera" ? "block" : "hidden"}`}
            playsInline muted
          />
          {mode === "preview" && previewSrc && (
            <img src={previewSrc} alt="preview" className="w-full object-contain max-h-64" />
          )}
          {mode === "idle" && (
            <div className="flex items-center justify-center h-52 bg-[#F0F7FF]">
              <Camera size={48} className="text-[#BFDBFE]" />
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="text-white animate-spin" size={40} />
            </div>
          )}
          {mode !== "idle" && (
            <button onClick={handleReset} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors">
              <X size={16} />
            </button>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-3 px-6 py-5 bg-[#F0F7FF]">

          {/* Idle */}
          {mode === "idle" && (
            <>
              <div className="flex gap-3">
                <button onClick={startCamera} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] text-sm">
                  <Camera size={15} /> Open Camera
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] text-sm">
                  <Upload size={15} /> Upload Image
                </button>
              </div>
              {error && mode === "idle" && (
                <p className="text-sm font-bold text-red-600 text-center">{error}</p>
              )}
            </>
          )}

          {/* Camera */}
          {mode === "camera" && (
            <button onClick={handleCapture} disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] transition-all disabled:opacity-60 text-sm">
              <Camera size={15} /> Capture & Detect
            </button>
          )}

          {/* Not_found */}
          {mode === "preview" && !isLoading && scanStatus === "not_found" && (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-sm font-bold text-red-600">No items detected in this image.</p>
              <div className="flex gap-3">
                <button onClick={handleDetectFromPreview} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] transition-all text-sm shadow-sm">
                  <RefreshCw size={15} /> Re-Detect
                </button>
                <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] transition-all text-sm shadow-sm">
                  <Upload size={15} /> New Image
                </button>
              </div>
            </div>
          )}

          {/* Success / error: re-detect buttons */}
          {mode === "preview" && !isLoading && (scanStatus === "success" || scanStatus === "error") && (
            <div className="flex gap-3">
              <button onClick={handleDetectFromPreview} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#1767AD] hover:bg-[#0F4C81] transition-all text-sm shadow-sm">
                <RefreshCw size={15} /> Re-Detect
              </button>
              <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#1767AD] bg-white border border-[#BFDBFE] hover:bg-[#EBF4FF] transition-all text-sm shadow-sm">
                <X size={15} /> New Image
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Detection Results */}
        {detectedItems.length > 0 && (
          <div className="px-4 pt-3 pb-5">
            {/* Header */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold text-[#1767AD] uppercase tracking-widest">
                Detected Items
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {detectedItems.reduce((acc, item) => acc + item.count, 0)} pcs
              </span>
            </div>

            {/* Item rows */}
            <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {detectedItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between px-3.5 py-3 bg-white hover:bg-gray-50 transition-colors">
                  {/* Left: name + confidence */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(item.confidence * 100).toFixed(0)}% confidence</p>
                  </div>

                  {/* Right: stepper + delete */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    {/* Stepper — bordered box style */}
                    <div className="flex items-center border border-[#BFDBFE] rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleUpdateCount(item.name, -1)}
                        className="w-8 h-8 flex items-center justify-center text-[#1767AD] hover:bg-[#EBF4FF] transition-colors text-base font-light"
                      >
                        −
                      </button>
                      <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-[#0F4C81] border-x border-[#BFDBFE] tabular-nums">
                        {item.count}
                      </span>
                      <button
                        onClick={() => handleUpdateCount(item.name, 1)}
                        className="w-8 h-8 flex items-center justify-center text-[#1767AD] hover:bg-[#EBF4FF] transition-colors text-base font-light"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveItem(item.name)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmAll}
              className="mt-3 w-full flex items-center justify-center py-3 rounded-xl font-semibold text-white text-sm bg-green-500 hover:bg-green-600 transition-colors"
            >
              Confirm Items to Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(AIDetector);