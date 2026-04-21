// Google OAuth refresh token으로 access token 발급
// 매 API 호출 직전에 새로 받는 게 가장 단순하고 안전함 (access token은 1시간 유효)

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getGoogleAccessToken(
  refreshToken: string,
): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID/SECRET env 변수가 설정되지 않았습니다");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google 토큰 갱신 실패: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };
  return data.access_token;
}
