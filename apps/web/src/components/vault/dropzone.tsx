"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Drag-and-drop / click uploader. Calls onFile for each selected file. */
export function Dropzone({
  onFile,
  busy = false,
}: {
  onFile: (file: File) => void;
  busy?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center",
        "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
        dragging ? "border-accent bg-accent-subtle" : "border-border-strong hover:bg-subtle",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy ? (
        <Spinner size={28} label="Uploading" />
      ) : (
        <UploadCloud size={32} strokeWidth={1.5} className="text-fg-muted" aria-hidden="true" />
      )}
      <div>
        <p className="text-body font-medium text-fg">
          {busy ? "Uploading…" : "Drop files here or click to upload"}
        </p>
        <p className="text-body-sm text-fg-secondary">
          Encrypted end-to-end. Max 500&nbsp;MB per file.
        </p>
      </div>
    </div>
  );
}
