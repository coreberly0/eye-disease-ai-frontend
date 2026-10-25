"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./model.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ClassMetrics = {
  class: string;
  threshold: number;
  support: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number | null;
};

type HistoryPoint = {
  epoch: number;
  train_loss: number;
  val_loss: number;
  train_auc: number | null;
  val_auc: number | null;
};

type ModelInfo = {
  available: true;
  generated_on: string;
  model: {
    name: string;
    branches: string[];
    fusion: string;
    input_size: number;
    task: string;
    loss: string;
    optimizer: string;
    explainability: string;
  };
  dataset: {
    name: string;
    train_images: number;
    val_images: number;
    split: string;
    train_positives: Record<string, number>;
    val_positives: Record<string, number>;
  };
  overall: {
    macro_auc: number | null;
    macro_f1: number;
    micro_f1: number;
    mean_label_accuracy: number;
    exact_match_accuracy: number;
  };
  per_class: ClassMetrics[];
  history: HistoryPoint[];
  notes: string;
};

type Unavailable = { available: false; message: string };

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

const name = (c: string) => DISPLAY_NAMES[c] ?? c;
const pct = (v: number | null | undefined, d = 1) => (v == null ? "n/a" : `${(v * 100).toFixed(d)}%`);
const num = (v: number) => v.toLocaleString("en-US");

