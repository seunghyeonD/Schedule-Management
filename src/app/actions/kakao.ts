"use server";

// Kakao Local REST API - 키워드로 장소 검색
// https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword

export type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  category_name: string;
};

type SearchResult =
  | { ok: true; documents: KakaoPlace[] }
  | { ok: false; error: string };

export async function searchPlacesByKeyword(
  query: string,
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { ok: true, documents: [] };

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return {
      ok: false,
      error:
        "KAKAO_REST_API_KEY 환경변수가 없습니다. .env.local에 Kakao REST API 키를 추가하세요.",
    };
  }

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
    q,
  )}&size=10`;

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${key}`,
        KA: `sdk/rest os/server lang/ko-KR origin/${origin}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `Kakao API ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json()) as { documents: KakaoPlace[] };
    return { ok: true, documents: json.documents };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
