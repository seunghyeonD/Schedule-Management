"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  createInvitation,
  removeMember,
  revokeInvitation,
  type Invitation,
  type Member,
} from "@/app/actions/members";
import { deleteOrg } from "@/app/actions/organizations";

type Props = {
  orgId: string;
  orgName: string;
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
};

export function MembersClient({
  orgId,
  orgName,
  members,
  invitations: initialInvitations,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleCreateInvite() {
    setError(null);
    startTransition(async () => {
      const res = await createInvitation(orgId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.invitation) {
        setInvitations((prev) => [res.invitation!, ...prev]);
      }
    });
  }

  function handleRevoke(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await revokeInvitation(id, orgId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`${name} 님을 기업에서 제거하시겠습니까?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await removeMember(orgId, userId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleDeleteOrg() {
    setError(null);
    startTransition(async () => {
      const res = await deleteOrg(orgId);
      if (res.error) {
        setError(res.error);
        setConfirmDelete(false);
        return;
      }
      router.push("/organizations");
    });
  }

  function daysUntil(iso: string): number {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
        멤버 관리
      </h1>
      <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
        {orgName} 기업의 멤버와 초대 코드를 관리합니다.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* ─────────── 멤버 ─────────── */}
      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-neutral-800">
          멤버 ({members.length}명)
        </h2>
        <ul className="mt-3 divide-y divide-neutral-100">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {m.display_name || m.email}
                  {m.user_id === currentUserId && (
                    <span className="ml-1 text-xs text-neutral-400">(나)</span>
                  )}
                </p>
                <p className="truncate text-xs text-neutral-500">{m.email}</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {m.role === "master" ? "마스터" : "멤버"} · 가입{" "}
                  {format(parseISO(m.joined_at), "yyyy.M.d", { locale: ko })}
                </p>
              </div>
              {m.role !== "master" && m.user_id !== currentUserId && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemove(m.user_id, m.display_name || m.email)
                  }
                  disabled={isPending}
                  className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  제거
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ─────────── 초대 코드 ─────────── */}
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">초대 코드</h2>
          <button
            type="button"
            onClick={handleCreateInvite}
            disabled={isPending}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-900 disabled:opacity-50"
          >
            + 코드 생성
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          6자리 코드 · 7일 후 만료 · 1회 사용 시 자동 소멸
        </p>

        {invitations.length === 0 ? (
          <p className="mt-3 rounded-md bg-neutral-50 px-3 py-3 text-xs text-neutral-500">
            활성 코드가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5"
              >
                <div>
                  <code className="font-mono text-base font-bold tracking-widest text-neutral-900">
                    {inv.code}
                  </code>
                  <p className="text-[11px] text-neutral-400">
                    만료까지 D-{daysUntil(inv.expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(inv.code)}
                    className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    {copiedCode === inv.code ? "복사됨" : "복사"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isPending}
                    className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    폐기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─────────── 위험 영역: 기업 삭제 ─────────── */}
      <section className="mt-4 rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-red-700">위험 영역</h2>
        <p className="mt-1 text-xs text-red-600">
          기업을 삭제하면 모든 매장/방문/사진/멤버 정보가 영구 삭제됩니다. 복구
          불가.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            기업 삭제
          </button>
        ) : (
          <div className="mt-3 rounded-md border border-red-300 bg-white p-3">
            <p className="text-xs font-semibold text-red-700">
              정말로 &ldquo;{orgName}&rdquo; 기업을 삭제하시겠습니까?
            </p>
            <p className="mt-1 text-[11px] text-red-600">
              모든 데이터가 즉시 사라집니다.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteOrg}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "삭제 중…" : "영구 삭제"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
