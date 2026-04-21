// Google Sheets / Drive API 래퍼 (사용자 access token 사용)

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

type AuthedOpts = { accessToken: string };

async function gfetch(
  url: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google API ${res.status}: ${body}`);
  }
  return res.json();
}

// 새 스프레드시트 생성
export async function createSpreadsheet(
  { accessToken }: AuthedOpts,
  title: string,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const data = await gfetch(SHEETS_API, accessToken, {
    method: "POST",
    body: JSON.stringify({ properties: { title, locale: "ko_KR", timeZone: "Asia/Seoul" } }),
  });
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

// 시트 메타 조회 (탭 리스트 등)
export async function getSpreadsheet(
  { accessToken }: AuthedOpts,
  spreadsheetId: string,
) {
  return gfetch(`${SHEETS_API}/${spreadsheetId}`, accessToken);
}

// batchUpdate (탭 추가/삭제 등)
export async function batchUpdate(
  { accessToken }: AuthedOpts,
  spreadsheetId: string,
  requests: unknown[],
) {
  return gfetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
}

// 특정 범위 값 덮어쓰기
export async function writeValues(
  { accessToken }: AuthedOpts,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][],
) {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  return gfetch(url, accessToken, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

// 탭 전체 값 지우기
export async function clearValues(
  { accessToken }: AuthedOpts,
  spreadsheetId: string,
  range: string,
) {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  return gfetch(url, accessToken, { method: "POST" });
}
