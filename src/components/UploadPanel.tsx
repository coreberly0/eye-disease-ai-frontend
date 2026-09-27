"use client";

import { useCallback, useState } from "react";

type UploadPanelProps = {
  onAnalyze: (file: File) => void;
  loading: boolean;
};

export default function UploadPanel({ onAnalyze, loading }: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  return (
    <section className="border border-line bg-panel p-6 pb-7 min-h-[420px]">
      <h2 className="font-serif text-[1.15rem] font-medium mb-1.5 flex items-baseline gap-2.5">
        <span className="font-mono text-[0.7rem] text-teal border border-teal px-1.5 py-0.5">
          01
        </span>
        Specimen Image
      </h2>
      <p className="text-muted text-[0.86rem] leading-relaxed mb-5">
        Upload a clear, front-facing photo of the eye — a retinal fundus photo works best for
        retinopathy and glaucoma; a close-up of the lens works best for cataract.
      </p>

      <label
        className={`flex items-center justify-center h-60 border-[1.5px] border-dashed cursor-pointer relative overflow-hidden mb-5 transition-colors ${
          dragOver ? "border-teal bg-[#FBFAF6]" : "border-line hover:border-teal hover:bg-[#FBFAF6]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Selected eye" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M20 12v16M13 19l7-7 7 7"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm text-ink">Drop image, or click to browse</span>
            <span className="font-mono text-[0.68rem] tracking-wide">JPG / PNG</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFile(e.target.files[0]);
          }}
        />
      </label>

      <button
        disabled={!file || loading}
        onClick={() => file && onAnalyze(file)}
        className="w-full py-3.5 bg-ink text-white font-semibold text-[0.92rem] tracking-tight disabled:bg-line disabled:text-muted disabled:cursor-not-allowed hover:enabled:bg-teal transition-colors"
      >
        {loading ? "Analyzing…" : "Analyze Image"}
      </button>

      <p className="font-mono text-[0.68rem] text-muted mt-3.5 leading-relaxed">
        Educational screening tool only — not a medical diagnosis. Always consult an
        ophthalmologist.
      </p>
    </section>
  );
}
