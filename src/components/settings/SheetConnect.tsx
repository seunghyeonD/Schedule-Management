"use client";

import { useState, useTransition } from "react";
import {
  connectExistingSpreadsheet,
  createNewSpreadsheet,
  disconnectSpreadsheet,
  syncVisitsToSheets,
} from "@/app/actions/sheets";
import { GooglePicker } from "./GooglePicker";

type Props = {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  hasGoogleToken: boolean;
};

type Mode = "create" | "paste" | "pick";

export function SheetConnect({
  spreadsheetId,
  spreadsheetUrl,
  hasGoogleToken,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("create");
  const [title, setTitle] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [result, setResult] = useState<
    | { type: "success"; message: string; url?: string | null }
    | { type: "error"; message: string }
    | null
  >(null);

  function handleCreate() {
    setResult(null);
    startTransition(async () => {
      const res = await createNewSpreadsheet(title);
      if (res.error) setResult({ type: "error", message: res.error });
      else
        setResult({
          type: "success",
          message: "새 시트가 생성되어 연결되었습니다",
          url: res.url,
        });
    });
  }

  function handlePaste() {
    setResult(null);
    startTransition(async () => {
      const res = await connectExistingSpreadsheet(urlInput);
      if (res.error) setResult({ type: "error", message: res.error });
      else {
        setResult({
          type: "success",
          message: `"${res.title}" 시트가 연결되었습니다`,
          url: res.url,
        });
        setUrlInput("");
      }
    });
  }

  function handleDisconnect() {
    if (!confirm("연결된 시트를 해제할까요? (시트 자체는 삭제되지 않습니다)")) return;
    startTransition(async () => {
      await disconnectSpreadsheet();
      setResult(null);
    });
  }

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const res = await syncVisitsToSheets();
      if (res.error) setResult({ type: "error", message: res.error });
      else
        setResult({
          type: "success",
          message: `동기화 완료: ${res.brands?.join(", ") ?? ""}`,
          url: res.url,
        });
    });
  }

  if (!hasGoogleToken) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Google Sheets 권한이 아직 저장되지 않았습니다.</p>
        <p className="mt-1 text-amber-800">
          상단 메뉴의 <strong>로그아웃</strong> 후 다시 <strong>Google로 로그인</strong> 해주세요.
          이때 &ldquo;스프레드시트 관리&rdquo; 권한 요청이 나오면 <strong>허용</strong>을 누르면 됩니다.
        </p>
      </div>
    );
  }

  // 연결된 상태
  if (spreadsheetId) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-900">
                시트가 연결되어 있습니다
              </p>
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-xs text-emerald-700 underline hover:text-emerald-900"
                >
                  {spreadsheetUrl}
                </a>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="shrink-0 text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
            >
              연결 해제
            </button>
          </div>

          <button
            onClick={handleSync}
            disabled={isPending}
            className="mt-3 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? "동기화 중…" : "지금 동기화"}
          </button>
        </div>

        {result && <ResultBox result={result} />}
      </div>
    );
  }

  // 미연결 상태 — 탭으로 방식 선택
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-neutral-200">
        <TabButton active={mode === "create"} onClick={() => setMode("create")}>
          새 시트 만들기
        </TabButton>
        <TabButton active={mode === "pick"} onClick={() => setMode("pick")}>
          Drive에서 선택
        </TabButton>
        <TabButton active={mode === "paste"} onClick={() => setMode("paste")}>
          URL로 연결
        </TabButton>
      </div>

      {mode === "create" && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">
            내 Google Drive에 새 스프레드시트를 생성하고 자동으로 연결합니다.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="시트 이름 (비워두면 기본 이름)"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "생성 중…" : "+ 새 시트"}
            </button>
          </div>
        </div>
      )}

      {mode === "pick" && (
        <GooglePicker
          onPicked={(message, url) =>
            setResult({ type: "success", message, url: url ?? null })
          }
          onError={(message) => setResult({ type: "error", message })}
        />
      )}

      {mode === "paste" && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">
            이미 갖고 있는 시트의 URL을 붙여넣으세요. 본인 계정의 시트여야 합니다.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
            />
            <button
              onClick={handlePaste}
              disabled={isPending || !urlInput.trim()}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "확인 중…" : "연결"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            예: https://docs.google.com/spreadsheets/d/<b>1AbC...XyZ</b>/edit
          </p>
        </div>
      )}

      {result && <ResultBox result={result} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition ${
        active
          ? "border-neutral-900 text-neutral-900"
          : "border-transparent text-neutral-500 hover:text-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

function ResultBox({
  result,
}: {
  result:
    | { type: "success"; message: string; url?: string | null }
    | { type: "error"; message: string };
}) {
  return (
    <div
      className={`rounded-md p-3 text-sm ${
        result.type === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      <p>{result.message}</p>
      {result.type === "success" && result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-xs underline"
        >
          시트 열기 →
        </a>
      )}
    </div>
  );
}
