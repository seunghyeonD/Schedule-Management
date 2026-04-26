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
import { getCurrentOrgId, isCurrentUserMaster } from "@/lib/org/current";

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
  "담당자",
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

// 현재 org와 본인의 google_refresh_token으로 access token 발급
// (시트는 org 마스터의 Drive에 있지만, 호출자의 OAuth 토큰으로 접근 시도.
//  마스터만 connect/disconnect/sync 가능하므로 호출자=마스터=시트 소유자가 일반적)
async function getOrgSheetContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("기업이 선택되지 않았습니다");

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, spreadsheet_id, spreadsheet_url, spreadsheet_managed")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw orgErr;
  if (!org) throw new Error("기업 정보를 찾을 수 없습니다");

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.google_refresh_token) {
    throw new Error(
      "Google Sheets 권한이 저장되지 않았습니다. 로그아웃 후 다시 로그인하면 권한을 요청합니다.",
    );
  }

  const accessToken = await getGoogleAccessToken(profile.google_refresh_token);
  return { userId: user.id, orgId, org, accessToken, supabase };
}

// 새 스프레드시트 생성 + org에 연결 (마스터 전용)
export async function createNewSpreadsheet(title?: string) {
  try {
    const { accessToken, supabase, orgId, org } = await getOrgSheetContext();
    if (!(await isCurrentUserMaster(orgId))) {
      return { error: "마스터만 시트를 연결할 수 있습니다" };
    }

    const defaultTitle = `${org.name} 일정 관리 (${format(new Date(), "yyyy-MM-dd")})`;
    const sheet = await createSpreadsheet(
      { accessToken },
      title?.trim() || defaultTitle,
    );

    await supabase
      .from("organizations")
      .update({
        spreadsheet_id: sheet.spreadsheetId,
        spreadsheet_url: sheet.spreadsheetUrl,
        spreadsheet_managed: true,
      })
      .eq("id", orgId);

    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, url: sheet.spreadsheetUrl };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// URL 또는 ID로 기존 시트 연결 (마스터 전용)
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
    const { accessToken, supabase, orgId } = await getOrgSheetContext();
    if (!(await isCurrentUserMaster(orgId))) {
      return { error: "마스터만 시트를 연결할 수 있습니다" };
    }

    const meta = (await getSpreadsheet(
      { accessToken },
      spreadsheetId,
    )) as { properties: { title: string }; spreadsheetUrl: string };

    await supabase
      .from("organizations")
      .update({
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: meta.spreadsheetUrl,
        spreadsheet_managed: false,
      })
      .eq("id", orgId);

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

// Google Picker로 선택된 파일 ID 연결
export async function connectPickedSpreadsheet(spreadsheetId: string) {
  return connectExistingSpreadsheet(spreadsheetId);
}

// Picker 같은 클라이언트 기능이 Google API를 직접 호출할 수 있도록 fresh access token 발급
export async function getGoogleAccessTokenForClient() {
  try {
    const { accessToken } = await getOrgSheetContext();
    return { ok: true, accessToken };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 연결된 시트 해제 (org에서만 제거, 실제 시트는 삭제하지 않음)
export async function disconnectSpreadsheet() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "기업이 선택되지 않았습니다" };
  if (!(await isCurrentUserMaster(orgId))) {
    return { error: "마스터만 시트를 해제할 수 있습니다" };
  }

  await supabase
    .from("organizations")
    .update({
      spreadsheet_id: null,
      spreadsheet_url: null,
      spreadsheet_managed: false,
    })
    .eq("id", orgId);

  revalidatePath("/settings");
  return { ok: true };
}

const DEFAULT_TAB_TITLES = new Set(["시트1", "Sheet1"]);

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

// 브랜드 추가 시 해당 브랜드 탭을 시트에 만들어 둠
export async function ensureBrandSheetTab(brandName: string) {
  try {
    const name = brandName.trim();
    if (!name) return { ok: true };

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: true };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { ok: true };

    const { data: org } = await supabase
      .from("organizations")
      .select("spreadsheet_id, spreadsheet_managed")
      .eq("id", orgId)
      .maybeSingle();
    if (!org?.spreadsheet_id) return { ok: true };

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.google_refresh_token) return { ok: true };

    const accessToken = await getGoogleAccessToken(profile.google_refresh_token);
    const logName = logTabName(name);
    await syncSpreadsheetTabs(
      accessToken,
      org.spreadsheet_id,
      [name, logName],
      org.spreadsheet_managed ?? false,
    );

    await writeValues(
      { accessToken },
      org.spreadsheet_id,
      `'${name}'!A1`,
      [SUMMARY_HEADERS],
    );
    await writeValues(
      { accessToken },
      org.spreadsheet_id,
      `'${logName}'!A1`,
      [LOG_HEADERS],
    );

    return { ok: true };
  } catch (e) {
    console.error("[ensureBrandSheetTab] 실패:", (e as Error).message);
    return { ok: true };
  }
}

