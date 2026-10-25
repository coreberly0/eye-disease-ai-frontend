"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import Link from "next/link";
import "./Extra.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const MAX_FILE_MB = 15;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
const REQUEST_TIMEOUT_MS = 90_000;
const VISIBLE_ROWS = 3;

type Details = {
  label: string;
  description: string;
  symptoms: string[];
  recommendation: string;
  severity: "none" | "moderate" | "high";
};

type PredictResult = {
  predictions: Record<string, number>;
  top_class: string;
  top_confidence: number;
  detected: string[];
  low_confidence: boolean;
  details: Details | null;
  gradcam_image: string;
};

const DISPLAY_NAMES: Record<string, string> = {
  Normal: "Normal",
  Diabetes: "Diabetic retinopathy",
  Glaucoma: "Glaucoma",
  Cataract: "Cataract",
  AMD: "Age-related macular degeneration",
  Hypertension: "Hypertensive retinopathy",
  Myopia: "Pathological myopia",
  Other: "Other abnormality",
};

const SEVERITY_TEXT: Record<Details["severity"], string> = {
  none: "No finding",
  moderate: "Moderate priority",
  high: "High priority",
};

const LOADING_STEPS = [
  "Preparing the image…",
  "Reading it with two models…",
  "Drawing the heatmap…",
];

