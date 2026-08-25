"use client";

import { Eraser, PenLine, Type, Upload } from "lucide-react";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { SignatureMethod } from "@dlv/shared-types";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface SignatureCapture {
  method: SignatureMethod;
  /** Base64 image bytes (data-URL prefix stripped) for DRAW/UPLOAD, or the typed name for TYPE. */
  signatureImage: string;
}

const METHODS: Array<{ method: SignatureMethod; label: string; icon: typeof PenLine }> = [
  { method: SignatureMethod.DRAW, label: "Draw", icon: PenLine },
  { method: SignatureMethod.TYPE, label: "Type", icon: Type },
  { method: SignatureMethod.UPLOAD, label: "Upload", icon: Upload },
];

function stripDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Capture a signature by drawing, typing, or uploading an image. */
export function SignaturePad({ onChange }: { onChange: (capture: SignatureCapture | null) => void }) {
  const [method, setMethod] = useState<SignatureMethod>(SignatureMethod.DRAW);
  const [typed, setTyped] = useState("");
  const [uploadName, setUploadName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const switchMethod = useCallback(
    (next: SignatureMethod) => {
      setMethod(next);
      onChange(null);
      dirty.current = false;
      setTyped("");
      setUploadName(null);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    [onChange],
  );

  const point = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = () => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && dirty.current) {
      onChange({ method: SignatureMethod.DRAW, signatureImage: stripDataUrl(canvas.toDataURL("image/png")) });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange(null);
  };

  const onType = (value: string) => {
    setTyped(value);
    onChange(value.trim() ? { method: SignatureMethod.TYPE, signatureImage: value.trim() } : null);
  };

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      onChange(result ? { method: SignatureMethod.UPLOAD, signatureImage: stripDataUrl(result) } : null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Signature method" className="flex gap-2">
        {METHODS.map(({ method: m, label, icon: Icon }) => (
          <button
            key={m}
            role="tab"
            aria-selected={method === m}
            onClick={() => switchMethod(m)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm font-medium transition-colors",
              method === m
                ? "border-accent bg-accent-subtle text-accent-text"
                : "border-border bg-surface text-fg-secondary hover:bg-subtle",
            )}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {method === SignatureMethod.DRAW ? (
        <div className="flex flex-col gap-2">
          <canvas
            ref={canvasRef}
            width={560}
            height={180}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-[180px] w-full touch-none rounded-md border border-border-strong bg-white"
            aria-label="Draw your signature"
          />
          <Button variant="ghost" size="sm" icon={<Eraser size={16} />} onClick={clearCanvas} className="self-start">
            Clear
          </Button>
        </div>
      ) : null}

      {method === SignatureMethod.TYPE ? (
        <div className="flex flex-col gap-2">
          <input
            value={typed}
            onChange={(e) => onType(e.target.value)}
            placeholder="Type your full name"
            aria-label="Type your signature"
            className="h-12 rounded-md border border-border-strong bg-surface px-3 text-fg"
          />
          {typed ? (
            <div className="rounded-md border border-border bg-white px-4 py-6 text-center text-2xl text-gray-900" style={{ fontFamily: "'Segoe Script', 'Brush Script MT', cursive" }}>
              {typed}
            </div>
          ) : null}
        </div>
      ) : null}

      {method === SignatureMethod.UPLOAD ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-subtle px-4 py-8 text-center">
          <Upload size={20} aria-hidden="true" className="text-fg-muted" />
          <span className="text-body-sm text-fg-secondary">
            {uploadName ?? "Upload an image of your signature (PNG or JPG)"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
      ) : null}
    </div>
  );
}
