// Kakao가 돌려주는 address_name은 "경기 군포시 번영로 504" 형태로 시/도가 축약되어 있음.
// 우리 region_mappings 테이블은 "경기도", "서울특별시" 풀네임을 기준으로 하므로 정규화 필요.

const SIDO_ABBREV_TO_FULL: Record<string, string> = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
};

// "경기 군포시 산본동 ..." → { sido: "경기도", sigungu: "군포시" }
// 이미 풀네임("경기도 군포시 ...")으로 오는 경우도 처리.
export function parseSidoSigungu(addressName: string): {
  sido: string;
  sigungu: string;
} {
  const tokens = addressName.trim().split(/\s+/);
  if (tokens.length < 2) return { sido: "", sigungu: "" };

  const first = tokens[0];
  const second = tokens[1];

  const sido = SIDO_ABBREV_TO_FULL[first] ?? first;
  return { sido, sigungu: second };
}
