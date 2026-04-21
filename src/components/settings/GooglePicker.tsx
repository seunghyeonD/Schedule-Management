"use client";

import Script from "next/script";
import { useCallback, useState } from "react";
import {
  connectPickedSpreadsheet,
  getGoogleAccessTokenForClient,
} from "@/app/actions/sheets";

declare global {
  interface Window {
    gapi?: {
      load: (name: string, cb: () => void) => void;
    };
    google?: {
      picker: {
        PickerBuilder: new () => PickerBuilder;
        DocsView: new (viewId?: string) => DocsView;
        Action: { PICKED: string; CANCEL: string };
        ViewId: { SPREADSHEETS: string; DOCS: string };
      };
    };
  }
}

type DocsView = {
  setIncludeFolders: (b: boolean) => DocsView;
  setMimeTypes: (types: string) => DocsView;
  setOwnedByMe: (b: boolean) => DocsView;
  setMode: (mode: string) => DocsView;
};

type PickerBuilder = {
  addView: (view: DocsView | string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  setCallback: (cb: (data: PickerResult) => void) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
};

type PickerResult = {
  action: string;
  docs?: { id: string; name: string; url: string }[];
};

type Props = {
  onPicked: (message: string, url?: string | null) => void;
  onError: (message: string) => void;
};

export function GooglePicker({ onPicked, onError }: Props) {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;

  const openPicker = useCallback(async () => {
    if (!apiKey) {
      onError("Picker API Key 설정이 누락되었습니다 (.env.local 확인)");
      return;
    }
    if (!window.gapi) {
      onError("Google API가 아직 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
      return;
    }

    setBusy(true);
    try {
      const tok = await getGoogleAccessTokenForClient();
      if ("error" in tok || !tok.accessToken) {
        onError(("error" in tok && tok.error) || "토큰 발급 실패");
        setBusy(false);
        return;
      }

      // 디버그용 로그
      console.log("[Picker] apiKey length:", apiKey.length);
      console.log("[Picker] appId:", appId, "(length:", appId?.length, ")");
      console.log("[Picker] accessToken prefix:", tok.accessToken.slice(0, 12), "...");

      await new Promise<void>((resolve) => {
        window.gapi!.load("picker", () => resolve());
      });

      if (!window.google?.picker) {
        onError("Picker API 초기화 실패");
        setBusy(false);
        return;
      }

      // Spreadsheet만 필터링하는 DocsView 사용
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.SPREADSHEETS,
      )
        .setIncludeFolders(false)
        .setMimeTypes("application/vnd.google-apps.spreadsheet")
        .setOwnedByMe(true);

      let builder = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(tok.accessToken)
        .setDeveloperKey(apiKey)
        .setTitle("연결할 스프레드시트 선택")
        .setCallback(async (data) => {
          console.log("[Picker] callback:", data.action);
          if (data.action === window.google!.picker.Action.PICKED) {
            const picked = data.docs?.[0];
            if (!picked) {
              setBusy(false);
              return;
            }
            const res = await connectPickedSpreadsheet(picked.id);
            if (res.error) onError(res.error);
            else onPicked(`"${res.title}" 시트가 연결되었습니다`, res.url);
            setBusy(false);
          } else if (data.action === window.google!.picker.Action.CANCEL) {
            setBusy(false);
          }
        });

      // appId는 문제 있으면 생략 (조직 정책 없으면 필수 아님)
      if (appId && /^\d{6,}$/.test(appId)) {
        builder = builder.setAppId(appId);
      } else if (appId) {
        console.warn(
          "[Picker] NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER가 숫자가 아닙니다 → setAppId 생략:",
          appId,
        );
      }

      const picker = builder.build();
      picker.setVisible(true);
    } catch (e) {
      console.error("[Picker] error:", e);
      onError((e as Error).message);
      setBusy(false);
    }
  }, [apiKey, appId, onError, onPicked]);

  return (
    <>
      <Script
        src="https://apis.google.com/js/api.js"
        strategy="lazyOnload"
        onLoad={() => setGapiLoaded(true)}
      />
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-xs text-neutral-500">
          Google Drive 창을 열어 시트를 직접 선택합니다.
        </p>
        <button
          onClick={openPicker}
          disabled={!gapiLoaded || busy || !apiKey}
          className="mt-3 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {!gapiLoaded
            ? "Google API 로드 중…"
            : busy
              ? "열리는 중…"
              : "내 Drive에서 선택"}
        </button>
        {!apiKey && (
          <p className="mt-2 text-[11px] text-amber-700">
            NEXT_PUBLIC_GOOGLE_PICKER_API_KEY env 변수가 필요합니다.
          </p>
        )}
      </div>
    </>
  );
}
