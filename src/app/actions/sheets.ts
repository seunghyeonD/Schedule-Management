"use server";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
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

// 매장 사진 / 방문 사진 둘 다 가변 컬럼. 헤더는 함수로 빌드.
const LOG_HEADERS_BEFORE_STORE_PHOTOS = ["방문일자", "매장명"];
const LOG_HEADERS_BETWEEN_PHOTOS = [
  "지역",
  "시/군/구",
  "담당자",
  "상권 동향",
  "고객 동향",
  "진열 위치 및 동향",
  "판매 동향",
  "활동사항",
  "요청사항",
];
const STORE_PHOTO_COL_START = LOG_HEADERS_BEFORE_STORE_PHOTOS.length; // = 2

function buildLogHeaders(
  storePhotoCount: number,
  visitPhotoCount: number,
): string[] {
  const storeCols: string[] = [];
  for (let i = 0; i < storePhotoCount; i++) {
    storeCols.push(
      storePhotoCount === 1 ? "매장 사진" : `매장 사진 ${i + 1}`,
    );
  }
  const visitCols: string[] = [];
  for (let i = 0; i < visitPhotoCount; i++) {
    visitCols.push(
      visitPhotoCount === 1 ? "방문 사진" : `방문 사진 ${i + 1}`,
    );
  }
  return [
    ...LOG_HEADERS_BEFORE_STORE_PHOTOS,
    ...storeCols,
    ...LOG_HEADERS_BETWEEN_PHOTOS,
    ...visitCols,
  ];
}

function visitPhotoColStart(storePhotoCount: number): number {
  return (
    LOG_HEADERS_BEFORE_STORE_PHOTOS.length +
    storePhotoCount +
    LOG_HEADERS_BETWEEN_PHOTOS.length
  );
}

function logTabName(brandName: string) {
  return `${brandName} (로그)`;
}

