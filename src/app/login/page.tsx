"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // Sheets 읽기/쓰기 + Drive 중 앱이 만든 파일 접근
        scopes:
          "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
        // offline access + 동의 재확인 → refresh_token 확실히 발급
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-neutral-900">일정 관리</h1>
        <p className="mt-2 text-sm text-neutral-500">
          구글 계정으로 로그인하세요.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? "연결 중…" : "Google로 계속"}
        </button>

        {error && (
          <p className="mt-4 text-xs text-red-600">{error}</p>
        )}

        <p className="mt-6 text-center text-[11px] text-neutral-400">
          로그인 시{" "}
          <a href="/terms" className="underline hover:text-neutral-700">
            서비스 이용약관
          </a>{" "}
          및{" "}
          <a href="/privacy" className="underline hover:text-neutral-700">
            개인정보처리방침
          </a>
          에 동의하는 절차가 진행됩니다.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.63Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.82.94 4.03l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
