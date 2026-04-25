"use server";

import { format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAccessToken } from "@/lib/google/tokens";
import {
  batchUpdate,
  clearValues,
  createSpreadsheet,
  getSpreadsheet,
  writeValues,
} from "@/lib/google/sheets";

const SUMMARY_HEADERS = [
  "순번",
  "지역",
  "시/군/구",
  "매장명",
  "방문 일자",
  "방문 횟수",
  "최근 입점 위치",
  "최근 유입 고객수",
  "최근 진열 형태",
  "최근 판매 동향",
  "최근 활동사항",
  "사진",
];

const LOG_HEADERS = [
  "방문 일자",
  "지역",
  "시/군/구",
  "매장명",
  "입점 위치",
  "유입 고객수",
  "진열 형태",
  "판매 동향",
  "활동사항",
  "사진",
];

function logTabName(brandName: string) {
  return `${brandName} (로그)`;
}

function photoCountText(paths: string[] | null | undefined): string {
  const n = paths?.length ?? 0;
  return n > 0 ? `사진 ${n}장` : "";
}

async function getUserAccessToken() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("google_refresh_token, spreadsheet_id, spreadsheet_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!baseProfile?.google_refresh_token) {
    throw new Error(
      "Google Sheets 권한이 저장되지 않았습니다. 로그아웃 후 다시 로그인하면 권한을 요청합니다.",
    );
  }

  // spreadsheet_managed는 0007 마이그레이션 안 돼 있을 수 있으므로 별도 조회
  let spreadsheet_managed = false;
  const { data: mgRow, error: mgErr } = await supabase
    .from("profiles")
    .select("spreadsheet_managed")
    .eq("id", user.id)
    .maybeSingle();
  if (mgErr) {
    console.warn(
      "[getUserAccessToken] spreadsheet_managed 컬럼이 없을 수 있음 (0007 미실행):",
      mgErr.message,
    );
  } else {
    spreadsheet_managed =
      (mgRow as { spreadsheet_managed?: boolean } | null)
        ?.spreadsheet_managed ?? false;
  }

  const profile = { ...baseProfile, spreadsheet_managed };
  const accessToken = await getGoogleAccessToken(baseProfile.google_refresh_token);
  return { userId: user.id, accessToken, profile, supabase };
}

