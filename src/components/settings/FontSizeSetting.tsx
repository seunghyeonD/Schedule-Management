"use client";

import { useState, useTransition } from "react";
import { updateFontSize } from "@/app/settings/actions";
import {
  FONT_SIZE_OPTIONS,
  FONT_SIZE_PX,
  type FontSize,
} from "@/lib/preferences";

type Props = {
  current: FontSize;
};

export function FontSizeSetting({ current }: Props) {
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<FontSize>(current);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(value: FontSize) {
    if (value === active) return;
    setError(null);
    const prev = active;
    setActive(value);
    // 즉시 화면에 반영 (서버 반영은 비동기)
    document.documentElement.style.fontSize = FONT_SIZE_PX[value];

    startTransition(async () => {
      const res = await updateFontSize(value);
      if (res?.error) {
        setError(res.error);
        setActive(prev);
        document.documentElement.style.fontSize = FONT_SIZE_PX[prev];
      }
    });
  }

  return (
    <div>
      <p className="text-xs text-neutral-500">
        선택한 크기는 모든 기기에서 동일하게 적용됩니다.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FONT_SIZE_OPTIONS.map((opt) => {
          const isActive = active === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              disabled={isPending}
              className={`rounded-md border px-3 py-2 text-center transition disabled:opacity-50 ${
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
              style={{ fontSize: opt.px }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
