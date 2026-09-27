"use client";

import { useEffect, useState } from "react";
import type { PredictResponse } from "@/lib/api";

type ResultPanelProps = {
  status: "idle" | "loading" | "error" | "result";
  result: PredictResponse | null;
  errorMessage: string | null;
};

const LOADING_MESSAGES = [
  "Scanning tissue patterns…",
  "Comparing against reference features…",
  "Weighing model confidence…",
];

const SEVERITY_STYLES: Record<string, string> = {
  none: "text-teal border-teal",
  moderate: "text-amber border-amber",
  high: "text-high border-high",
};

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center gap-3.5">
      <svg viewBox="0 0 200 100" width="180" height="90">
        <path
          d="M10 50 Q100 5 190 50 Q100 95 10 50 Z"
          stroke="#D8D3C8"
          strokeWidth="1.2"
          fill="none"
        />
        <circle cx="100" cy="50" r="22" stroke="#D8D3C8" strokeWidth="1.2" fill="none" />
        <circle cx="100" cy="50" r="9" fill="#D8D3C8" opacity="0.35" />
      </svg>
      <p className="text-muted text-[0.86rem] max-w-[260px]">
        Findings will appear here once an image is analyzed.
      </p>
    </div>
  );
}

function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center gap-3.5">
      <div className="w-[180px] h-[90px] border border-line relative overflow-hidden bg-gradient-to-b from-white to-[#F3F1EA]">
        <div className="absolute left-0 right-0 h-0.5 bg-teal shadow-[0_0_8px_theme(colors.teal.light)] animate-scan" />
      </div>
      <p className="text-muted text-[0.86rem] max-w-[260px]">{LOADING_MESSAGES[msgIndex]}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[300px] text-center">
      <p className="text-high text-[0.9rem]">{message}</p>
    </div>
  );
}

function ResultState({ result }: { result: PredictResponse }) {
  const details = result.details;
  const severity = details?.severity || "moderate";
  const severityClass = SEVERITY_STYLES[severity] || SEVERITY_STYLES.moderate;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line pb-3.5 mb-3.5">
        <span className="font-serif text-[1.4rem] font-semibold">
          {details?.label || result.prediction}
        </span>
        <span
          className={`font-mono text-[0.66rem] uppercase tracking-wide px-2.5 py-1 border ${severityClass}`}
        >
          {severity === "none" ? "No finding" : `${severity} priority`}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-mono text-[1.6rem]">{Math.round(result.confidence * 100)}%</span>
        <span className="font-mono text-[0.68rem] text-muted uppercase tracking-wide">
          model confidence
        </span>
      </div>

      <p className="text-[0.9rem] leading-relaxed mb-5">{details?.description}</p>

      <div className="mb-5">
        {result.allPredictions.map((p) => {
          const pct = Math.round(p.confidence * 100);
          return (
            <div
              key={p.class}
              className="grid grid-cols-[120px_1fr_46px] items-center gap-2.5 mb-2 font-mono text-[0.72rem]"
            >
              <span>{p.class.replace(/_/g, " ")}</span>
              <span className="h-1.5 bg-[#EFEBE1] relative">
                <span
                  className="h-full bg-teal-light block transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-right text-muted">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="mb-5">
        <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted mb-2">
          Common symptoms
        </h3>
        {details?.commonSymptoms && details.commonSymptoms.length > 0 ? (
          <ul className="list-disc pl-5 text-[0.86rem] leading-relaxed">
            {details.commonSymptoms.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.86rem] leading-relaxed">
            No symptoms associated with a normal result.
          </p>
        )}
      </div>

      <div>
        <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted mb-2">
          Recommended next step
        </h3>
        <p className="text-[0.86rem] leading-relaxed">{details?.recommendation}</p>
      </div>
    </div>
  );
}

export default function ResultPanel({ status, result, errorMessage }: ResultPanelProps) {
  return (
    <section className="border border-line bg-panel p-6 pb-7 min-h-[420px]">
      <h2 className="font-serif text-[1.15rem] font-medium mb-1.5 flex items-baseline gap-2.5">
        <span className="font-mono text-[0.7rem] text-teal border border-teal px-1.5 py-0.5">
          02
        </span>
        Findings
      </h2>

      {status === "idle" && <IdleState />}
      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState message={errorMessage || "Something went wrong."} />}
      {status === "result" && result && <ResultState result={result} />}
    </section>
  );
}
