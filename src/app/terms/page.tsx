import Link from "next/link";

export const metadata = { title: "서비스 이용약관" };

export default function TermsPage() {
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
          서비스 이용약관
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          공고일: 2026년 4월 21일 · 최종 개정일: 2026년 4월 27일 · 시행일:
          2026년 4월 27일
        </p>
      </header>

      <section className="space-y-8">
        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제1조 (목적)
          </h2>
          <p className="mt-2">
            본 약관은 비영리·개인 운영 형태로 제공되는 웹 서비스
            &ldquo;일정 관리&rdquo;(이하 &ldquo;서비스&rdquo;)의 이용 조건 및
            절차, 서비스 운영자(이하 &ldquo;운영자&rdquo;)와 이용자(이하
            &ldquo;회원&rdquo;)의 권리·의무 및 책임사항, 기타 필요한 사항을
            규정함을 목적으로 합니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제2조 (용어의 정의)
          </h2>
          <p className="mt-2">본 약관에서 사용하는 용어의 뜻은 다음과 같습니다.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>&ldquo;서비스&rdquo;: 영업 방문 일정의 등록·조회·관리 및 Google Sheets/Drive 연동을 제공하는 웹 기반 도구.</li>
            <li>&ldquo;회원&rdquo;: 본 약관 및 개인정보처리방침에 동의하고 Google 계정으로 인증을 완료한 자.</li>
            <li>&ldquo;계정&rdquo;: 회원 식별을 위해 연결된 Google 계정 및 그로부터 파생된 서비스 내 고유 식별자.</li>
            <li>&ldquo;콘텐츠&rdquo;: 회원이 서비스 내에 입력·업로드·생성한 매장 정보, 방문 기록, 방문 메모, 첨부 사진, 지역 설정 등 일체의 데이터.</li>
            <li>&ldquo;기업(워크스페이스)&rdquo;: 영업 팀 단위 협업을 위해 회원이 생성하거나 가입할 수 있는 데이터 격리 단위. 한 회원은 복수의 기업에 동시에 소속될 수 있습니다.</li>
            <li>&ldquo;마스터&rdquo;: 기업을 생성한 회원 또는 마스터 권한을 보유한 회원으로서, 기업의 멤버 관리(초대·강제 퇴출), 초대 코드 발급·폐기, Google 스프레드시트 연결·동기화, 기업 삭제 권한을 가집니다.</li>
            <li>&ldquo;멤버&rdquo;: 마스터의 초대로 기업에 가입한 회원으로서, 해당 기업의 매장·방문 데이터를 조회하고 본인의 방문 기록을 등록·수정·삭제할 수 있습니다.</li>
            <li>&ldquo;초대 코드&rdquo;: 마스터가 발급하는 6자리 영문·숫자 조합으로 7일간 유효하며, 1회 사용 시 즉시 소멸합니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제3조 (운영자의 표시)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>운영자: 동승현 (개인 운영, 사업자 등록 없음)</li>
            <li>연락처: dww7541@gmail.com</li>
            <li>서비스 성격: 비영리 개인 운영 도구</li>
          </ul>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제4조 (약관의 게시와 개정)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자는 본 약관을 회원이 쉽게 알 수 있도록 서비스 초기 화면 또는 연결 화면을 통해 게시합니다.</li>
            <li>운영자는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
            <li>운영자가 약관을 개정할 경우 적용일자 및 개정사유를 명시하여 현행 약관과 함께 적용일자 <strong>7일 전</strong>부터 공지합니다. 다만, 회원에게 불리하거나 중대한 사항의 변경은 적용일자 <strong>30일 전</strong>부터 공지합니다.</li>
            <li>회원은 개정 약관에 동의하지 않을 경우 이용계약을 해지할 수 있으며, 운영자가 공지 시 명시한 기간 내에 거부 의사를 밝히지 않은 경우 개정 약관에 동의한 것으로 간주합니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제5조 (약관 외 준칙)
          </h2>
          <p className="mt-2">
            본 약관에 명시되지 않은 사항은 「약관의 규제에 관한 법률」,
            「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한
            법률」 등 관계 법령 및 일반 상관례에 따릅니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제6조 (이용계약의 체결 및 성립)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>이용계약은 이용 희망자가 본 약관 및 개인정보처리방침에 동의한 후 Google OAuth 인증을 완료하고 최초 동의 화면에서 &ldquo;동의하고 시작하기&rdquo;를 선택함으로써 성립합니다.</li>
            <li>운영자는 다음 각 호에 해당하는 경우 이용계약의 성립을 거절하거나 사후 해지할 수 있습니다.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>타인의 명의·계정을 도용한 경우</li>
                <li>허위 정보를 기재하거나 운영자가 제시하는 내용을 기재하지 않은 경우</li>
                <li>사회의 안녕과 질서, 미풍양속을 저해할 목적으로 신청한 경우</li>
                <li>서비스의 정상적 제공을 저해하는 행위를 한 경우</li>
              </ul>
            </li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제7조 (이용자 자격)
          </h2>
          <p className="mt-2">
            서비스는 만 14세 이상인 자에 한하여 이용할 수 있습니다.
            운영자는 만 14세 미만 아동의 개인정보를 수집하지 않으며,
            만 14세 미만임이 확인된 회원의 계정 및 관련 데이터는 지체 없이 삭제됩니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제8조 (회원정보의 변경 및 관리)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>회원은 Google 계정 정책에 따라 자신의 프로필 정보를 관리하며, 변경 시 서비스 내 해당 정보는 다음 로그인 시점에 갱신됩니다.</li>
            <li>회원은 자신의 계정을 타인에게 양도·대여하거나 공유할 수 없습니다. 이로 인해 발생한 손해에 대한 책임은 회원에게 있습니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제9조 (회원에 대한 통지)
          </h2>
          <p className="mt-2">
            운영자는 회원에게 통지해야 할 경우 회원이 등록한 이메일,
            서비스 내 공지사항 또는 알림 기능을 통해 통지할 수 있습니다.
            전체 회원에 대한 통지는 서비스 공지사항에 7일 이상 게시함으로써 개별 통지에 갈음할 수 있습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제10조 (서비스의 제공)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자는 회원에게 다음 각 호의 기능을 제공합니다.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>매장(점포) 등록·수정·삭제</li>
                <li>방문 일정의 등록·조회·수정·삭제 및 방문 메모(매장 입점 위치, 유입 고객수, 판매 동향, 활동사항, 진열 형태)·사진의 첨부</li>
                <li>지역 그룹 자동 매칭 및 브랜드별 분류</li>
                <li>기업(워크스페이스)의 생성·가입·전환·탈퇴·삭제</li>
                <li>마스터의 초대 코드 발급·폐기 및 멤버 관리(강제 퇴출 포함)</li>
                <li>Google Sheets로의 기록 동기화 (마스터에 한하여 권한 부여 시)</li>
                <li>Google Drive에 앱이 생성하거나 회원이 선택한 스프레드시트에 한한 접근</li>
              </ul>
            </li>
            <li>운영자는 서비스의 기능을 수시로 개선·추가·변경할 수 있으며, 변경 내용이 중요한 경우 사전 공지합니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제10조의2 (기업의 운영)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              회원은 본인이 마스터로 기업을 직접 생성하거나, 다른 마스터로부터
              발급받은 초대 코드를 입력하여 기업의 멤버로 가입할 수 있습니다.
              한 회원은 복수의 기업에 소속될 수 있으며, 서비스 내에서 활성
              기업을 자유롭게 전환할 수 있습니다.
            </li>
            <li>
              <strong>마스터의 권한 및 책임</strong>:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  마스터는 자신의 기업에 등록된 모든 매장·방문·사진 데이터에
                  접근할 수 있으며, 본인이 작성하지 않은 데이터에 대한 조회
                  권한을 가집니다.
                </li>
                <li>
                  마스터는 초대 코드를 발급·폐기할 책임을 지며, 초대 코드의
                  유출·오용으로 인한 결과에 대한 1차적 관리 책임을 부담합니다.
                </li>
                <li>
                  마스터는 기업 내 멤버를 강제 퇴출할 수 있으나, 이로 인해 해당
                  멤버가 작성한 방문 기록 자체는 데이터 정합성을 위해 즉시
                  삭제되지 않을 수 있습니다.
                </li>
                <li>
                  마스터는 자신의 Google Drive에 생성된 스프레드시트에 멤버의
                  방문 기록(작성자 식별 정보 포함)이 동기화됨을 인지하고
                  관리하여야 합니다.
                </li>
                <li>
                  마스터가 기업을 삭제하는 경우, 해당 기업에 속한 모든
                  매장·방문·사진·멤버십·초대 코드 데이터가 즉시 그리고 영구히
                  삭제되며, 이는 복구할 수 없습니다. 마스터는 본 결과를 충분히
                  인지한 상태에서만 삭제 권한을 행사하여야 합니다.
                </li>
              </ul>
            </li>
            <li>
              <strong>멤버의 권한 및 책임</strong>:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  멤버는 자신이 가입한 기업의 매장 목록을 조회하고, 본인 명의의
                  방문 기록을 등록·수정·삭제할 수 있습니다. 다른 멤버가 작성한
                  방문 기록은 조회는 가능하나 수정·삭제는 할 수 없습니다.
                </li>
                <li>
                  멤버는 본인의 방문 기록 및 첨부 정보가 같은 기업의 다른 회원과
                  마스터의 Google 스프레드시트에 공유됨을 사전에 인지하고
                  동의하여야 합니다.
                </li>
                <li>
                  멤버는 언제든지 기업에서 자진 탈퇴할 수 있으나, 이미 작성한
                  방문 기록은 데이터 정합성 및 마스터의 운영 필요에 따라 그대로
                  유지될 수 있습니다.
                </li>
              </ul>
            </li>
            <li>
              회원은 본인이 권한 없이 다른 회원의 콘텐츠를 변경·삭제하거나, 같은
              기업 내에서 알게 된 정보를 그 기업의 운영 목적 외로 이용해서는 안
              됩니다.
            </li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제11조 (서비스 제공의 중단)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자는 다음 각 호의 경우 서비스 제공을 일시적으로 중단할 수 있습니다.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>설비의 보수·점검·교체·고장, 통신 두절 등 운영상 상당한 이유가 있는 경우</li>
                <li>클라우드 인프라(Supabase, Vercel, Google 등) 제공자의 장애가 발생한 경우</li>
                <li>천재지변, 국가비상사태, 전시 등 불가항력적 사유가 발생한 경우</li>
              </ul>
            </li>
            <li>운영자는 본 조에 따른 중단 시 사전에 회원에게 통지합니다. 다만, 사전 통지가 불가능한 긴급한 사정이 있는 경우 사후에 통지할 수 있습니다.</li>
            <li>운영자는 본 서비스를 무상으로 제공하므로, 제공 중단으로 인해 회원이 입은 손해에 대해 「민법」 등 법령에 의해 고의 또는 중과실이 인정되지 않는 한 배상책임을 지지 않습니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제12조 (서비스의 변경 및 종료)
          </h2>
          <p className="mt-2">
            운영자는 상당한 이유가 있는 경우 운영상·기술상의 필요에 따라 제공하고 있는 전부 또는 일부 서비스를 변경하거나 종료할 수 있으며, 서비스를 종료할 경우 최소 30일 전에 공지합니다. 종료 시점까지 회원은 자신의 데이터를 직접 내보낼 수 있도록 안내됩니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제13조 (회원의 의무)
          </h2>
          <p className="mt-2">회원은 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>타인의 개인정보·계정을 도용하거나 부정 사용하는 행위</li>
            <li>운영자 또는 제3자의 지식재산권을 침해하는 행위</li>
            <li>서비스의 운영을 고의로 방해하거나 서비스에 장애를 일으키는 행위</li>
            <li>비정상적인 방법(자동화 스크립트, 리버스 엔지니어링, 취약점 악용 등)으로 서비스에 접근하거나 데이터를 수집·가공·배포하는 행위</li>
            <li>음란물, 폭력물, 불법 정보, 범죄와 결부된 정보 등 관련 법령에 위반되는 정보를 게시·저장·전송하는 행위</li>
            <li>운영자의 명시적 사전 동의 없이 서비스를 영리 목적으로 이용하거나 제3자에게 재판매·배포하는 행위</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제14조 (운영자의 의무)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자는 관련 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 지속적이고 안정적인 서비스 제공을 위해 합리적인 범위에서 노력을 다합니다.</li>
            <li>운영자는 회원의 개인정보를 본인의 동의 없이 제3자에게 누설·배포하지 않으며, 「개인정보 보호법」 등 관련 법령에 따라 개인정보를 보호하기 위해 노력합니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제15조 (개인정보 보호)
          </h2>
          <p className="mt-2">
            회원의 개인정보 처리에 관한 사항은 별도의 &ldquo;개인정보처리방침&rdquo;에 따릅니다. 회원은 서비스 이용 전에 반드시 개인정보처리방침의 내용을 확인하여야 합니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제16조 (콘텐츠의 권리)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>회원이 서비스에 등록·업로드한 콘텐츠(매장 정보, 방문 기록, 메모, 사진 등)에 대한 권리는 회원에게 귀속합니다.</li>
            <li>회원은 운영자가 서비스 제공·유지를 위한 목적으로만 콘텐츠를 저장·표시·처리하는 것에 동의합니다. 운영자는 해당 콘텐츠를 회원의 사전 동의 없이 제3자에게 공개하거나 목적 외로 이용하지 않습니다.</li>
            <li>회원이 기업(워크스페이스)에 가입하여 콘텐츠를 등록하는 경우, 해당 콘텐츠는 같은 기업에 소속된 다른 회원 및 마스터에게 서비스 제공의 본질적 범위 내에서 공유됨에 동의합니다. 본 공유는 「개인정보 보호법」상 제3자 제공이 아닌 서비스 운영의 본질적 절차에 해당합니다. 자세한 공유 범위는 개인정보처리방침 §5-1을 따릅니다.</li>
            <li>Google Sheets로 동기화된 파일은 마스터의 Google Drive에 저장되며, 해당 파일에 대한 모든 권리와 관리 책임은 해당 파일을 보유한 마스터에게 있습니다. 운영자는 마스터의 Google Drive에 저장된 파일에 대한 일체의 책임을 지지 않습니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제17조 (계약의 해지 및 이용제한)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>회원은 언제든지 서비스 설정 화면의 해지 기능 또는 운영자 이메일을 통해 이용계약의 해지를 요청할 수 있습니다.</li>
            <li>회원이 제13조에 규정한 금지행위를 한 경우, 운영자는 사전 경고 없이 해당 회원의 이용을 제한하거나 이용계약을 해지할 수 있습니다.</li>
            <li>이용계약이 해지되는 경우, 운영자는 관계 법령이 정한 보관 기간을 제외하고 회원의 개인정보 및 서비스 데이터를 지체 없이 파기합니다. 다만, 회원이 본인이 마스터로 운영하는 기업이 있는 경우, 해당 기업의 다른 멤버와의 협업 관계 정리(기업 삭제 또는 마스터 위임)를 사전에 마쳐야 하며, 정리 없이 회원 탈퇴 시 운영자는 해당 기업을 직권으로 삭제할 수 있습니다.</li>
            <li>마스터의 기업 삭제 또는 운영자에 의한 직권 삭제가 발생한 경우, 해당 기업에 속한 모든 매장·방문·사진 데이터 및 다른 멤버의 가입 정보가 즉시 영구 삭제됩니다. 회원 본인의 Google Drive에 저장된 스프레드시트 파일은 운영자가 임의로 삭제하지 않습니다.</li>
            <li>멤버가 기업에서 자진 탈퇴하는 경우 본인의 멤버십 정보는 즉시 삭제되나, 데이터 정합성 및 기업 운영 필요를 고려하여 본인이 작성한 방문 기록은 즉시 삭제되지 않을 수 있습니다. 회원이 자신의 방문 기록의 삭제를 원할 경우 탈퇴 전 직접 삭제하거나 마스터에게 요청하여야 합니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제18조 (책임의 제한 및 면책)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자는 본 서비스를 &ldquo;있는 그대로(AS-IS)&rdquo; 제공하며, 서비스의 특정 목적 적합성·무결성·정확성에 대해 어떠한 묵시적 보증도 하지 않습니다.</li>
            <li>운영자는 천재지변, 불가항력, 제3자의 서비스(Supabase, Vercel, Google 등) 장애, 회원의 고의·과실로 인한 손해에 대해 책임을 지지 않습니다.</li>
            <li>운영자는 회원이 Google Sheets에 직접 수정·편집한 내용의 정합성 또는 이로 인해 발생한 손해에 대해 책임을 지지 않습니다.</li>
            <li>운영자는 회원 상호 간 또는 회원과 제3자 간에 서비스를 매개로 하여 발생한 분쟁에 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.</li>
            <li>본 서비스가 비영리로 무상 제공되는 점을 고려하여, 운영자의 책임은 관련 법령이 허용하는 최대 범위 내에서 제한됩니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제19조 (손해배상)
          </h2>
          <p className="mt-2">
            운영자 또는 회원은 본 약관 위반으로 인하여 상대방에게 손해가 발생한 경우 이에 대한 배상 책임을 집니다. 다만, 운영자의 고의 또는 중과실이 없는 한 배상 범위는 관련 법령이 허용하는 한도로 제한됩니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제20조 (분쟁의 해결)
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>운영자와 회원은 서비스 이용과 관련하여 발생한 분쟁을 원만하게 해결하기 위하여 필요한 모든 노력을 기울여야 합니다.</li>
            <li>협의에 의한 해결이 이루어지지 않을 경우 「민사소송법」의 관할규정에 따른 관할법원을 통하여 해결합니다.</li>
          </ol>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제21조 (준거법)
          </h2>
          <p className="mt-2">
            본 약관과 회원·운영자 간의 분쟁에는 대한민국 법령이 적용됩니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제22조 (분리가능성)
          </h2>
          <p className="mt-2">
            본 약관의 일부 조항이 관련 법령에 의하여 무효 또는 집행불능으로 판단되더라도 나머지 조항의 효력에는 영향을 미치지 않습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제23조 (권리·의무의 양도 금지)
          </h2>
          <p className="mt-2">
            회원은 운영자의 사전 서면 동의 없이 본 약관상의 지위나 개별 권리·의무를 제3자에게 양도하거나 담보로 제공할 수 없습니다.
          </p>
        </article>

        <article>
          <h2 className="text-base font-semibold text-neutral-900">
            제24조 (개정 이력)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>2026-04-21: 최초 제정 및 시행</li>
            <li>
              2026-04-27: 멀티 테넌트(기업/워크스페이스) 기능 도입에 따른 개정
              — §2(용어) 보강, §10(서비스 제공) 갱신, §10의2(기업의 운영) 신설,
              §16(콘텐츠 권리) 갱신, §17(해지) 갱신
            </li>
          </ul>
        </article>

        <p className="mt-10 text-xs text-neutral-400">
          부칙: 본 약관은 2026년 4월 27일부터 시행됩니다.
        </p>
      </section>
    </main>
  );
}