// 새 스프레드시트 생성 + 본인 profile에 ID 저장
export async function createNewSpreadsheet(title?: string) {
  try {
    const { accessToken, supabase, userId } = await getUserAccessToken();
    const defaultTitle = `일정 관리 (${format(new Date(), "yyyy-MM-dd")})`;
    const sheet = await createSpreadsheet(
      { accessToken },
      title?.trim() || defaultTitle,
    );

    await supabase
      .from("profiles")
      .update({
        spreadsheet_id: sheet.spreadsheetId,
        spreadsheet_url: sheet.spreadsheetUrl,
      })
      .eq("id", userId);

    // 0007 마이그레이션 미실행 환경에서도 안 깨지도록 별도 update
    const { error: mgErr } = await supabase
      .from("profiles")
      .update({ spreadsheet_managed: true })
      .eq("id", userId);
    if (mgErr) {
      console.warn(
        "[createNewSpreadsheet] spreadsheet_managed 플래그 저장 실패 (0007 미실행?):",
        mgErr.message,
      );
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, url: sheet.spreadsheetUrl };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// URL 또는 ID로 기존 시트 연결
export async function connectExistingSpreadsheet(urlOrId: string) {
  const input = urlOrId.trim();
  if (!input) return { error: "URL 또는 ID를 입력하세요" };

  // URL 형태면 ID 추출, 그 외엔 그대로 ID로 간주
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = urlMatch?.[1] ?? input;
  if (!/^[a-zA-Z0-9-_]{20,}$/.test(spreadsheetId)) {
    return { error: "올바른 Google Sheets URL 또는 ID가 아닙니다" };
  }

  try {
    const { accessToken, supabase, userId } = await getUserAccessToken();
    const meta = (await getSpreadsheet(
      { accessToken },
      spreadsheetId,
    )) as { properties: { title: string }; spreadsheetUrl: string };

    await supabase
      .from("profiles")
      .update({
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: meta.spreadsheetUrl,
      })
      .eq("id", userId);

    // 외부에서 가져온 시트 → 기존 탭 건드리지 않음
    const { error: mgErr } = await supabase
      .from("profiles")
      .update({ spreadsheet_managed: false })
      .eq("id", userId);
    if (mgErr) {
      console.warn(
        "[connectExistingSpreadsheet] spreadsheet_managed 플래그 저장 실패 (0007 미실행?):",
        mgErr.message,
      );
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return {
      ok: true,
      title: meta.properties.title,
      url: meta.spreadsheetUrl,
    };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("404") || msg.includes("403")) {
      return {
        error:
          "시트에 접근할 수 없습니다. 본인 계정의 시트가 맞는지, URL이 정확한지 확인하세요.",
      };
    }
    return { error: msg };
  }
}

// Google Picker로 선택된 파일 ID 연결 (API 호출로 제목/URL 조회)
export async function connectPickedSpreadsheet(spreadsheetId: string) {
  return connectExistingSpreadsheet(spreadsheetId);
}

// Picker 같은 클라이언트 기능이 Google API를 직접 호출할 수 있도록 fresh access token 발급
// (access token은 1시간 유효 / refresh token은 서버에만 저장되어 노출 안 됨)
export async function getGoogleAccessTokenForClient() {
  try {
    const { accessToken } = await getUserAccessToken();
    return { ok: true, accessToken };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 연결된 시트 해제 (profile에서만 제거, 실제 시트는 삭제하지 않음)
export async function disconnectSpreadsheet() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  await supabase
    .from("profiles")
    .update({ spreadsheet_id: null, spreadsheet_url: null })
    .eq("id", user.id);

  revalidatePath("/settings");
  return { ok: true };
}

const DEFAULT_TAB_TITLES = new Set(["시트1", "Sheet1"]);

// 주어진 브랜드명 리스트 기준으로 탭을 동기화:
//   - 빠진 탭 추가
//   - managed=true (앱이 만든 시트)인 경우에만 기본 "시트1"/"Sheet1" 제거
//     사용자가 가져온 외부 시트는 Sheet1에 실제 데이터가 있을 수 있어서 절대 안 지움
async function syncSpreadsheetTabs(
  accessToken: string,
  spreadsheetId: string,
  brandNames: string[],
  managed: boolean,
) {
  const meta = (await getSpreadsheet({ accessToken }, spreadsheetId)) as {
    sheets: { properties: { sheetId: number; title: string } }[];
  };
  const existing = new Map(
    meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]),
  );

  const requests: unknown[] = [];
  for (const name of brandNames) {
    if (!existing.has(name)) {
      requests.push({ addSheet: { properties: { title: name } } });
    }
  }

  if (managed) {
    // 브랜드 탭이 하나라도 남아있을 때만 기본 탭 제거 (최소 1탭 유지 규칙)
    const willHaveBrandTab =
      brandNames.length > 0 &&
      (brandNames.some((n) => existing.has(n)) || requests.length > 0);
    if (willHaveBrandTab) {
      for (const { properties } of meta.sheets) {
        if (DEFAULT_TAB_TITLES.has(properties.title)) {
          requests.push({ deleteSheet: { sheetId: properties.sheetId } });
        }
      }
    }
  }

  if (requests.length > 0) {
    await batchUpdate({ accessToken }, spreadsheetId, requests);
  }
}

// 브랜드 추가 시 해당 브랜드의 탭을 시트에 만들어 둠 (헤더만 있는 빈 탭)
export async function ensureBrandSheetTab(brandName: string) {
  try {
    const name = brandName.trim();
    if (!name) return { ok: true };

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: true }; // 비로그인은 조용히 skip

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token, spreadsheet_id")
      .eq("id", user.id)
      .maybeSingle();

    // 시트 미연결이면 에러 없이 skip (브랜드 생성은 정상 진행되어야 함)
    if (!profile?.spreadsheet_id || !profile.google_refresh_token) {
      return { ok: true };
    }

    // spreadsheet_managed는 0007 마이그레이션 안 돼 있을 수 있으므로 별도 조회
    let managed = false;
    const { data: mgRow } = await supabase
      .from("profiles")
      .select("spreadsheet_managed")
      .eq("id", user.id)
      .maybeSingle();
    managed =
      (mgRow as { spreadsheet_managed?: boolean } | null)
        ?.spreadsheet_managed ?? false;

    const accessToken = await getGoogleAccessToken(profile.google_refresh_token);
    const logName = logTabName(name);
    await syncSpreadsheetTabs(
      accessToken,
      profile.spreadsheet_id,
      [name, logName],
      managed,
    );

    // 헤더 행 작성 (이미 있으면 동일 값으로 덮어써도 무해)
    await writeValues(
      { accessToken },
      profile.spreadsheet_id,
      `'${name}'!A1`,
      [SUMMARY_HEADERS],
    );
    await writeValues(
      { accessToken },
      profile.spreadsheet_id,
      `'${logName}'!A1`,
      [LOG_HEADERS],
    );

    return { ok: true };
  } catch (e) {
    // 브랜드 생성 흐름을 막지 않도록 에러는 로그만
    console.error("[ensureBrandSheetTab] 실패:", (e as Error).message);
    return { ok: true };
  }
}

