import { normalizePhone } from "@/lib/student-import";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ShareableStudentRecord = {
  id: string;
  academy_id: string;
  name: string;
  school_name: string | null;
  grade_label: string | null;
  parent_phone: string;
  student_phone: string | null;
  schedule_share_consent_confirmed: boolean;
};

type ScheduleLinkRecord = {
  id: string;
  source_academy_id: string;
  source_student_id: string;
  target_academy_id: string;
  target_student_id: string;
};

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function syncAutomaticScheduleLinks({
  admin,
  student,
  userId,
}: {
  admin: AdminClient;
  student: ShareableStudentRecord;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const linksResult = await getActiveScheduleLinksForStudent({ admin, student });

  if (!linksResult.ok) {
    return linksResult;
  }

  if (!student.schedule_share_consent_confirmed) {
    return revokeScheduleLinks({
      admin,
      linkIds: linksResult.links.map((link) => link.id),
      userId,
    });
  }

  const linkedRemoteRefs = linksResult.links.map((link) =>
    getRemoteStudentRefFromLink(link, student),
  );
  const remoteStudentsResult = await getStudentsByRefs({ admin, refs: linkedRemoteRefs });

  if (!remoteStudentsResult.ok) {
    return remoteStudentsResult;
  }

  const remoteStudentsByKey = new Map(
    remoteStudentsResult.students.map((remoteStudent) => [
      `${remoteStudent.academy_id}:${remoteStudent.id}`,
      remoteStudent,
    ]),
  );
  const invalidLinkIds = linksResult.links
    .filter((link) => {
      const remoteRef = getRemoteStudentRefFromLink(link, student);
      const remoteStudent = remoteStudentsByKey.get(`${remoteRef.academyId}:${remoteRef.studentId}`);
      return !remoteStudent || !isAutomaticShareMatch(student, remoteStudent);
    })
    .map((link) => link.id);
  const revokeInvalidResult = await revokeScheduleLinks({
    admin,
    linkIds: invalidLinkIds,
    userId,
  });

  if (!revokeInvalidResult.ok) {
    return revokeInvalidResult;
  }

  const candidatesResult = await getAutomaticShareCandidates({ admin, student });

  if (!candidatesResult.ok) {
    return candidatesResult;
  }

  for (const candidate of candidatesResult.students) {
    const { error } = await admin.from("student_schedule_links").insert({
      source_academy_id: student.academy_id,
      source_student_id: student.id,
      target_academy_id: candidate.academy_id,
      target_student_id: candidate.id,
      status: "active",
      consent_method: "manual",
      created_by: userId,
    });

    if (error && isMissingSharingTable(error)) {
      return { ok: true };
    }

    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

async function getActiveScheduleLinksForStudent({
  admin,
  student,
}: {
  admin: AdminClient;
  student: ShareableStudentRecord;
}): Promise<{ ok: true; links: ScheduleLinkRecord[] } | { ok: false; error: string }> {
  const [sourceResult, targetResult] = await Promise.all([
    admin
      .from("student_schedule_links")
      .select("id, source_academy_id, source_student_id, target_academy_id, target_student_id")
      .eq("source_academy_id", student.academy_id)
      .eq("source_student_id", student.id)
      .eq("status", "active")
      .returns<ScheduleLinkRecord[]>(),
    admin
      .from("student_schedule_links")
      .select("id, source_academy_id, source_student_id, target_academy_id, target_student_id")
      .eq("target_academy_id", student.academy_id)
      .eq("target_student_id", student.id)
      .eq("status", "active")
      .returns<ScheduleLinkRecord[]>(),
  ]);

  if (sourceResult.error || targetResult.error) {
    if (isMissingSharingTable(sourceResult.error) || isMissingSharingTable(targetResult.error)) {
      return { ok: true, links: [] };
    }

    return { ok: false, error: sourceResult.error?.message ?? targetResult.error?.message ?? "" };
  }

  return { ok: true, links: [...(sourceResult.data ?? []), ...(targetResult.data ?? [])] };
}

async function getStudentsByRefs({
  admin,
  refs,
}: {
  admin: AdminClient;
  refs: Array<{ academyId: string; studentId: string }>;
}): Promise<{ ok: true; students: ShareableStudentRecord[] } | { ok: false; error: string }> {
  const studentIds = [...new Set(refs.map((ref) => ref.studentId))];

  if (studentIds.length === 0) {
    return { ok: true, students: [] };
  }

  const { data, error } = await admin
    .from("students")
    .select(
      "id, academy_id, name, school_name, grade_label, parent_phone, student_phone, schedule_share_consent_confirmed",
    )
    .in("id", studentIds)
    .returns<ShareableStudentRecord[]>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, students: data ?? [] };
}

async function getAutomaticShareCandidates({
  admin,
  student,
}: {
  admin: AdminClient;
  student: ShareableStudentRecord;
}): Promise<{ ok: true; students: ShareableStudentRecord[] } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("students")
    .select(
      "id, academy_id, name, school_name, grade_label, parent_phone, student_phone, schedule_share_consent_confirmed",
    )
    .neq("academy_id", student.academy_id)
    .eq("status", "active")
    .eq("schedule_share_consent_confirmed", true)
    .returns<ShareableStudentRecord[]>();

  if (error) {
    if (isMissingSharingTable(error)) {
      return { ok: true, students: [] };
    }

    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    students: (data ?? []).filter((candidate) => isAutomaticShareMatch(student, candidate)),
  };
}

async function revokeScheduleLinks({
  admin,
  linkIds,
  userId,
}: {
  admin: AdminClient;
  linkIds: string[];
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (linkIds.length === 0) {
    return { ok: true };
  }

  const { error } = await admin
    .from("student_schedule_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: userId,
    })
    .in("id", linkIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function isAutomaticShareMatch(source: ShareableStudentRecord, target: ShareableStudentRecord) {
  if (!source.schedule_share_consent_confirmed || !target.schedule_share_consent_confirmed) {
    return false;
  }

  if (
    source.academy_id === target.academy_id ||
    normalizeStudentIdentityValue(source.name) !== normalizeStudentIdentityValue(target.name) ||
    normalizeStudentIdentityValue(source.school_name) !==
      normalizeStudentIdentityValue(target.school_name) ||
    normalizeStudentIdentityValue(source.grade_label) !==
      normalizeStudentIdentityValue(target.grade_label)
  ) {
    return false;
  }

  const sourcePhones = getStudentMatchPhones(source);
  const targetPhones = getStudentMatchPhones(target);

  return sourcePhones.some((phone) => targetPhones.includes(phone));
}

function getStudentMatchPhones(student: ShareableStudentRecord) {
  return [student.parent_phone, student.student_phone]
    .map((phone) => (phone ? normalizePhone(phone) : null))
    .filter((phone): phone is string => Boolean(phone));
}

function normalizeStudentIdentityValue(value: string | null) {
  return (value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

function getRemoteStudentRefFromLink(link: ScheduleLinkRecord, student: ShareableStudentRecord) {
  if (link.source_academy_id === student.academy_id && link.source_student_id === student.id) {
    return {
      academyId: link.target_academy_id,
      studentId: link.target_student_id,
    };
  }

  return {
    academyId: link.source_academy_id,
    studentId: link.source_student_id,
  };
}

function isMissingSharingTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("student_schedule_links")) ||
    Boolean(error?.message?.includes("student_share_tokens"))
  );
}
