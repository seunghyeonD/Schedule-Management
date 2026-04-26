import Link from "next/link";

export const metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-sm leading-7 text-neutral-800">
      <header className="mb-8">
        <Link
          href="/"
          className="text-xs text-neutral-500 hover:text-neutral-900"
        >
          ← 돌아가기
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          개인정보처리방침
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          공고일: 2026년 4월 21일 · 최종 개정일: 2026년 4월 27일 · 시행일:
          2026년 4월 27일
        </p>
      </header>

      <section className="space-y-8">
        <article>
          <p>
            &ldquo;일정 관리&rdquo; 서비스(이하 &ldquo;서비스&rdquo;)의 운영자
            동승현(이하 &ldquo;운영자&rdquo;)은 「개인정보 보호법」 제30조에
            따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고
            원활하게 처리할 수 있도록 하기 위하여 다음과 같이
            개인정보처리방침을 수립·공개합니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            1. 개인정보의 처리 목적
          </h2>
          <p className="mt-2">
            운영자는 개인정보를 다음의 목적을 위하여 처리합니다. 처리 중인
            개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이
            변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를
            받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>회원 식별, 로그인 상태 유지, 본인 확인</li>
            <li>매장·방문 기록의 저장 및 Google Sheets/Drive로의 동기화</li>
            <li>
              기업(워크스페이스) 단위 협업 기능 제공 — 같은 기업 소속 회원 간
              매장·방문 정보의 공유, 마스터 회원의 팀 활동 통계 조회, 초대
              코드를 통한 멤버 관리
            </li>
            <li>서비스 제공·운영에 관한 공지 및 문의 대응</li>
            <li>부정 이용 방지, 비인가 접속 차단, 서비스 안정성 확보</li>
            <li>서비스 개선을 위한 통계 분석 (비식별 정보에 한함)</li>
          </ul>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            2. 처리하는 개인정보의 항목
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    구분
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    수집 시점
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    수집 항목
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    필수/선택
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    로그인
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    Google OAuth 로그인 시
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    이메일 주소, 이름, Google 계정 고유 식별자(sub), 프로필
                    이미지 URL
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">필수</td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    Google 연동
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    스프레드시트 권한 부여 시
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    Google OAuth access token, refresh token, 사용자가 연결한
                    스프레드시트 ID·URL
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">선택</td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    서비스 이용
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원이 직접 입력
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    브랜드명, 매장명, 매장 주소(도로명·지번), 시·도, 시·군·구,
                    지역 그룹, 위·경도(선택), 방문 일자, 방문 메모(매장 입점
                    위치, 유입 고객수, 판매 동향, 활동사항, 진열 형태), 방문
                    사진(이미지 파일)
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    서비스 이용상 필요
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    기업(워크스페이스) 정보
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    기업 생성·가입 시
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    기업명, 회원의 기업 내 역할(마스터/멤버), 가입 일시, 초대
                    코드 발급·사용 기록
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">필수</td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    자동 생성
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    서비스 이용 과정
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    접속 일시, 접속 기기 정보(브라우저 UA), IP 주소, 서비스
                    이용 기록, 약관·개인정보 동의 일시
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    자동 수집
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            ※ 운영자는 주민등록번호, 여권번호, 운전면허번호, 외국인등록번호,
            신용카드번호, 계좌번호, 민감정보(사상·신념, 건강·성생활 등)를
            수집하지 않습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            3. 개인정보의 수집 방법
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Google OAuth 2.0 인증 과정에서 회원의 동의를 받아 수집</li>
            <li>회원이 서비스 내 폼에 직접 입력·저장</li>
            <li>서비스 이용 과정에서 웹서버 로그 및 쿠키에 의한 자동 수집</li>
          </ul>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            4. 개인정보의 처리 및 보유 기간
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    항목
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    보유 기간
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    근거
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원 정보(이메일, 이름, 식별자)
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원 탈퇴 시 지체 없이 파기
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    정보주체의 동의
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    Google OAuth refresh token / access token
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원이 권한을 회수하거나 탈퇴한 즉시 파기
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    정보주체의 동의
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    매장·방문 기록·방문 사진
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원 탈퇴, 회원의 삭제 요청, 또는 마스터의 기업 삭제 시 지체
                    없이 파기
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    정보주체의 동의
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    기업·멤버십·초대 코드 정보
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    멤버 탈퇴 시 멤버십 정보 파기, 마스터의 기업 삭제 시 기업
                    전체 정보 파기, 초대 코드는 만료 후(7일) 또는 사용 즉시 파기
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    정보주체의 동의
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    접속 로그, IP, 이용 기록
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">3개월</td>
                  <td className="border border-neutral-300 px-3 py-2">
                    「통신비밀보호법」
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    약관·개인정보 동의 기록
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원 탈퇴 후 5년
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    전자상거래법 (분쟁 증빙)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            5. 개인정보의 제3자 제공
          </h2>
          <p className="mt-2">
            운영자는 정보주체의 별도 동의, 법률의 특별한 규정 등
            「개인정보 보호법」 제17조 및 제18조에 해당하는 경우 외에는
            개인정보를 제3자에게 제공하지 않습니다.
          </p>
          <p className="mt-2">
            Google Sheets/Drive 연동은 회원이 본인 Google 계정에 대한 접근
            권한을 명시적으로 허용한 경우에만 작동하며, 이 경우에도 데이터는
            회원 본인의 Google Drive로만 전송됩니다. 운영자는 회원의 콘텐츠를
            운영자 외 제3자에게 제공하거나 판매하지 않습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            5-1. 기업(워크스페이스) 단위 데이터 공유
          </h2>
          <p className="mt-2">
            본 서비스는 영업 팀 단위 협업을 위해 &ldquo;기업&rdquo;
            (워크스페이스) 개념을 제공합니다. 회원이 특정 기업의 마스터로
            기업을 생성하거나, 마스터로부터 발급받은 초대 코드를 입력하여
            기업의 멤버로 가입하는 경우, 동일 기업에 소속된 회원 간에는
            서비스의 정상적 제공을 위하여 다음 정보가 상호 노출됩니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>같은 기업의 모든 회원에게 공유되는 정보</strong>: 회원의
              표시 이름(display name), 이메일, 기업 내 역할(마스터/멤버), 가입
              일시
            </li>
            <li>
              <strong>같은 기업의 모든 회원에게 공유되는 콘텐츠</strong>:
              브랜드, 매장(매장명·주소·지역 그룹·위경도 포함), 방문 기록(방문
              일자, 방문 메모 5개 항목, 첨부 사진), 방문을 등록한 회원의 식별
              정보(담당자 표시)
            </li>
            <li>
              <strong>마스터에게만 공유되는 정보</strong>: 멤버 목록 및 강제
              퇴출 권한, 초대 코드 발급·폐기 권한, Google 스프레드시트 연결·
              동기화 권한 (마스터의 Google Drive로 전송)
            </li>
          </ul>
          <p className="mt-2 text-xs">
            이 공유는 「개인정보 보호법」 제17조에서 정한 &ldquo;제3자
            제공&rdquo;에 해당하지 않으며, 서비스 이용계약의 본질적인 구성요소로
            제공됩니다. 회원이 자신의 정보가 다른 회원에게 노출되는 것을 원하지
            않을 경우, 해당 기업에서 탈퇴하거나 가입하지 않음으로써 공유 범위를
            통제할 수 있습니다.
          </p>
          <p className="mt-2 text-xs">
            마스터가 Google 스프레드시트 동기화 기능을 활성화한 경우, 같은 기업
            소속 멤버의 방문 기록(작성자 표시 포함)은 마스터의 Google Drive로
            전송됩니다. 회원은 본 사실에 동의한 경우에 한하여 해당 기업에 가입할
            수 있습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            6. 개인정보 처리의 위탁
          </h2>
          <p className="mt-2">
            운영자는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리
            업무를 외부에 위탁하고 있으며, 위탁 계약 또는 해당 서비스의 약관에
            따라 수탁자가 관계 법령을 위반하지 않도록 관리·감독합니다.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    수탁자
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    위탁 업무
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    보유·이용기간
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    Supabase, Inc.
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    데이터베이스(PostgreSQL), 인증(Auth), 세션 관리 인프라
                    운영
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    위탁계약 종료 또는 회원 탈퇴 시까지
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    Vercel, Inc.
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    애플리케이션 호스팅, CDN, 서버리스 함수 실행
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    위탁계약 종료 또는 회원 탈퇴 시까지
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    Google LLC
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    OAuth 2.0 인증, Google Sheets/Drive API 제공
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원이 권한을 회수하거나 탈퇴 시까지
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            7. 개인정보의 국외 이전
          </h2>
          <p className="mt-2">
            「개인정보 보호법」 제28조의8에 따라 개인정보 국외 이전 관련 사항을
            다음과 같이 안내합니다.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    이전 항목
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    이전받는 자
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    이전 국가 / 일시·방법
                  </th>
                  <th className="border border-neutral-300 px-3 py-2 text-left">
                    이용 목적 / 보유기간
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    회원 식별정보, 서비스 데이터 전부
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    Supabase, Inc. <br />
                    (privacy@supabase.io)
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    대한민국 서울 리전(ap-northeast-2)에 저장. 단, 운영 지원 및
                    장애 대응 목적으로 미국 소재 Supabase 인력이 원격 접근할 수
                    있음. 서비스 이용 시마다 수시 전송(TLS 암호화).
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    인프라 운영 / 위탁계약 종료 또는 회원 탈퇴 시까지
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    접속 로그, 요청 메타데이터
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    Vercel, Inc. <br />
                    (privacy@vercel.com)
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    미국 및 Vercel이 운영하는 전 세계 Edge 네트워크. 서비스
                    이용 시마다 수시 전송(TLS 암호화).
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    호스팅·CDN 제공 / 위탁계약 종료 또는 회원 탈퇴 시까지
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-3 py-2">
                    OAuth 인증정보, 스프레드시트 요청 데이터
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    Google LLC <br />
                    (support-deletion@google.com)
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    미국 및 Google이 운영하는 전 세계 데이터센터. API 호출
                    시점마다 수시 전송(TLS 암호화).
                  </td>
                  <td className="border border-neutral-300 px-3 py-2">
                    OAuth 인증 및 Google API 제공 / 회원이 권한을 회수하거나
                    탈퇴 시까지
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs">
            회원은 「개인정보 보호법」 제28조의8 제5항에 따라 국외 이전에 대한
            거부권을 행사할 수 있습니다. 다만, 본 이전은 서비스 제공에 필수적인
            항목이므로 거부 시 서비스 이용이 제한될 수 있습니다. 거부를 희망할
            경우 <strong>dww7541@gmail.com</strong>으로 요청해 주시기 바랍니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            8. 정보주체와 법정대리인의 권리·의무 및 행사 방법
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>정보주체는 운영자에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리 정지 요구</li>
                <li>개인정보 이동(반출) 요구</li>
              </ul>
            </li>
            <li>권리 행사는 서비스 설정 화면의 해당 기능을 이용하거나, <strong>dww7541@gmail.com</strong>으로 서면, 전자우편 등을 통하여 하실 수 있으며 운영자는 이에 대해 지체 없이 조치하겠습니다.</li>
            <li>만 14세 미만 아동에 대해서는 서비스를 제공하지 않으며, 수집도 하지 않습니다.</li>
            <li>정보주체가 개인정보의 오류에 대한 정정을 요청한 경우 정정을 완료하기 전까지 해당 개인정보를 이용하거나 제공하지 않습니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            9. 개인정보의 파기
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.</li>
            <li>파기 절차: 파기 대상 개인정보를 선정하고, 운영자의 승인을 받아 파기합니다.</li>
            <li>파기 방법
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>전자적 파일 형태: 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
                <li>출력물 등: 분쇄 또는 소각 (해당 사항 발생 시)</li>
              </ul>
            </li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            10. 개인정보의 안전성 확보 조치
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>관리적 조치: 개인정보 접근 권한의 최소화, 접근 기록 보관</li>
            <li>기술적 조치:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>전송 구간 HTTPS/TLS 암호화</li>
                <li>Google OAuth refresh token의 서버 측 보관 및 클라이언트 미노출</li>
                <li>Supabase Row Level Security(RLS)를 통한 이용자별·기업별 데이터 격리. 회원은 본인이 소속된 기업의 데이터만 조회·수정할 수 있으며, 다른 기업의 데이터에는 접근 불가</li>
                <li>방문 사진은 비공개(private) Storage 버킷에 저장되며 서명된 URL(signed URL)을 통해서만 일시적으로 접근 가능</li>
                <li>업로드 파일에 대한 MIME 타입 화이트리스트(jpg/png/webp/heic) 및 용량 제한(10MB) 적용</li>
                <li>비정상 접근 시도 차단 및 접근 로그 모니터링</li>
                <li>보안 패치 및 의존성 업데이트의 지속적 적용</li>
              </ul>
            </li>
            <li>물리적 조치: 인프라 제공자(Supabase, Vercel, Google)의 데이터센터 물리 보안 정책을 신뢰·준용</li>
          </ul>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            11. 쿠키의 설치·운영 및 거부
          </h2>
          <p className="mt-2">
            운영자는 로그인 상태 유지, 보안, 서비스 제공을 위하여 쿠키(Cookie) 및
            이와 유사한 기술(세션 스토리지 등)을 사용합니다. 회원은 다음과 같이
            쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만, 쿠키 저장을 거부할
            경우 로그인 상태 유지 등 서비스 이용에 제한이 발생합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Chrome</strong>: 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터</li>
            <li><strong>Safari</strong>: 환경설정 → 개인정보 보호 → 쿠키 및 웹 사이트 데이터</li>
            <li><strong>Edge</strong>: 설정 → 쿠키 및 사이트 권한 → 쿠키 및 사이트 데이터 관리 및 삭제</li>
            <li><strong>Firefox</strong>: 설정 → 개인정보 및 보안 → 쿠키와 사이트 데이터</li>
          </ul>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            12. 가명정보 처리에 관한 사항
          </h2>
          <p className="mt-2">
            운영자는 현재 가명정보를 처리하지 않습니다. 향후 가명정보를
            처리하게 될 경우 본 방침을 개정하여 공지합니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            13. 14세 미만 아동의 개인정보 처리
          </h2>
          <p className="mt-2">
            운영자는 만 14세 미만 아동의 회원 가입을 허용하지 않으며, 관련
            개인정보를 수집·이용하지 않습니다. 만 14세 미만임이 확인된 경우
            해당 회원의 계정 및 관련 개인정보는 지체 없이 파기됩니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            14. Google API 서비스 사용자 데이터 정책 준수
          </h2>
          <p className="mt-2">
            본 서비스의 Google API 서비스에서 받은 정보의 사용 및 해당 정보의
            다른 앱으로의 전송은 <strong>Google API Services User Data
            Policy</strong>를 준수하며, 여기에는 <strong>Limited Use</strong>{" "}
            요구사항이 포함됩니다. 구체적으로:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Google Sheets 및 Drive 범위로 받은 데이터는 회원에게 사용자 대면 기능을 제공하기 위한 목적으로만 사용합니다.</li>
            <li>해당 데이터를 광고 또는 광고 맞춤화를 위한 목적으로 이전·판매하지 않습니다.</li>
            <li>해당 데이터를 인간이 열람(모델 학습 등)하지 않으며, 다음 각 목의 경우에만 예외적으로 접근합니다: 정보주체의 명시적 동의를 받은 경우, 보안 또는 법규 준수를 위해 불가피한 경우, 익명화·집계 처리되어 내부적으로 이용되는 경우.</li>
          </ul>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            15. 개인정보 보호책임자
          </h2>
          <p className="mt-2">
            운영자는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
            처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
            같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>성명: 동승현</li>
            <li>직위: 서비스 운영자 (개인 운영)</li>
            <li>이메일: dww7541@gmail.com</li>
          </ul>
          <p className="mt-2 text-xs">
            정보주체는 서비스를 이용하면서 발생한 모든 개인정보 보호 관련
            문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게
            문의할 수 있습니다. 운영자는 정보주체의 문의에 대해 지체 없이
            답변·처리합니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            16. 권익침해 구제 방법
          </h2>
          <p className="mt-2">
            정보주체는 개인정보 침해에 따른 권리 침해의 구제를 위하여 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>개인정보분쟁조정위원회: (국번 없이) 1833-6972 / www.kopico.go.kr</li>
            <li>개인정보침해신고센터(KISA): (국번 없이) 118 / privacy.kisa.or.kr</li>
            <li>대검찰청 사이버수사과: (국번 없이) 1301 / www.spo.go.kr</li>
            <li>경찰청 사이버수사국: (국번 없이) 182 / ecrm.cyber.go.kr</li>
          </ul>
          <p className="mt-2 text-xs">
            「개인정보 보호법」 제35조(개인정보의 열람), 제36조(개인정보의 정정·삭제), 제37조(개인정보의 처리정지 등)의 규정에 의한 요구에 대하여 공공기관의 장이 행한 처분 또는 부작위로 인하여 권리 또는 이익의 침해를 받은 자는 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있습니다. 행정심판에 관한 자세한 사항은 중앙행정심판위원회(www.simpan.go.kr)를 참고하시기 바랍니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            17. 영상정보처리기기의 설치·운영
          </h2>
          <p className="mt-2">
            운영자는 영상정보처리기기(CCTV 등)를 설치·운영하지 않습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            18. 개인정보처리방침의 변경
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>본 개인정보처리방침은 2026년 4월 27일부터 시행됩니다.</li>
            <li>법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 시행 전 <strong>최소 7일 전(중대한 변경의 경우 30일 전)</strong>부터 서비스 공지사항을 통해 고지합니다.</li>
            <li>중대한 변경(처리 목적 추가, 처리 항목 추가, 제3자 제공 추가, 기업 단위 데이터 공유 범위의 변경 등)의 경우 회원의 재동의를 요구할 수 있습니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            19. 개정 이력
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>2026-04-21: 최초 제정 및 시행</li>
            <li>
              2026-04-27: 멀티 테넌트(기업/워크스페이스) 기능 도입에 따른 개정 —
              §1(처리 목적), §2(처리 항목), §4(보유 기간), §5-1(기업 단위 데이터
              공유) 신설, §10(안전성 확보) 보강
            </li>
          </ul>
        </article>
      </section>
    </main>
  );
}