function calendarTabName(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

const CALENDAR_TAB_RE = /^\d+년 \d+월$/;

const CALENDAR_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type RGB = { red: number; green: number; blue: number };
const C_RED: RGB = { red: 0.9, green: 0.27, blue: 0.27 };
const C_BLUE: RGB = { red: 0.16, green: 0.42, blue: 0.94 };
const C_GRAY: RGB = { red: 0.7, green: 0.7, blue: 0.7 };
const C_TEXT: RGB = { red: 0.2, green: 0.2, blue: 0.2 };
const C_LIGHT_BG: RGB = { red: 0.96, green: 0.96, blue: 0.96 };

type SheetCell = {
  userEnteredValue?: { stringValue: string };
  userEnteredFormat?: Record<string, unknown>;
  textFormatRuns?: { startIndex: number; format: Record<string, unknown> }[];
};
type SheetRow = { values: SheetCell[] };

// 한 달의 캘린더 그리드를 updateCells용 행 데이터로 빌드.
// 각 날짜 셀은 "날짜\n1)매장명\n…" 멀티라인 + textFormatRuns로 날짜만 굵게/색칠.
// 단일 숫자 셀이 음수로 파싱되는 USER_ENTERED 이슈를 피하려고 stringValue 사용.
function buildCalendarSheetCells(
  year: number,
  month: number,
  visitsByDate: Map<string, { storeName: string }[]>,
): { rowData: SheetRow[]; dataStartRow: number; dataEndRow: number } {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rowData: SheetRow[] = [];

  // 0행: 제목
  rowData.push({
    values: [
      {
        userEnteredValue: { stringValue: calendarTabName(year, month) },
        userEnteredFormat: {
          textFormat: { bold: true, fontSize: 16 },
          verticalAlignment: "MIDDLE",
        },
      },
      ...Array.from({ length: 6 }, () => ({}) as SheetCell),
    ],
  });

  // 1행: 여백
  rowData.push({ values: Array.from({ length: 7 }, () => ({}) as SheetCell) });

  // 2행: 요일 헤더
  rowData.push({
    values: CALENDAR_WEEKDAYS.map((w, i) => {
      const color = i === 0 ? C_RED : i === 6 ? C_BLUE : undefined;
      return {
        userEnteredValue: { stringValue: w },
        userEnteredFormat: {
          textFormat: {
            bold: true,
            ...(color ? { foregroundColor: color } : {}),
          },
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
          backgroundColor: C_LIGHT_BG,
        },
      };
    }),
  });

  // 3행~: 날짜 그리드
  const dataStartRow = 3;
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    rowData.push({
      values: week.map((day, dayIdx) => {
        const key = format(day, "yyyy-MM-dd");
        const visits = visitsByDate.get(key) ?? [];
        const dayNum = format(day, "d");
        const inThisMonth = isSameMonth(day, monthStart);
        const visitLines = visits.map((v, idx) => `${idx + 1})${v.storeName}`);
        const text = [dayNum, ...visitLines].join("\n");

        // 다른 달 = 회색, 일요일 = 빨강, 토요일 = 파랑
        const dayColor: RGB | undefined = !inThisMonth
          ? C_GRAY
          : dayIdx === 0
            ? C_RED
            : dayIdx === 6
              ? C_BLUE
              : undefined;

        // 첫 줄(날짜)만 굵게/색칠. 두번째 줄부터는 기본 스타일로 리셋.
        const textFormatRuns: SheetCell["textFormatRuns"] = [
          {
            startIndex: 0,
            format: {
              bold: true,
              fontSize: 11,
              ...(dayColor ? { foregroundColor: dayColor } : {}),
            },
          },
        ];
        if (visitLines.length > 0) {
          textFormatRuns.push({
            startIndex: dayNum.length + 1,
            format: {
              bold: false,
              fontSize: 10,
              foregroundColor: C_TEXT,
            },
          });
        }

        return {
          userEnteredValue: { stringValue: text },
          userEnteredFormat: {
            wrapStrategy: "WRAP",
            verticalAlignment: "TOP",
            horizontalAlignment: "LEFT",
            padding: { top: 4, right: 6, bottom: 4, left: 6 },
            textFormat: { fontSize: 10 },
          },
          textFormatRuns,
        };
      }),
    });
  }

  const dataEndRow = dataStartRow + Math.ceil(days.length / 7);
  return { rowData, dataStartRow, dataEndRow };
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
  tabNames: string[],
  managed: boolean,
  obsoleteTabs: string[] = [],
) {
  const meta = (await getSpreadsheet({ accessToken }, spreadsheetId)) as {
    sheets: { properties: { sheetId: number; title: string } }[];
  };
  const existing = new Map(
    meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]),
  );

  // 새 로그 탭은 월별 캘린더 탭(예: "2026년 1월") 바로 앞에 끼워 넣기.
  // 캘린더 탭이 아직 하나도 없으면 그냥 끝에 추가 (이후 동기화 시 재정렬됨).
  let nextInsertIndex: number | undefined;
  for (let i = 0; i < meta.sheets.length; i++) {
    if (CALENDAR_TAB_RE.test(meta.sheets[i].properties.title)) {
      nextInsertIndex = i;
      break;
    }
  }

  const requests: unknown[] = [];
  for (const name of tabNames) {
    if (!existing.has(name)) {
      const isCalendarTab = CALENDAR_TAB_RE.test(name);
      if (!isCalendarTab && nextInsertIndex !== undefined) {
        requests.push({
          addSheet: { properties: { title: name, index: nextInsertIndex } },
        });
        nextInsertIndex += 1;
      } else {
        requests.push({ addSheet: { properties: { title: name } } });
      }
    }
  }

  // 구식/미사용 탭 자동 정리 (예: 과거의 브랜드 요약 탭)
  for (const obsolete of obsoleteTabs) {
    const id = existing.get(obsolete);
    if (id !== undefined) {
      requests.push({ deleteSheet: { sheetId: id } });
    }
  }

  if (managed) {
    const willHaveTabs =
      tabNames.length > 0 &&
      (tabNames.some((n) => existing.has(n)) || requests.length > 0);
    if (willHaveTabs) {
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
    // 로그 탭만 생성. 과거 버전에서 만들어진 브랜드명 요약 탭이 있으면 정리.
    await syncSpreadsheetTabs(
      accessToken,
      org.spreadsheet_id,
      [logName],
      org.spreadsheet_managed ?? false,
      [name],
    );

    // 초기 헤더는 사진 컬럼 없이. 동기화 시 사진 수에 맞춰 재작성됨.
    await writeValues(
      { accessToken },
      org.spreadsheet_id,
      `'${logName}'!A1`,
      [buildLogHeaders(0, 0)],
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

    // 브랜드 요약 탭은 더 이상 만들지 않지만, 과거에 만들어진 잔존 탭이 있을 수 있어 같이 정리.
    const targetTitles = new Set([logTabName(name), name]);
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

    // org의 매장 + 지역그룹 + 브랜드 (사진 경로도 같이)
    const { data: stores, error: sErr } = await supabase
      .from("stores")
      .select(
        "id, name, sigungu, photo_paths, brand:brands(id, name), region_group:region_groups(id, name)",
      )
      .eq("organization_id", orgId);
    if (sErr) throw sErr;

    // 매장 사진 경로 → signed URL 매핑 (시트의 IMAGE 수식용, 1년 유효)
    const allStorePhotoPaths = new Set<string>();
    for (const s of (stores ?? []) as Array<{ photo_paths: string[] | null }>) {
      for (const p of s.photo_paths ?? []) {
        allStorePhotoPaths.add(p);
      }
    }
    const signedUrlByPath = new Map<string, string>();
    if (allStorePhotoPaths.size > 0) {
      const { data: urls } = await supabase.storage
        .from("store-photos")
        .createSignedUrls(
          Array.from(allStorePhotoPaths),
          60 * 60 * 24 * 365,
        );
      for (const item of urls ?? []) {
        if (item.path && item.signedUrl) {
          signedUrlByPath.set(item.path, item.signedUrl);
        }
      }
    }

    // 방문 사진 경로 → signed URL 매핑
    // (RLS는 같은 org 멤버 SELECT 허용 — migration 0015 적용 필요)

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
      requests: string | null;
      photo_paths: string[] | null;
    };
    const { data: visitData, error: vErr } = await supabase
      .from("visits")
      .select(
        "user_id, store_id, visit_date, store_position, customer_count, sales_trend, activity, display_type, requests, photo_paths",
      )
      .eq("organization_id", orgId)
      .order("visit_date");
    if (vErr) throw vErr;
    const visits: VisitRow[] = (visitData ?? []) as VisitRow[];

    // 방문 사진 경로 → signed URL 매핑 (시트의 IMAGE 수식용)
    const allVisitPhotoPaths = new Set<string>();
    for (const v of visits) {
      for (const p of v.photo_paths ?? []) {
        allVisitPhotoPaths.add(p);
      }
    }
    const signedUrlByVisitPath = new Map<string, string>();
    if (allVisitPhotoPaths.size > 0) {
      const { data: vUrls } = await supabase.storage
        .from("visit-photos")
        .createSignedUrls(
          Array.from(allVisitPhotoPaths),
          60 * 60 * 24 * 365,
        );
      for (const item of vUrls ?? []) {
        if (item.path && item.signedUrl) {
          signedUrlByVisitPath.set(item.path, item.signedUrl);
        }
      }
    }

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
      photoPaths: string[];
    };
    const byBrand = new Map<string, StoreRow[]>();
    for (const b of allBrands ?? []) {
      byBrand.set(b.name, []);
    }
    for (const s of (stores ?? []) as unknown as Array<{
      id: string;
      name: string;
      sigungu: string | null;
      photo_paths: string[] | null;
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
        photoPaths: s.photo_paths ?? [],
      });
      byBrand.set(s.brand.name, list);
    }

    if (byBrand.size === 0) {
      return { error: "등록된 브랜드가 없습니다" };
    }

    const brandNames = Array.from(byBrand.keys());
    // 로그 탭만 사용 (브랜드명 단독 요약 탭은 사용 중단)
    const allTabNames: string[] = brandNames.map((b) => logTabName(b));

    // store_id → store name 매핑 (캘린더 셀에 매장명 표기용)
    const storeNameById = new Map<string, string>();
    for (const s of (stores ?? []) as Array<{ id: string; name: string }>) {
      storeNameById.set(s.id, s.name);
    }

    // 월별 → 일자별로 방문을 그룹핑 (캘린더 탭 빌드용)
    type CalendarVisit = { storeName: string };
    const visitsByMonth = new Map<string, Map<string, CalendarVisit[]>>();
    for (const v of visits) {
      const ym = v.visit_date.substring(0, 7); // "yyyy-MM"
      let perDay = visitsByMonth.get(ym);
      if (!perDay) {
        perDay = new Map<string, CalendarVisit[]>();
        visitsByMonth.set(ym, perDay);
      }
      const arr = perDay.get(v.visit_date) ?? [];
      arr.push({ storeName: storeNameById.get(v.store_id) ?? "(삭제된 매장)" });
      perDay.set(v.visit_date, arr);
    }

    // 캘린더 탭은 방문이 있는 모든 년도(현재 년도 포함)의 1~12월 전체를 사전 생성.
    // 비어 있는 달도 빈 그리드 탭으로 미리 깔아두면 사용자가 어느 달이든 바로 열어볼 수 있음.
    const yearsSet = new Set<number>();
    for (const v of visits) {
      yearsSet.add(Number(v.visit_date.substring(0, 4)));
    }
    yearsSet.add(new Date().getFullYear());
    const yearsSorted = Array.from(yearsSet).sort((a, b) => a - b);
    const minYear = yearsSorted[0];
    const maxYear = yearsSorted[yearsSorted.length - 1];

    type MonthSlot = {
      year: number;
      month: number;
      tabName: string;
      ym: string;
    };
    const allMonths: MonthSlot[] = [];
    const calendarTabs: string[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      for (let m = 1; m <= 12; m++) {
        const tabName = calendarTabName(y, m);
        const ym = `${y}-${String(m).padStart(2, "0")}`;
        allMonths.push({ year: y, month: m, tabName, ym });
        calendarTabs.push(tabName);
      }
    }

    // 로그 탭 + 캘린더 탭만 보장. 과거의 브랜드명 요약 탭이 남아있으면 정리.
    await syncSpreadsheetTabs(
      accessToken,
      org.spreadsheet_id,
      [...allTabNames, ...calendarTabs],
      org.spreadsheet_managed ?? false,
      brandNames,
    );

    // 새로 만든 탭들의 sheetId를 알아야 캘린더 포맷팅이 가능해서 메타 재조회
    const metaAfter = (await getSpreadsheet(
      { accessToken },
      org.spreadsheet_id,
    )) as {
      sheets: { properties: { sheetId: number; title: string } }[];
    };
    const sheetIdByTitle = new Map(
      metaAfter.sheets.map((s) => [s.properties.title, s.properties.sheetId]),
    );

    // 각 브랜드 로그 탭의 데이터 행 수 + 사진 컬럼 수 (배치 차원 조정용)
    const logRowCounts = new Map<string, number>();
    const logMaxPhotos = new Map<string, number>(); // 매장 사진 컬럼 수
    const logMaxVisitPhotos = new Map<string, number>(); // 방문 사진 컬럼 수

    // 각 브랜드의 로그 탭에 방문당 1행씩 작성 (요약 탭은 사용 중단)
    for (const brandName of brandNames) {
      const storeRows = byBrand.get(brandName)!;
      storeRows.sort((a, b) => {
        return (
          a.regionGroup.localeCompare(b.regionGroup, "ko") ||
          a.sigungu.localeCompare(b.sigungu, "ko") ||
          a.storeName.localeCompare(b.storeName, "ko")
        );
      });

      // ───────── 로그 탭 빌드 ─────────
      // 매장 사진: 그 매장의 가장 이른 방문에만 표시 (이후 방문은 빈 셀)
      // 방문 사진: 방문마다 본인 사진 표시
      // 컬럼 수는 가장 많이 가진 쪽 기준
      const maxStorePhotos =
        storeRows.length > 0
          ? Math.max(0, ...storeRows.map((s) => s.photoPaths.length))
          : 0;
      const maxVisitPhotos = (() => {
        let m = 0;
        for (const s of storeRows) {
          for (const v of visitsByStore.get(s.storeId) ?? []) {
            const n = v.photo_paths?.length ?? 0;
            if (n > m) m = n;
          }
        }
        return m;
      })();
      logMaxPhotos.set(brandName, maxStorePhotos);
      logMaxVisitPhotos.set(brandName, maxVisitPhotos);

      type LogEntry = {
        date: string;
        storeName: string;
        storePhotos: string[]; // length === maxStorePhotos
        regionGroup: string;
        sigungu: string;
        assignee: string;
        storePosition: string;
        customerCount: string;
        displayType: string;
        salesTrend: string;
        activity: string;
        requests: string;
        visitPhotos: string[]; // length === maxVisitPhotos
      };

      const emptyStorePhotos: string[] = Array(maxStorePhotos).fill("");
      const logEntries: LogEntry[] = [];
      for (const s of storeRows) {
        const storeVisits = visitsByStore.get(s.storeId) ?? [];
        // 매장 사진은 첫 방문에만 — 매장 사진 IMAGE 수식 배열 (부족분 빈 문자열 패딩)
        const storePhotoFormulas: string[] = [];
        for (let i = 0; i < maxStorePhotos; i++) {
          const path = s.photoPaths[i];
          const url = path ? signedUrlByPath.get(path) : undefined;
          storePhotoFormulas.push(url ? `=IMAGE("${url}", 1)` : "");
        }

        for (let idx = 0; idx < storeVisits.length; idx++) {
          const v = storeVisits[idx];
          // 첫 방문(인덱스 0 — visitsByStore는 이미 visit_date 오름차순 정렬됨)에만 매장 사진
          const isFirstVisit = idx === 0;

          // 방문 사진 IMAGE 수식 배열 (이 방문의 사진들)
          const visitPhotoFormulas: string[] = [];
          for (let i = 0; i < maxVisitPhotos; i++) {
            const path = v.photo_paths?.[i];
            const url = path ? signedUrlByVisitPath.get(path) : undefined;
            visitPhotoFormulas.push(url ? `=IMAGE("${url}", 1)` : "");
          }

          logEntries.push({
            date: v.visit_date,
            storeName: s.storeName,
            storePhotos: isFirstVisit
              ? storePhotoFormulas
              : emptyStorePhotos,
            regionGroup: s.regionGroup,
            sigungu: s.sigungu,
            assignee: memberNames.get(v.user_id) ?? "알 수 없음",
            storePosition: v.store_position ?? "",
            customerCount: v.customer_count ?? "",
            displayType: v.display_type ?? "",
            salesTrend: v.sales_trend ?? "",
            activity: v.activity ?? "",
            requests: v.requests ?? "",
            visitPhotos: visitPhotoFormulas,
          });
        }
      }
      // 과거 → 현재 → 미래 (오름차순)
      logEntries.sort((a, b) => a.date.localeCompare(b.date));
      logRowCounts.set(brandName, logEntries.length);

      const tabHeaders = buildLogHeaders(maxStorePhotos, maxVisitPhotos);
      const logRows: (string | number)[][] = [tabHeaders];
      for (const e of logEntries) {
        logRows.push([
          format(parseISO(e.date), "yyyy-MM-dd"),
          e.storeName,
          ...e.storePhotos,
          e.regionGroup,
          e.sigungu,
          e.assignee,
          e.storePosition,
          e.customerCount,
          e.displayType,
          e.salesTrend,
          e.activity,
          e.requests,
          ...e.visitPhotos,
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

    // ───────── 월별 캘린더 탭: 사전 생성된 모든 달에 그리드 + 방문 데이터 쓰기 ─────────
    // 정렬: 브랜드/로그 탭 뒤에 시간순으로 배치.
    const calendarTabSet = new Set(calendarTabs);
    const nonCalendarCount = metaAfter.sheets.filter(
      (s) => !calendarTabSet.has(s.properties.title),
    ).length;

    const calendarBatchRequests: unknown[] = [];

    // 0) 각 브랜드 로그 탭: 기본 필터 + 매장/방문 사진 컬럼 폭/행 높이
    for (const brandName of brandNames) {
      const logName = logTabName(brandName);
      const logSheetId = sheetIdByTitle.get(logName);
      if (logSheetId === undefined) continue;

      const storePhotoCount = logMaxPhotos.get(brandName) ?? 0;
      const visitPhotoCount = logMaxVisitPhotos.get(brandName) ?? 0;
      const headerLength =
        LOG_HEADERS_BEFORE_STORE_PHOTOS.length +
        storePhotoCount +
        LOG_HEADERS_BETWEEN_PHOTOS.length +
        visitPhotoCount;

      // 기본 필터 (모든 컬럼 헤더에서 필터/정렬 가능)
      calendarBatchRequests.push({
        setBasicFilter: {
          filter: {
            range: {
              sheetId: logSheetId,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: headerLength,
            },
          },
        },
      });

      // 매장 사진 컬럼 폭
      if (storePhotoCount > 0) {
        calendarBatchRequests.push({
          updateDimensionProperties: {
            range: {
              sheetId: logSheetId,
              dimension: "COLUMNS",
              startIndex: STORE_PHOTO_COL_START,
              endIndex: STORE_PHOTO_COL_START + storePhotoCount,
            },
            properties: { pixelSize: 100 },
            fields: "pixelSize",
          },
        });
      }

      // 방문 사진 컬럼 폭
      if (visitPhotoCount > 0) {
        const start = visitPhotoColStart(storePhotoCount);
        calendarBatchRequests.push({
          updateDimensionProperties: {
            range: {
              sheetId: logSheetId,
              dimension: "COLUMNS",
              startIndex: start,
              endIndex: start + visitPhotoCount,
            },
            properties: { pixelSize: 100 },
            fields: "pixelSize",
          },
        });
      }

      // 데이터 행 높이 (사진 컬럼이 하나라도 있으면 — 썸네일 표시용)
      const dataRowCount = logRowCounts.get(brandName) ?? 0;
      const anyPhoto = storePhotoCount > 0 || visitPhotoCount > 0;
      if (dataRowCount > 0 && anyPhoto) {
        calendarBatchRequests.push({
          updateDimensionProperties: {
            range: {
              sheetId: logSheetId,
              dimension: "ROWS",
              startIndex: 1,
              endIndex: 1 + dataRowCount,
            },
            properties: { pixelSize: 80 },
            fields: "pixelSize",
          },
        });
      }
    }

    // 1) 캘린더 탭들을 시간순으로 재배치
    calendarTabs.forEach((name, idx) => {
      const sheetId = sheetIdByTitle.get(name);
      if (sheetId === undefined) return;
      calendarBatchRequests.push({
        updateSheetProperties: {
          properties: { sheetId, index: nonCalendarCount + idx },
          fields: "index",
        },
      });
    });

    // 2) 각 달 탭에 그리드 + 방문 데이터 쓰기 (방문 없는 달은 빈 그리드)
    for (const slot of allMonths) {
      const sheetId = sheetIdByTitle.get(slot.tabName);
      if (sheetId === undefined) continue;

      const perDay =
        visitsByMonth.get(slot.ym) ??
        new Map<string, { storeName: string }[]>();
      const { rowData, dataStartRow, dataEndRow } = buildCalendarSheetCells(
        slot.year,
        slot.month,
        perDay,
      );

      calendarBatchRequests.push(
        // 기존 값 + 포맷 모두 리셋 (재싱크 시 잔여 셀 정리)
        {
          updateCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 50,
              startColumnIndex: 0,
              endColumnIndex: 26,
            },
            fields: "*",
          },
        },
        // 캘린더 본문 쓰기 (값 + 포맷 + 색상 한 번에)
        {
          updateCells: {
            start: { sheetId, rowIndex: 0, columnIndex: 0 },
            rows: rowData,
            fields: "userEnteredValue,userEnteredFormat,textFormatRuns",
          },
        },
        // 제목 행 높이
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: 0,
              endIndex: 1,
            },
            properties: { pixelSize: 36 },
            fields: "pixelSize",
          },
        },
        // 날짜 행 높이
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: dataStartRow,
              endIndex: dataEndRow,
            },
            properties: { pixelSize: 90 },
            fields: "pixelSize",
          },
        },
        // 컬럼 너비
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 7,
            },
            properties: { pixelSize: 140 },
            fields: "pixelSize",
          },
        },
      );
    }

    if (calendarBatchRequests.length > 0) {
      await batchUpdate(
        { accessToken },
        org.spreadsheet_id,
        calendarBatchRequests,
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
