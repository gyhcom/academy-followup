import { demoAcademy } from "@/lib/demo-academy";

export const landingNavItems = [
  { label: "대상", href: "#audiences" },
  { label: "기능", href: "#features" },
  { label: "도입", href: "#onboarding" },
  { label: "가격", href: "#pricing" },
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
  { label: "모바일 우선", value: "출석·지각 체크" },
  { label: "첫 검증 기능", value: "출석 후 연락 자동 기록" },
];

export const demoSteps = ["내 역할 선택", "현재 운영 방식 확인", "파일럿 데모 보기"];

export const roleCards = [
  {
    role: "원장/대표",
    title: "학원 전체 운영을 한눈에 보고 싶을 때",
    points: ["오늘 출석 현황", "전체문자 중복 제외", "학생별 누적 기록"],
  },
  {
    role: "담임/강사",
    title: "수업 직후 바로 처리해야 할 때",
    points: ["도착·지각 체크", "결석 문자 초안", "전화번호 비노출"],
  },
  {
    role: "데스크/관리자",
    title: "반복 안내와 기본 정보를 정리할 때",
    points: ["학생·반·스케줄", "문자 템플릿", "발신/권한 설정"],
  },
];

export const productTabs = [
  {
    label: "학생·반",
    title: "학생, 반, 수업 스케줄을 운영의 시작점으로 둡니다.",
    body: "이름, 연락처, 담당 선생님, 소속 반, 요일별 수업 시간이 출석과 연락 흐름으로 연결됩니다.",
    bullets: ["학생/학부모 연락처", "반·학년·담당자", "주간 스케줄"],
  },
  {
    label: "출결·후속",
    title: "도착, 지각, 결석을 모바일에서 바로 체크합니다.",
    body: "선생님은 수업 중 학생 도착 여부를 누르고, 지각/결석은 문자 초안과 기록으로 이어집니다.",
    bullets: ["도착 토글", "지각 빠른 체크", "결석/보강 연락"],
  },
  {
    label: "소통·기록",
    title: "문자 발송은 기록과 안전장치를 함께 가집니다.",
    body: "개별 문자, 전체문자, 중복 수신자 제외, byte 제한, 테스트 발송 기록이 한 흐름으로 남습니다.",
    bullets: ["개별/전체문자", "중복 번호 제외", "발송 이력"],
  },
];

export const platformFeatureAreas = [
  {
    title: "원장 대시보드",
    status: "MVP 진행",
    body: "오늘 출석, 연락 전 학생, 연락 완료 상태를 날짜 기준으로 보여줍니다.",
  },
  {
    title: "학생·반 관리",
    status: "사용 가능",
    body: "학생, 학부모 연락처, 반, 담당 선생님, 주간 스케줄을 학원 단위로 관리합니다.",
  },
  {
    title: "출결·보강·재시험",
    status: "사용 가능",
    body: "수업별 출석부에서 도착, 지각, 결석, 확인 필요, 보강 상태를 남깁니다.",
  },
  {
    title: "학부모 소통",
    status: "MVP 진행",
    body: "반복 안내는 템플릿으로 시작하고, 전체문자는 중복 번호를 제외해 보냅니다.",
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
    title: "출석 체크에서 연락 기록까지 이어집니다.",
    body: "선생님이 모바일에서 도착/지각/결석을 누르면 원장은 남은 연락과 기록을 확인합니다.",
  },
  {
    title: "기존 학원관리 프로그램을 바로 대체하지 않습니다.",
    body: "처음에는 파일럿 반의 후속 업무만 검증하고, 실제 사용이 확인되면 기능을 넓힙니다.",
  },
  {
    title: "개인정보 노출을 줄인 운영 흐름입니다.",
    body: "선생님 화면에서는 전화번호 숫자를 숨기고, 시스템을 통해 필요한 연락만 처리합니다.",
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
    body: "학생, 반, 담당 선생님, 수업 스케줄을 일부만 등록해 실제 수업 흐름으로 테스트합니다.",
  },
  {
    step: "03",
    title: "출석 후 연락부터 검증",
    body: "도착/지각 체크, 결석 문자, 전체 공지, 기록 저장까지 한 흐름으로 확인합니다.",
  },
];

export const pricingFeatures = [
  "학생 300명 이하 파일럿 운영",
  "원장/선생님 계정 20명까지",
  "학생·반·스케줄 관리",
  "모바일 출석 체크, 지각/결석 문자, 전체문자 중복 제외",
  "문자 초안, 테스트 발송 기록, 학생별 히스토리",
  "초기 데이터 세팅 지원",
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
    question: "전체문자를 보내면 중복 발송이 생기지 않나요?",
    answer: "같은 전화번호는 기본적으로 한 번만 발송 후보에 남기는 중복 제외 흐름을 둡니다.",
  },
  {
    question: "학생이 200명 이상이어도 괜찮나요?",
    answer: "처음부터 전체 원생이 아니라 파일럿 반 2~3개로 시작한 뒤 넓히는 방식을 권장합니다.",
  },
];