// 브랜드 삭제 시 해당 브랜드 탭을 시트에서 제거
// (앱이 만든 시트 managed=true 일 때만 — 외부 시트는 사용자가 같은 이름으로 쓰던 탭일 수 있어서 건드리지 않음)
export async function removeBrandSheetTab(brandName: string) {
  try {
    const name = brandName.trim();
    if (!name) return { ok: true };

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: true };

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token, spreadsheet_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.spreadsheet_id || !profile.google_refresh_token) {
      return { ok: true };
    }

    // 외부 시트는 사용자 데이터 보호 위해 탭 건드리지 않음
    let managed = false;
    const { data: mgRow } = await supabase
      .from("profiles")
      .select("spreadsheet_managed")
      .eq("id", user.id)
      .maybeSingle();
    managed =
      (mgRow as { spreadsheet_managed?: boolean } | null)
        ?.spreadsheet_managed ?? false;
    if (!managed) return { ok: true };

    const accessToken = await getGoogleAccessToken(profile.google_refresh_token);
    const meta = (await getSpreadsheet(
      { accessToken },
      profile.spreadsheet_id,
    )) as {
      sheets: { properties: { sheetId: number; title: string } }[];
    };

    const targetTitles = new Set([name, logTabName(name)]);
    const targets = meta.sheets.filter((s) =>
      targetTitles.has(s.properties.title),
    );
    if (targets.length === 0) return { ok: true };

    // Google Sheets 최소 1개 탭 유지 규칙: 전체 삭제하면 안 되므로
    // 모두 지우면 시트가 비는 경우엔 마지막 1개를 비우기만 하고 둠
    const remainingAfter = meta.sheets.length - targets.length;
    const toDelete =
      remainingAfter < 1 ? targets.slice(0, targets.length - 1) : targets;
    const toClear = remainingAfter < 1 ? [targets[targets.length - 1]] : [];

    if (toDelete.length > 0) {
      await batchUpdate(
        { accessToken },
        profile.spreadsheet_id,
        toDelete.map((t) => ({
          deleteSheet: { sheetId: t.properties.sheetId },
        })),
      );
    }
    for (const t of toClear) {
      await clearValues(
        { accessToken },
        profile.spreadsheet_id,
        `'${t.properties.title}'!A:Z`,
      );
    }

    return { ok: true };
  } catch (e) {
    console.error("[removeBrandSheetTab] 실패:", (e as Error).message);
    return { ok: true };
  }
}

