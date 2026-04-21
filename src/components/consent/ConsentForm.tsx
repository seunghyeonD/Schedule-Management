"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveConsent } from "@/app/actions/consent";

export function ConsentForm() {
  const [isPending, startTransition] = useTransition();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAgreed = terms && privacy;

  function toggleAll(checked: boolean) {
    setTerms(checked);
    setPrivacy(checked);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAgreed) {
      setError("모든 항목에 동의해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveConsent();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3">
        <input
          type="checkbox"
          checked={allAgreed}
          onChange={(e) => toggleAll(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-semibold text-neutral-900">
          아래 항목에 모두 동의합니다
        </span>
      </label>

      <div className="space-y-2">
        <ConsentRow
          checked={terms}
          onChange={setTerms}
          label="서비스 이용약관 동의"
          required
          href="/terms"
        />
        <ConsentRow
          checked={privacy}
          onChange={setPrivacy}
          label="개인정보 수집 및 이용 동의"
          required
          href="/privacy"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!allAgreed || isPending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "저장 중…" : "동의하고 시작하기"}
      </button>
    </form>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  required,
  href,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
  href: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <input
        id={`consent-${label}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <label
        htmlFor={`consent-${label}`}
        className="flex-1 cursor-pointer text-sm text-neutral-700"
      >
        {required && (
          <span className="mr-1 text-xs font-medium text-red-600">[필수]</span>
        )}
        {label}
      </label>
      <Link
        href={href}
        target="_blank"
        className="text-xs text-neutral-500 hover:text-neutral-900"
      >
        보기 →
      </Link>
    </div>
  );
}
