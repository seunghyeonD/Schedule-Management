"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createOrg,
  joinByCode,
  switchOrg,
  type MyOrganization,
} from "@/app/actions/organizations";

type Mode = "list" | "create" | "join";

type Props = {
  orgs: MyOrganization[];
  userEmail: string;
};

export function OrganizationsClient({ orgs, userEmail }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("list");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  function handleSwitch(orgId: string) {
    setError(null);
    startTransition(async () => {
      const res = await switchOrg(orgId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/");
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createOrg({ name });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/");
    });
  }

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      const res = await joinByCode({ code });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/");
    });
  }

  return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-neutral-900 sm:text-xl">
            일정 관리
          </h1>
          <p className="mt-2 text-base font-semibold text-neutral-900">
            기업 선택
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            관리할 기업을 선택하거나 새로 만드세요.
          </p>
        </div>

        {mode === "list" && (
          <div className="space-y-2">
            {orgs.length === 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                아직 가입된 기업이 없습니다. 새로 만들거나 초대 코드로
                참여하세요.
              </p>
            )}

            {orgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => handleSwitch(o.id)}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
              >
                <span className="font-semibold text-neutral-900">{o.name}</span>
                <span className="text-xs text-neutral-500">
                  {o.role === "master" ? "마스터" : "멤버"}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("join");
              }}
              className="mt-3 flex w-full items-center justify-center rounded-lg bg-neutral-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900"
            >
              초대 코드로 참여
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("create");
              }}
              className="flex w-full items-center justify-center rounded-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
            >
              + 새 기업 만들기
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-3">
            {orgs.length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                {orgs[0].name}{" "}
                <span className="float-right text-xs text-neutral-400">
                  {orgs[0].role === "master" ? "마스터" : "멤버"}
                </span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                기업 이름
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 우리회사"
                autoFocus
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleCreate();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("list")}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || !name.trim()}
                className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-900 disabled:opacity-50"
              >
                {isPending ? "만드는 중…" : "만들기"}
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                초대 코드
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="예: A1B2C3"
                autoFocus
                maxLength={20}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-mono uppercase tracking-widest focus:border-neutral-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.trim()) handleJoin();
                }}
              />
              <p className="mt-1 text-xs text-neutral-500">
                마스터에게서 받은 6자리 코드를 입력하세요.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("list")}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleJoin}
                disabled={isPending || !code.trim()}
                className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-900 disabled:opacity-50"
              >
                {isPending ? "확인 중…" : "참여"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            로그아웃
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-neutral-400">
          로그인 계정: {userEmail}
        </p>
      </div>
    </div>
  );
}