function Curve({
  data,
  a,
  b,
  label,
}: {
  data: HistoryPoint[];
  a: "train_loss" | "train_auc";
  b: "val_loss" | "val_auc";
  label: string;
}) {
  const W = 420;
  const H = 190;
  const PAD = { l: 40, r: 12, t: 12, b: 28 };
  const vals = data.flatMap((d) => [d[a], d[b]]).filter((v): v is number => v != null);
  if (vals.length < 2) return null;

  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (epoch: number) =>
    PAD.l + ((epoch - data[0].epoch) / Math.max(data[data.length - 1].epoch - data[0].epoch, 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);
  const line = (key: typeof a | typeof b) =>
    data
      .filter((d) => d[key] != null)
      .map((d) => `${x(d.epoch).toFixed(1)},${y(d[key] as number).toFixed(1)}`)
      .join(" ");

  return (
    <figure className="m-curve">
      <figcaption>{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: training and validation`}>
        {[0, 0.5, 1].map((t) => {
          const yy = PAD.t + t * (H - PAD.t - PAD.b);
          return <line key={t} x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} className="m-grid" />;
        })}
        <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" className="m-axis">{hi.toFixed(2)}</text>
        <text x={PAD.l - 6} y={H - PAD.b + 4} textAnchor="end" className="m-axis">{lo.toFixed(2)}</text>
        <text x={PAD.l} y={H - 8} className="m-axis">epoch {data[0].epoch}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className="m-axis">{data[data.length - 1].epoch}</text>
        <polyline points={line(a)} className="m-line m-line-train" />
        <polyline points={line(b)} className="m-line m-line-val" />
      </svg>
      <div className="m-legend">
        <span><i className="m-swatch m-line-train" /> Training</span>
        <span><i className="m-swatch m-line-val" /> Validation</span>
      </div>
    </figure>
  );
}

export default function ModelPage() {
  const [info, setInfo] = useState<ModelInfo | Unavailable | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/model-info`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not load model details.");
        return body as ModelInfo | Unavailable;
      })
      .then((data) => !cancelled && setInfo(data))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof TypeError ? "Cannot reach the server. Check that the backend is running." : err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = info && info.available ? info : null;

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
          <nav className="header-meta">
            <Link href="/" className="header-link">
              Back to scanner
            </Link>
          </nav>
        </div>
      </header>

      <main className="container m-page">
        <div className="eyebrow">Model details</div>
        <h1 className="m-title">How well does it work?</h1>
        <p className="m-lede">
          These numbers come from images the model did not train on. Read them as an estimate of
          how it behaves on similar photos, not a guarantee for any single patient.
        </p>

        {error && <p className="error-text" role="alert">{error}</p>}
        {!info && !error && <p className="m-muted">Loading model details…</p>}
        {info && !info.available && (
          <div className="m-card">
            <h2>Results are not available yet</h2>
            <p className="m-muted">{info.message}</p>
          </div>
        )}

        {ready && (
          <>
            <section className="m-stats" aria-label="Overall results">
              <div className="m-stat">
                <div className="m-stat-num">{pct(ready.overall.macro_auc)}</div>
                <div className="m-stat-label">Average AUC</div>
                <p>How well the model ranks sick eyes above healthy ones, averaged over all conditions. 100% is perfect, 50% is a coin flip.</p>
              </div>
              <div className="m-stat">
                <div className="m-stat-num">{pct(ready.overall.macro_f1)}</div>
                <div className="m-stat-label">Average F1</div>
                <p>Balances catching real cases against false alarms, averaged over all conditions.</p>
              </div>
              <div className="m-stat">
                <div className="m-stat-num">{pct(ready.overall.mean_label_accuracy)}</div>
                <div className="m-stat-label">Per-condition accuracy</div>
                <p>How often a single yes/no answer was right. This looks high because most eyes do not have most conditions.</p>
              </div>
              <div className="m-stat">
                <div className="m-stat-num">{pct(ready.overall.exact_match_accuracy)}</div>
                <div className="m-stat-label">All 8 answers right</div>
                <p>The strictest score: every one of the 8 conditions correct for the same image.</p>
              </div>
            </section>

            <section className="m-card">
              <h2>Results by condition</h2>
              <div className="m-table-wrap">
                <table className="m-table">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Test images</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1</th>
                      <th>AUC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ready.per_class.map((c) => (
                      <tr key={c.class}>
                        <td>{name(c.class)}</td>
                        <td className="m-mono">{num(c.support)}</td>
                        <td className="m-mono">{pct(c.precision)}</td>
                        <td className="m-mono">{pct(c.recall)}</td>
                        <td>
                          <div className="m-bar-cell">
                            <div className="bar-track">
                              <div className="bar-fill top" style={{ width: `${Math.round(c.f1 * 100)}%` }} />
                            </div>
                            <span className="m-mono">{pct(c.f1)}</span>
                          </div>
                        </td>
                        <td className="m-mono">{pct(c.auc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="m-muted m-small">
                <strong>Precision:</strong> when the model flags a condition, how often it is real.{" "}
                <strong>Recall:</strong> how many real cases it catches. Conditions with few test
                images score less reliably.
              </p>
            </section>

            {ready.history.length > 1 && (
              <section className="m-card">
                <h2>Training curves</h2>
                <div className="m-curves">
                  <Curve data={ready.history} a="train_loss" b="val_loss" label="Loss (lower is better)" />
                  <Curve data={ready.history} a="train_auc" b="val_auc" label="AUC (higher is better)" />
                </div>
              </section>
            )}

            <section className="m-card">
              <h2>How it works</h2>
              <div className="m-two">
                <div>
                  <ul className="m-list">
                    {ready.model.branches.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <p className="m-muted">{ready.model.fusion}.</p>
                </div>
                <dl className="m-facts">
                  <div><dt>Input size</dt><dd>{ready.model.input_size}×{ready.model.input_size} px</dd></div>
                  <div><dt>Task</dt><dd>{ready.model.task}</dd></div>
                  <div><dt>Loss</dt><dd>{ready.model.loss}</dd></div>
                  <div><dt>Optimizer</dt><dd>{ready.model.optimizer}</dd></div>
                  <div><dt>Explanation</dt><dd>{ready.model.explainability}</dd></div>
                </dl>
              </div>
            </section>

            <section className="m-card">
              <h2>Data it learned from</h2>
              <p className="m-muted">
                {ready.dataset.name}: {num(ready.dataset.train_images)} training images and{" "}
                {num(ready.dataset.val_images)} test images. {ready.dataset.split}.
              </p>
              <div className="m-table-wrap">
                <table className="m-table">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Training images</th>
                      <th>Test images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(ready.dataset.train_positives).map((k) => (
                      <tr key={k}>
                        <td>{name(k)}</td>
                        <td className="m-mono">{num(ready.dataset.train_positives[k])}</td>
                        <td className="m-mono">{num(ready.dataset.val_positives[k] ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="m-muted m-small">An image can have more than one condition, so rows do not add up to the total.</p>
            </section>

            <section className="m-card">
              <h2>What to keep in mind</h2>
              <ul className="m-list">
                <li>This is a research demo and not a diagnostic device. An ophthalmologist must confirm any finding.</li>
                <li>It was trained on fundus photographs only. Phone photos of the outside of the eye give unreliable results.</li>
                <li>In this dataset both eyes of a patient share one set of labels, so per-eye labels are approximate.</li>
                <li>Rare conditions have few examples, so their scores are less stable.</li>
                <li>It has not been tested in a clinic or on other populations.</li>
                {ready.notes && <li>{ready.notes}</li>}
              </ul>
              <p className="m-muted m-small">Results generated on {ready.generated_on}.</p>
            </section>
          </>
        )}
      </main>
    </>
  );
}