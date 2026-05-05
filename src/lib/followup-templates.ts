export type FollowupReason =
  | "absence"
  | "late"
  | "homework_missing"
  | "retest"
  | "materials_missing"
  | "class_attitude"
  | "consultation";

export const followupReasons: Array<{ id: FollowupReason; label: string }> = [
  { id: "absence", label: "결석" },
  { id: "late", label: "지각" },
  { id: "homework_missing", label: "숙제 미완료" },
  { id: "retest", label: "재시험" },
  { id: "materials_missing", label: "준비물 미지참" },
  { id: "class_attitude", label: "수업 태도" },
  { id: "consultation", label: "상담 권장" },
];

type BuildFollowupMessageInput = {
  academyName: string;
  studentName: string;
  teacherName: string;
  reason: FollowupReason;
};

const templates: Record<FollowupReason, string> = {
  absence:
    "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업에 결석하여 안내드립니다.\n확인 부탁드리며, 보강 일정이 필요한 경우 {{teacherName}}이 다시 안내드리겠습니다.",
  late:
    "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업에 지각하여 안내드립니다.\n수업 흐름이 끊기지 않도록 다음 수업부터 시간 확인 부탁드립니다.",
  homework_missing:
    "[{{academyName}}] 안녕하세요. {{studentName}} 학생이 이번 과제를 완료하지 못해 안내드립니다.\n다음 수업 전까지 과제를 마무리할 수 있도록 확인 부탁드립니다.",
  retest:
    "[{{academyName}}] 안녕하세요. {{studentName}} 학생은 오늘 수업 내용 중 재시험이 필요하여 안내드립니다.\n다음 수업 전까지 오답을 다시 확인할 수 있도록 지도 부탁드립니다.",
  materials_missing:
    "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업 준비물을 지참하지 않아 안내드립니다.\n다음 수업에는 교재와 필기구를 꼭 챙길 수 있도록 확인 부탁드립니다.",
  class_attitude:
    "[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생의 수업 집중도와 참여도에 대해 확인이 필요하여 안내드립니다.\n담당 선생님이 수업 흐름을 다시 잡을 수 있도록 지도하겠습니다.",
  consultation:
    "[{{academyName}}] 안녕하세요. {{studentName}} 학생의 최근 학습 흐름에 대해 간단한 상담이 필요하여 안내드립니다.\n가능하신 시간에 {{teacherName}}에게 연락 부탁드립니다.",
};

export function buildFollowupMessage(input: BuildFollowupMessageInput) {
  return templates[input.reason]
    .replaceAll("{{academyName}}", input.academyName)
    .replaceAll("{{studentName}}", input.studentName)
    .replaceAll("{{teacherName}}", input.teacherName);
}
