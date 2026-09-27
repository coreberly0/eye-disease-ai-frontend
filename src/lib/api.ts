export type Prediction = {
  class: string;
  confidence: number;
};

export type DiseaseDetails = {
  label: string;
  description: string;
  commonSymptoms: string[];
  recommendation: string;
  severity: "none" | "moderate" | "high" | string;
};

export type PredictResponse = {
  prediction: string;
  confidence: number;
  allPredictions: Prediction[];
  details: DiseaseDetails | null;
  saved: boolean;
};

export type ApiError = { error: string };

export type User = {
  id: string;
  email: string;
  name: string | null;
};

export type Scan = {
  id: string;
  prediction: string;
  confidence: number;
  allPredictions: Prediction[];
  imageFilename: string | null;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "ocula_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).error || "Request failed.");
  }
  return data as T;
}

export async function analyzeImage(file: File): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_URL}/api/predict`, {
    method: "POST",
    headers: authHeaders(), // predict works without this too — anonymous scanning is allowed
    body: formData,
  });

  return handleJson<PredictResponse>(res);
}

export async function register(email: string, password: string, name?: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return handleJson<{ token: string; user: User }>(res);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleJson<{ token: string; user: User }>(res);
}

export async function fetchMe() {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: authHeaders(),
  });
  return handleJson<{ user: User }>(res);
}

export async function fetchScanHistory() {
  const res = await fetch(`${API_URL}/api/scans`, {
    headers: authHeaders(),
  });
  return handleJson<{ scans: Scan[] }>(res);
}

export async function deleteScan(id: string) {
  const res = await fetch(`${API_URL}/api/scans/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as ApiError).error || "Could not delete scan.");
  }
}