const formatLabel = (label: string) => DISPLAY_NAMES[label] ?? label;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<"side" | "blend">("side");
  const [heat, setHeat] = useState(100);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  // Release the preview URL when it is replaced or the page closes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Cycle the progress text while scanning
  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [loading]);

  // Bring the result into view once it arrives
  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const validate = (selected: File): string | null => {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      return "Unsupported file type. Upload a JPEG, PNG, WebP, or TIFF fundus image.";
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_FILE_MB} MB. Compress or crop the image and try again.`;
    }
    return null;
  };

  const handleFile = useCallback((selected?: File | null) => {
    if (!selected) return;
    const validationError = validate(selected);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setShowAll(false);
    setHeat(100);
  }, []);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowAll(false);
    if (inputRef.current) inputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Analysis failed. Try again in a moment.");
      }
      setResult((await res.json()) as PredictResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The scan took too long. Try again, or use a smaller image.");
      } else if (err instanceof TypeError) {
        setError("Cannot reach the server. Check that the backend is running.");
      } else {
        setError(err instanceof Error ? err.message : "Analysis failed.");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const sorted = result ? Object.entries(result.predictions).sort((a, b) => b[1] - a[1]) : [];
  const rows = showAll ? sorted : sorted.slice(0, VISIBLE_ROWS);
  const topProb = result?.top_confidence ?? sorted[0]?.[1] ?? 0;
  const details = result?.details ?? null;
  const topName = details?.label ?? (result ? formatLabel(result.top_class) : "");
  const flagged = (result?.detected ?? []).filter((d) => d !== result?.top_class);
  const isClear = result?.top_class === "Normal" && !result.low_confidence && flagged.length === 0;

  const copySummary = async () => {
    if (!result) return;
    const lines = [
      `Ocular Scan result for ${file?.name ?? "image"}`,
      `Top read: ${topName} (${(topProb * 100).toFixed(1)}%)`,
      flagged.length ? `Also flagged: ${flagged.map(formatLabel).join(", ")}` : "",
      result.low_confidence ? "Note: low confidence, needs specialist review." : "",
      details ? `Next step: ${details.recommendation}` : "",
      "Research demo, not a diagnosis. Confirm with an ophthalmologist.",
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <>
      <header className="header no-print">
        <div className="container header-row">
          <div className="brand">
            <span className="brand-ring" aria-hidden="true">
              <span className="brand-ring-dot" />
            </span>
            <span className="brand-name">Ocular Scan</span>
          </div>
          <nav className="header-meta">
            <span className="dot-status" aria-hidden="true" />
            <Link href="/model" className="header-link">
              About the model
            </Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero no-print">
          <div className="hero-copy">
            <div className="eyebrow">Fundus image analysis</div>
            <h1>
              Read a retina
              <br />
              in one upload.
            </h1>
            <p>
              Upload a fundus photograph and the model screens for eight conditions, including
              diabetic retinopathy, glaucoma, cataract, AMD, hypertension, and myopia, then marks
              the region of the retina that drove its read.
            </p>

            <div className="panel upload-panel">
              <div
                className={`dropzone ${dragActive ? "drag" : ""} ${file ? "filled" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Upload a fundus image"
                onClick={() => inputRef.current?.click()}
                onKeyDown={handleKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <svg className="dropzone-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <circle cx="14" cy="14" r="12.5" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="14" cy="14" r="4.2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M14 1.5V4M14 24v2.5M26.5 14H24M4 14H1.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <div className="dropzone-label">
                  {file ? file.name : "Drop a fundus image, or click to browse"}
                </div>
                <div className="dropzone-hint">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ready to scan`
                    : `JPEG, PNG, WebP, or TIFF · up to ${MAX_FILE_MB} MB`}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="file-input"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
                />
              </div>

              <p className="upload-tip">
                Best results: a sharp, well-lit retina photo taken by a fundus camera. Phone photos
                of the outside of the eye will not work.
              </p>

              <div className="btn-row">
                <button className="btn btn-primary" onClick={handleSubmit} disabled={!file || loading}>
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Scanning
                    </>
                  ) : error && file ? (
                    "Try again"
                  ) : (
                    "Run analysis"
                  )}
                </button>
                {file && !loading && (
                  <button className="btn btn-ghost" onClick={handleReset}>
                    Clear
                  </button>
                )}
              </div>

              <div aria-live="polite" className="status-line">
                {loading && <span>{LOADING_STEPS[step]}</span>}
                {error && (
                  <span className="error-text" role="alert">
                    {error}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`scan-stage ${loading ? "active" : ""}`}>
            <svg className="scan-ticks" viewBox="0 0 300 300" aria-hidden="true">
              <circle cx="150" cy="150" r="142" className="tick-ring" />
              {Array.from({ length: 48 }).map((_, i) => {
                const angle = (i / 48) * 2 * Math.PI;
                const long = i % 4 === 0;
                const r1 = 142;
                const r2 = long ? 130 : 136;
                return (
                  <line
                    key={i}
                    x1={(150 + r1 * Math.cos(angle)).toFixed(2)}
                    y1={(150 + r1 * Math.sin(angle)).toFixed(2)}
                    x2={(150 + r2 * Math.cos(angle)).toFixed(2)}
                    y2={(150 + r2 * Math.sin(angle)).toFixed(2)}
                    className={long ? "tick tick-long" : "tick"}
                  />
                );
              })}
            </svg>
            <div className="scan-sweep" aria-hidden="true" />
            <div className="scan-core">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Uploaded fundus preview" />
              ) : (
                <div className="scan-core-placeholder">
                  <span>No image loaded</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {result && (
          <section className="results" ref={resultsRef}>
            <div className="results-header">
              <div className="section-title">Result</div>
              <div className={`confidence-flag ${result.low_confidence ? "low" : "high"}`}>
                {result.low_confidence ? "Low confidence" : "Clear top read"}
              </div>
            </div>

            {result.low_confidence && (
              <p className="finding-note warn">
                The model is not sure about this image. Try a sharper, better-lit fundus photo, and
                have an ophthalmologist review it either way.
              </p>
            )}

            <div className="finding-banner">
              <div className="finding-main">
                <span className="finding-kicker">Top read</span>
                <span className="finding-label">{topName}</span>
              </div>
              <div className="finding-score">
                <span className="finding-score-num">{(topProb * 100).toFixed(1)}</span>
                <span className="finding-score-unit">%</span>
              </div>
            </div>

            {isClear && (
              <p className="finding-note ok">
                None of the screened conditions was flagged. Keep up routine eye exams.
              </p>
            )}

            {flagged.length > 0 && (
              <div className="chip-row">
                <span className="chip-label">Also flagged</span>
                {flagged.map((f) => (
                  <span className="chip" key={f}>
                    {formatLabel(f)}
                  </span>
                ))}
              </div>
            )}

            <div className="results-grid">
              <div className="image-panel">
                <div className="view-toggle" role="tablist" aria-label="Image view">
                  <button role="tab" aria-selected={view === "side"} className={view === "side" ? "on" : ""} onClick={() => setView("side")}>
                    Side by side
                  </button>
                  <button role="tab" aria-selected={view === "blend"} className={view === "blend" ? "on" : ""} onClick={() => setView("blend")}>
                    Heatmap blend
                  </button>
                </div>

                {view === "side" ? (
                  <div className="image-compare">
                    <div className="image-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview ?? ""} alt="Original fundus image" />
                      <div className="image-card-label">Original</div>
                    </div>
                    <div className="image-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={result.gradcam_image} alt={`Heatmap for ${topName}`} />
                      <div className="image-card-label">Heatmap · {formatLabel(result.top_class)}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="blend">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview ?? ""} alt="Original fundus image" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={result.gradcam_image} alt={`Heatmap for ${topName}`} style={{ opacity: heat / 100 }} />
                    </div>
                    <label className="heat-control">
                      <span>Heatmap strength</span>
                      <input type="range" min={0} max={100} value={heat} onChange={(e) => setHeat(Number(e.target.value))} />
                    </label>
                  </div>
                )}
                <p className="image-help">
                  Warm colors mark the areas that influenced the top read the most. They show where
                  the model looked, not a confirmed lesion.
                </p>
              </div>

              <div className="disease-list">
                <div className="disease-list-head">
                  <span>Condition</span>
                  <span>Confidence</span>
                </div>
                {rows.map(([label, prob]) => {
                  const isTop = label === result.top_class;
                  return (
                    <div className={`disease-row ${isTop ? "top" : ""}`} key={label}>
                      <div className="disease-name">{formatLabel(label)}</div>
                      <div className="bar-track">
                        <div className={`bar-fill ${isTop ? "top" : ""}`} style={{ width: `${Math.round(prob * 100)}%` }} />
                      </div>
                      <div className="disease-value">{(prob * 100).toFixed(1)}%</div>
                    </div>
                  );
                })}
                {sorted.length > VISIBLE_ROWS && (
                  <button className="link-btn" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show fewer" : `Show all ${sorted.length} conditions`}
                  </button>
                )}
                <p className="image-help">
                  Scores are independent, so they do not add up to 100%. Several conditions can be
                  present in one eye.
                </p>
              </div>
            </div>

            {details && (
              <div className="detail-card">
                <div className="detail-head">
                  <h3>About {details.label}</h3>
                  <span className={`severity severity-${details.severity}`}>{SEVERITY_TEXT[details.severity]}</span>
                </div>
                <p>{details.description}</p>
                {details.symptoms.length > 0 && (
                  <>
                    <h4>Common symptoms</h4>
                    <ul>
                      {details.symptoms.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}
                <h4>Recommended next step</h4>
                <p>{details.recommendation}</p>
              </div>
            )}

            <div className="action-row no-print">
              <button className="btn btn-primary" onClick={() => window.print()}>
                Save as PDF / print
              </button>
              <button className="btn btn-ghost" onClick={copySummary}>
                {copied ? "Copied" : "Copy summary"}
              </button>
              <button className="btn btn-ghost" onClick={handleReset}>
                Scan another image
              </button>
              <Link href="/model" className="detail-link">
                How accurate is this model?
              </Link>
            </div>

            <div className="disclaimer">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 7v4.2M8 4.6v.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              This tool is a research demo, not a diagnostic device. Findings are model estimates and
              should be confirmed by an ophthalmologist before any clinical decision is made.
            </div>
          </section>
        )}
      </main>
    </>
  );
}