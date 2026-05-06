import { demoAcademy } from "@/lib/demo-academy";

export const landingNavItems = [
  { label: "제품", href: "#product" },
  { label: "운영 흐름", href: "#operations" },
  { label: "도입", href: "#onboarding" },
  { label: "FAQ", href: "#faq" },
];

export const heroStats = [
  { label: "파일럿 원생", value: `${demoAcademy.stats.students}명` },
  { label: "운영 인원", value: `${demoAcademy.stats.staff}명` },
  { label: "첫 검증", value: "후속 문자" },
];

export const demoSteps = ["학원 규모 선택", "현재 방식 확인", "데모 요청"];

export const roleCards = [
  {
    role: "원장",
    title: "오늘 어떤 후속 연락이 남았는지 봅니다.",
    points: ["미처리 안내", "선생님별 처리 상태", "학생별 연락 기록"],
  },
  {
    role: "선생님",
    title: "수업 직후 휴대폰에서 바로 처리합니다.",
    points: ["반 선택", "학생 옆 사유 선택", "문자 확인/수정"],
  },
  {
    role: "관리자",
    title: "학생, 반, 템플릿을 정리합니다.",
    points: ["학생 명단 업로드", "문자 템플릿", "발신 설정"],
  },
];

export const productTabs = [
  {
    label: "선생님 모바일",
    title: "긴 명단에서도 문자 작성이 화면을 덮지 않습니다.",
    body: "학생 목록은 계속 보이게 두고, 선택한 안내만 하단 바와 바텀시트에서 확인합니다.",
    bullets: ["학생별 빠른 사유 선택", "문자 미리보기", "수정 후 저장/발송 준비"],
  },
  {
    label: "원장 확인",
    title: "발송 여부보다 미처리 상태를 먼저 봅니다.",
    body: "원장은 오늘 남은 안내와 선생님별 처리 현황을 기준으로 운영 상황을 확인합니다.",
    bullets: ["오늘 미처리", "반별 후속 현황", "학생별 히스토리"],
  },
  {
    label: "관리 설정",
    title: "학원 말투와 발신 기준을 한 곳에서 맞춥니다.",
    body: "사유별 문구와 중복 발송 방지 기준을 학원 단위로 관리합니다.",
    bullets: ["사유별 템플릿", "전화번호 마스킹", "중복 발송 경고"],
  },
];

export const outcomes = [
  {
    title: "선생님마다 다른 문구를 줄입니다.",
    body: "반복 안내는 학원 템플릿으로 시작하고, 필요한 표현만 선생님이 수정합니다.",
  },
  {
    title: "개인 휴대폰 기억에 맡기지 않습니다.",
    body: "누가 어떤 학생에게 어떤 안내를 했는지 후속 기록으로 남깁니다.",
  },
  {
    title: "기존 학원관리 프로그램을 당장 바꾸지 않습니다.",
    body: "출결, 수납, 학부모 앱을 한 번에 갈아엎지 않고 후속 연락 업무부터 검증합니다.",
  },
];

export const onboardingSteps = [
  {
    step: "01",
    title: "학생/반 명단 정리",
    body: "CSV 또는 수동 등록으로 파일럿 반부터 가볍게 시작합니다.",
  },
  {
    step: "02",
    title: "문자 템플릿 세팅",
    body: "결석, 재시험, 숙제 미완료처럼 반복되는 문구부터 맞춥니다.",
  },
  {
    step: "03",
    title: "선생님 사용 테스트",
    body: "실제 발송 전 dry-run으로 흐름과 기록 저장을 먼저 검증합니다.",
  },
];

export const followupRows = [
  { student: "김민준", className: "중2 수학 A반", reason: "결석", state: "초안 준비" },
  { student: "이서연", className: "중3 영어 B반", reason: "재시험", state: "확인 대기" },
  { student: "박지호", className: "고1 수학 C반", reason: "숙제", state: "기록 완료" },
  { student: "최하린", className: "중1 영어 A반", reason: "상담", state: "보류" },
];

export const faqItems = [
  {
    question: "기존 학원관리 프로그램을 바꿔야 하나요?",
    answer: "아니요. MVP는 후속 문자와 기록 흐름만 별도로 검증하는 구조입니다.",
  },
  {
    question: "학부모 앱도 필요한가요?",
    answer: "초기에는 만들지 않습니다. 선생님과 원장 업무 흐름을 먼저 검증합니다.",
  },
  {
    question: "실제 문자 발송 비용은 어떻게 보나요?",
    answer: "월 사용료와 문자/알림톡 실비를 분리하는 구조가 가장 이해하기 쉽습니다.",
  },
  {
    question: "학생이 200명 이상이어도 괜찮나요?",
    answer: "처음부터 전체 원생이 아니라 파일럿 반 2~3개로 시작한 뒤 넓히는 방식을 권장합니다.",
  },
];
