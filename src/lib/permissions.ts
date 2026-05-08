export type AcademyRole = "owner" | "manager" | "teacher" | "assistant";

export function isAcademyRole(role: string): role is AcademyRole {
  return ["owner", "manager", "teacher", "assistant"].includes(role);
}

export function roleLabel(role: string) {
  const labels: Record<AcademyRole, string> = {
    owner: "원장",
    manager: "관리자",
    teacher: "선생님",
    assistant: "보조 선생님",
  };

  return isAcademyRole(role) ? labels[role] : role;
}

export function canManageAcademy(role: string) {
  return role === "owner" || role === "manager";
}

export function canViewAllClasses(role: string) {
  return canManageAcademy(role);
}

export function canAccessAssignedClass({
  role,
  classTeacherId,
  userId,
}: {
  role: string;
  classTeacherId: string | null;
  userId: string;
}) {
  return canViewAllClasses(role) || classTeacherId === userId;
}

export function canSendFollowupMessage({
  role,
  classTeacherId,
  userId,
  allowAssistantSend,
}: {
  role: string;
  classTeacherId: string | null;
  userId: string;
  allowAssistantSend: boolean;
}) {
  if (canManageAcademy(role)) {
    return true;
  }

  if (role === "teacher") {
    return classTeacherId === userId;
  }

  if (role === "assistant") {
    return allowAssistantSend && classTeacherId === userId;
  }

  return false;
}
