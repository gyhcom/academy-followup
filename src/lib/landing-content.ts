import { demoAcademy } from "@/lib/demo-academy";

export const landingNavItems = [
  { label: "대상", href: "#audiences" },
  { label: "기능", href: "#features" },
  { label: "도입", href: "#onboarding" },
  { label: "가격", href: "#demo" },
  { label: "FAQ", href: "#faq" },
];

export const audienceMenuItems = [
  {
    title: "영수 전문학원",
    body: "반, 숙제, 재시험, 결석 후속 연락이 많은 단과형 학원",
  },
  {
    title: "종합학원",
    body: "과목과 선생님이 많아 원장 확인용 운영 보드가 필요한 학원",
  },
  {
    title: "다지점 학원",
    body: "캠퍼스별 운영 기준과 메시지 템플릿을 맞춰야 하는 조직",
  },
  {
    title: "신규 개원 학원",
    body: "처음부터 학생 기록과 학부모 소통 방식을 정리하려는 학원",
  },
  {
    title: "전환 검토 학원",
    body: "기존 학원관리 프로그램은 유지하되 후속 연락부터 바꾸려는 학원",
  },
  {
    title: "공부방/소규모 학원",
    body: "원장이 직접 수업과 학부모 연락을 함께 처리하는 작은 조직",
  },
];

export const featureMenuGroups = [
  {
    title: "운영 관리",
    items: ["학생·반 관리", "출결/결석", "보강/재시험", "선생님 업무"],
  },
  {
    title: "학부모 소통",
    items: ["문자/알림톡", "상담 기록", "공지 템플릿", "발송 이력"],
  },
  {
    title: "성장 기능",
    items: ["원장 대시보드", "수납/청구", "다지점 관리", "리포트"],
  },
];

export const heroStats = [
  { label: "파일럿 기준", value: `${demoAcademy.stats.students}명 학원` },
  { label: "사용자 역할", value: "원장·선생님·관리자" },
  { label: "첫 검증 기능", value: "후속 연락 운영" },
];

export const demoSteps = ["내 역할 선택", "현재 운영 방식 확인", "파일럿 데모 보기"];

export const roleCards = [
  {
    role: "원장/대표",
    title: "학원 전체 운영을 한눈에 보고 싶을 때",
    points: ["오늘 남은 후속 업무", "선생님별 처리 현황", "학생별 누적 기록"],
  },
  {
    role: "담임/강사",
    title: "수업 직후 바로 처리해야 할 때",
    points: ["반 선택", "학생 옆 사유 선택", "문자 확인/수정"],
  },
  {
    role: "데스크/관리자",
    title: "반복 안내와 기본 정보를 정리할 때",
    points: ["학생·반 등록", "문자 템플릿", "발신/권한 설정"],
  },
];

export const productTabs = [
  {
    label: "학생·반",
    title: "학생 정보와 반 구성을 운영의 시작점으로 둡니다.",
    body: "이름, 연락처, 담당 선생님, 소속 반을 기준으로 모든 후속 업무가 연결됩니다.",
    bullets: ["학생/학부모 연락처", "반·과목·담당자", "학생별 히스토리"],
  },
  {
    label: "출결·후속",
    title: "결석, 보강, 재시험, 숙제 미완료를 놓치지 않습니다.",
    body: "선생님은 수업 직후 빠르게 표시하고, 원장은 미처리 상태를 확인합니다.",
    bullets: ["결석/보강", "재시험", "숙제 미완료"],
  },
  {
    label: "소통·기록",
    title: "문자 발송은 기능 하나가 아니라 기록의 일부가 됩니다.",
    body: "안내 문구, 수정 내용, 발송 이력, 상담 메모가 학생 단위로 남습니다.",
    bullets: ["문자/알림톡", "상담 메모", "발송 이력"],
  },
];

export const platformFeatureAreas = [
  {
    title: "원장 대시보드",
    status: "현재 설계",
    body: "오늘 남은 처리 건, 선생님별 진행률, 반별 이슈를 먼저 보여줍니다.",
  },
  {
    title: "학생·반 관리",
    status: "다음 개발",
    body: "학생, 학부모 연락처, 반, 담당 선생님을 학원 단위로 관리합니다.",
  },
  {
    title: "출결·보강·재시험",
    status: "확장 핵심",
    body: "수업 후 바로 남는 액션을 표준화해서 누락을 줄입니다.",
  },
  {
    title: "학부모 소통",
    status: "MVP 진행",
    body: "반복 안내는 템플릿으로 시작하고, 선생님이 발송 전 수정합니다.",
  },
  {
    title: "상담·학생 기록",
    status: "상업화 핵심",
    body: "전화, 상담, 안내 이력을 학생 상세 페이지에 모읍니다.",
  },
  {
    title: "수납·리포트",
    status: "로드맵",
    body: "초기에는 범위를 넓히지 않고, 유료 고객 검증 뒤 붙입니다.",
  },
];

export const outcomes = [
  {
    title: "문자 발송 앱처럼 작게 보이지 않습니다.",
    body: "후속 연락은 첫 진입 기능이고, 제품의 중심은 학생 운영 기록과 원장 확인입니다.",
  },
  {
    title: "기존 학원관리 프로그램을 바로 대체하지 않습니다.",
    body: "처음에는 파일럿 반의 후속 업무만 검증하고, 실제 사용이 확인되면 기능을 넓힙니다.",
  },
  {
    title: "상업화 페이지는 큰 운영 범위를 보여줍니다.",
    body: "메뉴와 랜딩은 학원 운영 SaaS처럼 보이게 만들고, 실제 기능은 단계별로 붙입니다.",
  },
];

export const onboardingSteps = [
  {
    step: "01",
    title: "현재 운영 방식 확인",
    body: "출결, 보강, 재시험, 학부모 연락을 지금 어떻게 처리하는지 먼저 정리합니다.",
  },
  {
    step: "02",
    title: "파일럿 반 세팅",
    body: "학생/반/담당 선생님을 일부만 등록해 실제 수업 흐름으로 테스트합니다.",
  },
  {
    step: "03",
    title: "후속 연락부터 검증",
    body: "문자 초안, 수정, 기록 저장, 원장 확인까지 한 흐름으로 확인합니다.",
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
