"use client";

import { useState, useTransition } from "react";
import { createBrand } from "@/app/stores/actions";

export function BrandForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    startTransition(async () => {
      const res = await createBrand(formData);
      if (res?.error) setError(res.error);
      else setName("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-xs font-medium text-neutral-600">
          새 브랜드
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 아리따움"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "추가 중…" : "추가"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
