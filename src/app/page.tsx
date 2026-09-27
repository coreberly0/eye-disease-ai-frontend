"use client";
import { useState, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const MAX_FILE_MB = 15;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];

const RISK_COPY = {
  Normal: "No condition scored above the others.",
};

function formatLabel(label) {
  return label === "Other" ? "Unclassified" : label;
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const validate = (selected) => {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      return "Unsupported file type. Upload a JPEG, PNG, WebP, or TIFF fundus image.";
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_FILE_MB} MB. Compress or crop the image and try again.`;
    }
    return null;
  };

  const handleFile = useCallback((selected) => {
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
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Analysis failed. Try again in a moment.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedPredictions = result
    ? Object.entries(result.predictions).sort((a, b) => b[1] - a[1])
    : [];
  const topProb = sortedPredictions[0]?.[1] ?? 0;
  const topLabel = result?.top_class;
  const isLowConfidence = topProb < 0.65;

  return (
    <>
      <header className="header">
        <div className="container header-row">
          <div className="brand">
            <span className="brand-ring" aria-hidden="true">
              <span className="brand-ring-dot" />
            </span>
            <span className="brand-name">Ocular Scan</span>
          </div>
          <div className="header-meta">
            <span className="dot-status" aria-hidden="true" />
            Research build · v0.9
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Fundus image analysis</div>
            <h1>
              Read a retina
              <br />
              in one upload.
            </h1>
            <p>
              Upload a fundus photograph and the model screens for eight
              conditions — diabetic retinopathy, glaucoma, cataract, AMD,
              hypertension, and myopia among them — then marks exactly which
              region of the retina drove its read.
            </p>

            <div className="panel upload-panel">
              <div
                className={`dropzone ${dragActive ? "drag" : ""} ${file ? "filled" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Upload a fundus image"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <svg
                  className="dropzone-icon"
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden="true"
                >
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
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              <div className="btn-row">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!file || loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Scanning
                    </>
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

              {error && (
                <div className="error-text" role="alert">
                  {error}
                </div>
              )}
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
                const x1 = (150 + r1 * Math.cos(angle)).toFixed(2);
                const y1 = (150 + r1 * Math.sin(angle)).toFixed(2);
                const x2 = (150 + r2 * Math.cos(angle)).toFixed(2);
                const y2 = (150 + r2 * Math.sin(angle)).toFixed(2);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className={long ? "tick tick-long" : "tick"}
                  />
                );
              })}
            </svg>
            <div className="scan-sweep" aria-hidden="true" />
            <div className="scan-core">
              {preview ? (
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
          <section className="results">
            <div className="results-header">
              <div className="section-title">Result</div>
              <div className={`confidence-flag ${isLowConfidence ? "low" : "high"}`}>
                {isLowConfidence ? "Low separation between classes" : "Clear top read"}
              </div>
            </div>

            <div className="finding-banner">
              <div className="finding-main">
                <span className="finding-kicker">Top read</span>
                <span className="finding-label">{formatLabel(topLabel)}</span>
              </div>
              <div className="finding-score">
                <span className="finding-score-num">{(topProb * 100).toFixed(1)}</span>
                <span className="finding-score-unit">%</span>
              </div>
            </div>
            {RISK_COPY[topLabel] && (
              <p className="finding-note">{RISK_COPY[topLabel]}</p>
            )}

            <div className="results-grid">
              <div className="image-compare">
                <div className="image-card">
                  <img src={preview} alt="Original fundus image" />
                  <div className="image-card-label">Original</div>
                </div>
                <div className="image-card">
                  <img src={result.gradcam_image} alt="Grad-CAM attention overlay" />
                  <div className="image-card-label">
                    Grad-CAM · {formatLabel(result.top_class)}
                  </div>
                </div>
              </div>

              <div className="disease-list">
                <div className="disease-list-head">
                  <span>Condition</span>
                  <span>Confidence</span>
                </div>
                {sortedPredictions.map(([label, prob]) => {
                  const isTop = label === result.top_class;
                  return (
                    <div className={`disease-row ${isTop ? "top" : ""}`} key={label}>
                      <div className="disease-name">{formatLabel(label)}</div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isTop ? "top" : ""}`}
                          style={{ width: `${Math.round(prob * 100)}%` }}
                        />
                      </div>
                      <div className="disease-value">{(prob * 100).toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="disclaimer">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 7v4.2M8 4.6v.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              This tool is a research demo, not a diagnostic device. Findings
              are model estimates and should be confirmed by an
              ophthalmologist before any clinical decision is made.
            </div>
          </section>
        )}
      </main>
    </>
  );
}