// 방문 기록을 시트 포맷으로 동기화 (요약 탭 + 로그 탭)
export async function syncVisitsToSheets() {
  try {
    const { accessToken, supabase, userId, profile } = await getUserAccessToken();
    if (!profile.spreadsheet_id) {
      return { error: "먼저 설정에서 스프레드시트를 연결해 주세요" };
    }

    // 브랜드 전체 조회 (매장 0개짜리 브랜드도 탭은 만들기 위함)
    const { data: allBrands, error: bErr } = await supabase
      .from("brands")
      .select("id, name")
      .order("name");
    if (bErr) throw bErr;

    // 매장 + 지역그룹 + 브랜드 조회
    const { data: stores, error: sErr } = await supabase
      .from("stores")
      .select(
        "id, name, sigungu, brand:brands(id, name), region_group:region_groups(id, name)",
      );
    if (sErr) throw sErr;

    // 본인 방문 전체 조회 (메모 포함, 0009 미실행 시 폴백)
    type VisitRow = {
      store_id: string;
      visit_date: string;
      store_position: string | null;
      customer_count: string | null;
      sales_trend: string | null;
      activity: string | null;
      display_type: string | null;
      photo_paths: string[] | null;
    };

    let visits: VisitRow[] = [];
    const fullVisitSelect =
      "store_id, visit_date, store_position, customer_count, sales_trend, activity, display_type, photo_paths";
    const withMemo = await supabase
      .from("visits")
      .select(fullVisitSelect)
      .eq("user_id", userId)
      .order("visit_date");
    if (!withMemo.error) {
      visits = (withMemo.data ?? []) as unknown as VisitRow[];
    } else {
      console.warn(
        "[syncVisitsToSheets] 메모 컬럼 쿼리 실패 (0009 미실행?) — 기본 컬럼만으로 폴백:",
        withMemo.error.message,
      );
      const basic = await supabase
        .from("visits")
        .select("store_id, visit_date")
        .eq("user_id", userId)
        .order("visit_date");
      if (basic.error) throw basic.error;
      visits = (basic.data ?? []).map((v) => ({
        store_id: v.store_id,
        visit_date: v.visit_date,
        store_position: null,
        customer_count: null,
        sales_trend: null,
        activity: null,
        display_type: null,
        photo_paths: null,
      }));
    }

    // store_id -> visits (날짜 오름차순)
    const visitsByStore = new Map<string, VisitRow[]>();
    for (const v of visits) {
      const arr = visitsByStore.get(v.store_id) ?? [];
      arr.push(v);
      visitsByStore.set(v.store_id, arr);
    }
    // 각 매장별로 visit_date 오름차순 정렬 보장
    for (const arr of Array.from(visitsByStore.values())) {
      arr.sort((a: VisitRow, b: VisitRow) =>
        a.visit_date.localeCompare(b.visit_date),
      );
    }

    // 브랜드별로 매장 그룹핑
    type StoreRow = {
      storeId: string;
      brandName: string;
      regionGroup: string;
      sigungu: string;
      storeName: string;
    };
    const byBrand = new Map<string, StoreRow[]>();
    for (const b of allBrands ?? []) {
      byBrand.set(b.name, []);
    }
    for (const s of (stores ?? []) as unknown as Array<{
      id: string;
      name: string;
      sigungu: string | null;
      brand: { id: string; name: string } | null;
      region_group: { id: string; name: string } | null;
    }>) {
      if (!s.brand) continue;
      const list = byBrand.get(s.brand.name) ?? [];
      list.push({
        storeId: s.id,
        brandName: s.brand.name,
        regionGroup: s.region_group?.name ?? "",
        sigungu: s.sigungu ?? "",
        storeName: s.name,
      });
      byBrand.set(s.brand.name, list);
    }

    if (byBrand.size === 0) {
      return { error: "등록된 브랜드가 없습니다" };
    }

    const brandNames = Array.from(byBrand.keys());
    const allTabNames: string[] = [];
    for (const b of brandNames) {
      allTabNames.push(b, logTabName(b));
    }

    // 탭 동기화: 빠진 탭 추가 + (앱 관리 시트에 한해) 기본 "시트1" 정리
    await syncSpreadsheetTabs(
      accessToken,
      profile.spreadsheet_id,
      allTabNames,
      profile.spreadsheet_managed ?? false,
    );

    // 각 브랜드 탭에 데이터 쓰기
    for (const brandName of brandNames) {
      const storeRows = byBrand.get(brandName)!;
      storeRows.sort((a, b) => {
        return (
          a.regionGroup.localeCompare(b.regionGroup, "ko") ||
          a.sigungu.localeCompare(b.sigungu, "ko") ||
          a.storeName.localeCompare(b.storeName, "ko")
        );
      });

      // ───────── 요약 탭: 매장당 1행 ─────────
      const summaryRows: (string | number)[][] = [SUMMARY_HEADERS];
      storeRows.forEach((s, idx) => {
        const storeVisits = visitsByStore.get(s.storeId) ?? [];
        const dates = storeVisits
          .map((v) => format(parseISO(v.visit_date), "M/d"))
          .join(", ");
        const count = storeVisits.length;
        const latest = storeVisits[storeVisits.length - 1]; // 최신 방문
        summaryRows.push([
          idx + 1,
          s.regionGroup,
          s.sigungu,
          s.storeName,
          dates,
          count,
          latest?.store_position ?? "",
          latest?.customer_count ?? "",
          latest?.display_type ?? "",
          latest?.sales_trend ?? "",
          latest?.activity ?? "",
          photoCountText(latest?.photo_paths ?? null),
        ]);
      });

      await clearValues(
        { accessToken },
        profile.spreadsheet_id,
        `'${brandName}'!A:Z`,
      );
      await writeValues(
        { accessToken },
        profile.spreadsheet_id,
        `'${brandName}'!A1`,
        summaryRows,
      );

      // ───────── 로그 탭: 방문당 1행 (최신순) ─────────
      type LogEntry = {
        date: string;
        regionGroup: string;
        sigungu: string;
        storeName: string;
        storePosition: string;
        customerCount: string;
        displayType: string;
        salesTrend: string;
        activity: string;
        photo: string;
      };

      const logEntries: LogEntry[] = [];
      for (const s of storeRows) {
        const storeVisits = visitsByStore.get(s.storeId) ?? [];
        for (const v of storeVisits) {
          logEntries.push({
            date: v.visit_date,
            regionGroup: s.regionGroup,
            sigungu: s.sigungu,
            storeName: s.storeName,
            storePosition: v.store_position ?? "",
            customerCount: v.customer_count ?? "",
            displayType: v.display_type ?? "",
            salesTrend: v.sales_trend ?? "",
            activity: v.activity ?? "",
            photo: photoCountText(v.photo_paths),
          });
        }
      }
      // 최신 방문이 위로 가도록 내림차순
      logEntries.sort((a, b) => b.date.localeCompare(a.date));

      const logRows: (string | number)[][] = [LOG_HEADERS];
      for (const e of logEntries) {
        logRows.push([
          format(parseISO(e.date), "yyyy-MM-dd"),
          e.regionGroup,
          e.sigungu,
          e.storeName,
          e.storePosition,
          e.customerCount,
          e.displayType,
          e.salesTrend,
          e.activity,
          e.photo,
        ]);
      }

      const logName = logTabName(brandName);
      await clearValues(
        { accessToken },
        profile.spreadsheet_id,
        `'${logName}'!A:Z`,
      );
      await writeValues(
        { accessToken },
        profile.spreadsheet_id,
        `'${logName}'!A1`,
        logRows,
      );
    }

    // 싱크 시각 업데이트
    const nowIso = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ last_synced_at: nowIso })
      .eq("id", userId);

    revalidatePath("/settings");
    return {
      ok: true,
      url: profile.spreadsheet_url,
      brands: brandNames,
      syncedAt: nowIso,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 캘린더에서 사용자 profile의 연결 상태 조회용
export async function getSyncStatus() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, lastSyncedAt: null };

  // 먼저 spreadsheet_id만 확인 (반드시 존재하는 컬럼)
  const { data: base, error: baseErr } = await supabase
    .from("profiles")
    .select("spreadsheet_id")
    .eq("id", user.id)
    .maybeSingle();

  if (baseErr) {
    console.error("[getSyncStatus] spreadsheet_id 조회 실패:", baseErr);
    return { connected: false, lastSyncedAt: null };
  }

  // last_synced_at은 마이그레이션 안 됐을 수 있으니 별도 처리
  let lastSyncedAt: string | null = null;
  const { data: syncRow, error: syncErr } = await supabase
    .from("profiles")
    .select("last_synced_at")
    .eq("id", user.id)
    .maybeSingle();
  if (syncErr) {
    console.warn(
      "[getSyncStatus] last_synced_at 컬럼이 없을 수 있음 (0004 마이그레이션 미실행):",
      syncErr.message,
    );
  } else {
    lastSyncedAt =
      (syncRow as { last_synced_at?: string } | null)?.last_synced_at ?? null;
  }

  return {
    connected: !!base?.spreadsheet_id,
    lastSyncedAt,
  };
}
