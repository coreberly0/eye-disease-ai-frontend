"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[420px] mx-auto px-6 pt-16">
      <h1 className="font-serif font-semibold text-[1.8rem] mb-1">Log in</h1>
      <p className="text-muted text-[0.9rem] mb-8">
        Log in to save your scans and review them later.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-line px-3 py-2.5 bg-panel focus:outline-none focus:border-teal"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-line px-3 py-2.5 bg-panel focus:outline-none focus:border-teal"
          />
        </label>

        {error && <p className="text-high text-[0.85rem]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 py-3 bg-ink text-white font-semibold text-[0.9rem] disabled:bg-line disabled:text-muted hover:enabled:bg-teal transition-colors"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-muted text-[0.85rem] mt-6">
        No account?{" "}
        <Link href="/register" className="text-teal underline">
          Register
        </Link>
      </p>
    </div>
  );
}