// 브랜드 삭제 시 해당 브랜드 탭을 시트에서 제거
export async function removeBrandSheetTab(brandName: string) {
  try {
    const name = brandName.trim();
    if (!name) return { ok: true };

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: true };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { ok: true };

    const { data: org } = await supabase
      .from("organizations")
      .select("spreadsheet_id, spreadsheet_managed")
      .eq("id", orgId)
      .maybeSingle();
    if (!org?.spreadsheet_id || !org.spreadsheet_managed) return { ok: true };

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.google_refresh_token) return { ok: true };

    const accessToken = await getGoogleAccessToken(profile.google_refresh_token);
    const meta = (await getSpreadsheet(
      { accessToken },
      org.spreadsheet_id,
    )) as {
      sheets: { properties: { sheetId: number; title: string } }[];
    };

    const targetTitles = new Set([name, logTabName(name)]);
    const targets = meta.sheets.filter((s) =>
      targetTitles.has(s.properties.title),
    );
    if (targets.length === 0) return { ok: true };

    const remainingAfter = meta.sheets.length - targets.length;
    const toDelete =
      remainingAfter < 1 ? targets.slice(0, targets.length - 1) : targets;
    const toClear = remainingAfter < 1 ? [targets[targets.length - 1]] : [];

    if (toDelete.length > 0) {
      await batchUpdate(
        { accessToken },
        org.spreadsheet_id,
        toDelete.map((t) => ({
          deleteSheet: { sheetId: t.properties.sheetId },
        })),
      );
    }
    for (const t of toClear) {
      await clearValues(
        { accessToken },
        org.spreadsheet_id,
        `'${t.properties.title}'!A:Z`,
      );
    }

    return { ok: true };
  } catch (e) {
    console.error("[removeBrandSheetTab] 실패:", (e as Error).message);
    return { ok: true };
  }
}

// 방문 기록을 시트로 동기화 (마스터 전용 — org 전체 데이터 통합)
export async function syncVisitsToSheets() {
  try {
    const { accessToken, supabase, orgId, org } = await getOrgSheetContext();
    if (!(await isCurrentUserMaster(orgId))) {
      return { error: "마스터만 시트 동기화를 실행할 수 있습니다" };
    }
    if (!org.spreadsheet_id) {
      return { error: "먼저 설정에서 스프레드시트를 연결해 주세요" };
    }

    // org의 브랜드 전체
    const { data: allBrands, error: bErr } = await supabase
      .from("brands")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name");
    if (bErr) throw bErr;

    // org의 매장 + 지역그룹 + 브랜드
    const { data: stores, error: sErr } = await supabase
      .from("stores")
      .select(
        "id, name, sigungu, brand:brands(id, name), region_group:region_groups(id, name)",
      )
      .eq("organization_id", orgId);
    if (sErr) throw sErr;

    // org의 모든 멤버 방문 (RLS가 멤버 범위 보장)
    type VisitRow = {
      user_id: string;
      store_id: string;
      visit_date: string;
      store_position: string | null;
      customer_count: string | null;
      sales_trend: string | null;
      activity: string | null;
      display_type: string | null;
      photo_paths: string[] | null;
    };
    const { data: visitData, error: vErr } = await supabase
      .from("visits")
      .select(
        "user_id, store_id, visit_date, store_position, customer_count, sales_trend, activity, display_type, photo_paths",
      )
      .eq("organization_id", orgId)
      .order("visit_date");
    if (vErr) throw vErr;
    const visits: VisitRow[] = (visitData ?? []) as VisitRow[];

    // 멤버 user_id → display_name 매핑 (담당자 컬럼용)
    const memberIds = Array.from(new Set(visits.map((v) => v.user_id)));
    const memberNames = new Map<string, string>();
    if (memberIds.length > 0) {
      const { data: members } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", memberIds);
      for (const m of members ?? []) {
        memberNames.set(m.id, m.display_name || m.email || "이름없음");
      }
    }

    // store_id -> visits
    const visitsByStore = new Map<string, VisitRow[]>();
    for (const v of visits) {
      const arr = visitsByStore.get(v.store_id) ?? [];
      arr.push(v);
      visitsByStore.set(v.store_id, arr);
    }
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

    await syncSpreadsheetTabs(
      accessToken,
      org.spreadsheet_id,
      allTabNames,
      org.spreadsheet_managed ?? false,
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
        const latest = storeVisits[storeVisits.length - 1];
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
        org.spreadsheet_id,
        `'${brandName}'!A:Z`,
      );
      await writeValues(
        { accessToken },
        org.spreadsheet_id,
        `'${brandName}'!A1`,
        summaryRows,
      );

      // ───────── 로그 탭: 방문당 1행 (담당자 컬럼 포함, 최신순) ─────────
      type LogEntry = {
        date: string;
        assignee: string;
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
            assignee: memberNames.get(v.user_id) ?? "알 수 없음",
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
      logEntries.sort((a, b) => b.date.localeCompare(a.date));

      const logRows: (string | number)[][] = [LOG_HEADERS];
      for (const e of logEntries) {
        logRows.push([
          format(parseISO(e.date), "yyyy-MM-dd"),
          e.assignee,
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
        org.spreadsheet_id,
        `'${logName}'!A:Z`,
      );
      await writeValues(
        { accessToken },
        org.spreadsheet_id,
        `'${logName}'!A1`,
        logRows,
      );
    }

    // 싱크 시각 업데이트 (org last_synced_at 컬럼이 없으면 무시)
    const nowIso = new Date().toISOString();

    revalidatePath("/settings");
    return {
      ok: true,
      url: org.spreadsheet_url,
      brands: brandNames,
      syncedAt: nowIso,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 캘린더에서 현재 org의 시트 연결 상태 조회
export async function getSyncStatus() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, lastSyncedAt: null };

  const orgId = await getCurrentOrgId();
  if (!orgId) return { connected: false, lastSyncedAt: null };

  const { data: org } = await supabase
    .from("organizations")
    .select("spreadsheet_id")
    .eq("id", orgId)
    .maybeSingle();

  return {
    connected: !!org?.spreadsheet_id,
    lastSyncedAt: null,
  };
}
