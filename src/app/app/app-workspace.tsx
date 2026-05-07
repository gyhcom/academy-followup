"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  GraduationCap,
  LayoutDashboard,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import {
  OperationsBoard,
  type OperationsClass,
} from "@/app/app/operations-board";

export type ManagementClass = {
  id: string;
  name: string;
  subject: string | null;
  gradeLabel: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentCount: number;
};

export type ManagementStudent = {
  id: string;
  name: string;
  className: string | null;
  schoolName: string | null;
  gradeLabel: string | null;
  parentName: string | null;
  maskedParentPhone: string;
  status: string;
};

export type ManagementMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  classCount: number;
};

type AppWorkspaceProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  classes: OperationsClass[];
  managementClasses: ManagementClass[];
  managementStudents: ManagementStudent[];
  managementMembers: ManagementMember[];
};

type WorkspaceView = "operations" | "management";
type ClassFormMode = "create" | "edit";
type ClassFormState = {
  mode: ClassFormMode;
  classId: string;
  name: string;
  subject: string;
  gradeLabel: string;
  teacherId: string;
};

export function AppWorkspace({
  academyName,
  teacherName,
  role,
  roleLabel,
  classes,
  managementClasses,
  managementStudents,
  managementMembers,
}: AppWorkspaceProps) {
  const canManage = role === "owner" || role === "manager";
  const [activeView, setActiveView] = useState<WorkspaceView>("operations");
  const visibleView = canManage ? activeView : "operations";

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <WorkspaceNavigation
        activeView={visibleView}
        canManage={canManage}
        onChange={setActiveView}
      />

      {visibleView === "operations" ? (
        <OperationsBoard
          academyName={academyName}
          teacherName={teacherName}
          roleLabel={roleLabel}
          classes={classes}
        />
      ) : (
        <ManagementHome
          academyName={academyName}
          classes={managementClasses}
          members={managementMembers}
          students={managementStudents}
        />
      )}
    </div>
  );
}

function WorkspaceNavigation({
  activeView,
  canManage,
  onChange,
}: {
  activeView: WorkspaceView;
  canManage: boolean;
  onChange: (view: WorkspaceView) => void;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <WorkspaceNavButton
          icon={<LayoutDashboard size={17} />}
          label="운영 보드"
          description="수업 후 팔로업"
          isActive={activeView === "operations"}
          onClick={() => onChange("operations")}
        />
        <WorkspaceNavButton
          icon={<Settings size={17} />}
          label="관리"
          description={canManage ? "학생·반·구성원" : "원장/관리자 권한"}
          isActive={activeView === "management"}
          disabled={!canManage}
          onClick={() => onChange("management")}
        />
      </div>
    </section>
  );
}

function WorkspaceNavButton({
  icon,
  label,
  description,
  isActive,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "flex min-h-16 items-center gap-3 rounded-lg border px-3 text-left transition",
        isActive
          ? "border-stone-950 bg-stone-950 text-white"
          : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-white",
        disabled ? "cursor-not-allowed opacity-55 hover:border-stone-200 hover:bg-stone-50" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          isActive ? "bg-white/14 text-white" : "bg-white text-emerald-700",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span
          className={[
            "mt-0.5 block truncate text-xs",
            isActive ? "text-white/70" : "text-stone-500",
          ].join(" ")}
        >
          {description}
        </span>
      </span>
    </button>
  );
}

function ManagementHome({
  academyName,
  classes,
  members,
  students,
}: {
  academyName: string;
  classes: ManagementClass[];
  members: ManagementMember[];
  students: ManagementStudent[];
}) {
  const router = useRouter();
  const [classForm, setClassForm] = useState<ClassFormState | null>(null);
  const [classFormStatus, setClassFormStatus] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const activeStudents = useMemo(
    () => students.filter((student) => student.status === "active"),
    [students],
  );
  const inactiveStudents = students.length - activeStudents.length;
  const teacherOptions = members.filter((member) =>
    ["owner", "manager", "teacher", "assistant"].includes(member.role),
  );

  function openCreateClassForm() {
    setClassForm({
      mode: "create",
      classId: "",
      name: "",
      subject: "",
      gradeLabel: "",
      teacherId: "",
    });
    setClassFormStatus({ status: "idle", message: "" });
  }

  function openEditClassForm(classItem: ManagementClass) {
    setClassForm({
      mode: "edit",
      classId: classItem.id,
      name: classItem.name,
      subject: classItem.subject ?? "",
      gradeLabel: classItem.gradeLabel ?? "",
      teacherId: classItem.teacherId ?? "",
    });
    setClassFormStatus({ status: "idle", message: "" });
  }

  async function saveClassForm() {
    if (!classForm) {
      return;
    }

    setClassFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/classes", {
        method: classForm.mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: classForm.classId,
          name: classForm.name,
          subject: classForm.subject,
          gradeLabel: classForm.gradeLabel,
          teacherId: classForm.teacherId,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "반 정보를 저장하지 못했습니다.");
      }

      setClassFormStatus({
        status: "saved",
        message: classForm.mode === "create" ? "반을 등록했습니다." : "반 정보를 수정했습니다.",
      });
      setClassForm(null);
      router.refresh();
    } catch (error) {
      setClassFormStatus({
        status: "error",
        message: error instanceof Error ? error.message : "반 정보를 저장하지 못했습니다.",
      });
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              학원 기본 관리
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              실제 등록 기능을 붙이기 전에, 원장이 확인해야 하는 학생·반·구성원 정보를
              한 화면에 모았습니다.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            다음 티켓에서 등록/수정 폼을 이 화면에 연결합니다.
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<GraduationCap size={19} />}
          label="재원 학생"
          value={`${activeStudents.length}명`}
          detail={inactiveStudents > 0 ? `비활성 ${inactiveStudents}명 별도 관리` : "팔로업 대상 기준"}
        />
        <SummaryCard
          icon={<BookOpen size={19} />}
          label="반"
          value={`${classes.length}개`}
          detail="운영 보드 반 목록과 연결"
        />
        <SummaryCard
          icon={<UsersRound size={19} />}
          label="구성원"
          value={`${members.length}명`}
          detail="원장·관리자·선생님 권한"
        />
        <SummaryCard
          icon={<ClipboardList size={19} />}
          label="등록 준비"
          value="3개 화면"
          detail="학생, 반, 선생님"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <ManagementPanel
          title="반 관리"
          description="반 이름, 과목, 학년, 담당 선생님을 등록하고 수정합니다."
          actionLabel="반 등록"
          actionIcon={<Plus size={14} />}
          onAction={openCreateClassForm}
        >
          {classForm ? (
            <ClassForm
              form={classForm}
              status={classFormStatus}
              teacherOptions={teacherOptions}
              onChange={setClassForm}
              onCancel={() => {
                setClassForm(null);
                setClassFormStatus({ status: "idle", message: "" });
              }}
              onSave={saveClassForm}
            />
          ) : null}

          {classFormStatus.status === "saved" || classFormStatus.status === "error" ? (
            <p
              className={[
                "mb-3 rounded-md border px-3 py-2 text-sm",
                classFormStatus.status === "saved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {classFormStatus.message}
            </p>
          ) : null}

          <div className="divide-y divide-stone-100">
            {classes.map((classItem) => (
              <div key={classItem.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{classItem.name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {[classItem.subject, classItem.gradeLabel].filter(Boolean).join(" · ") ||
                      "과목/학년 미지정"}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    담당: {classItem.teacherName ?? "미지정"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-fit rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    학생 {classItem.studentCount}명
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditClassForm(classItem)}
                    className="flex min-h-8 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                  >
                    <Pencil size={13} />
                    수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ManagementPanel>

        <ManagementPanel
          title="구성원 관리"
          description="로그인 가능한 학원 내부 사용자를 확인합니다."
          actionLabel="선생님 초대 예정"
        >
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{member.name}</p>
                    <p className="mt-1 truncate text-xs text-stone-500">{member.email}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700">
                    {roleLabel(member.role)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-500">담당 반 {member.classCount}개</p>
              </div>
            ))}
          </div>
        </ManagementPanel>
      </section>

      <ManagementPanel
        title="학생 관리"
        description="학생과 학부모 연락처는 팔로업 발송의 기준 데이터입니다."
        actionLabel="학생 등록 폼 예정"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.slice(0, 12).map((student) => (
            <article key={student.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{student.name}</p>
                  <p className="mt-1 truncate text-xs text-stone-500">
                    {student.className ?? "미배정"} · {student.gradeLabel ?? "학년 미지정"}
                  </p>
                </div>
                <StatusBadge status={student.status} />
              </div>
              <p className="mt-3 truncate text-xs text-stone-500">
                {student.parentName ?? "학부모"} · {student.maskedParentPhone}
              </p>
            </article>
          ))}
        </div>
        {students.length > 12 ? (
          <p className="mt-3 text-xs text-stone-500">
            최근 화면에서는 12명만 표시합니다. 검색/필터는 학생 관리 상세 화면에서 연결합니다.
          </p>
        ) : null}
      </ManagementPanel>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </article>
  );
}

function ManagementPanel({
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <h3 className="text-base font-semibold text-stone-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <button
          type="button"
          disabled={!onAction}
          onClick={onAction}
          className={[
            "hidden min-h-10 shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-semibold sm:flex",
            onAction
              ? "border-stone-300 bg-white text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
              : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-500",
          ].join(" ")}
        >
          {actionIcon}
          {actionLabel}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

function ClassForm({
  form,
  status,
  teacherOptions,
  onChange,
  onCancel,
  onSave,
}: {
  form: ClassFormState;
  status: { status: "idle" | "saving" | "saved" | "error"; message: string };
  teacherOptions: ManagementMember[];
  onChange: (form: ClassFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave = form.name.trim().length > 0 && status.status !== "saving";

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "새 반 등록" : "반 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            반 이름은 필수이고, 과목·학년·담당자는 나중에 바꿀 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="반 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          반 이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 중2 수학 A반"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          담당 선생님
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">담당자 미지정</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          학년
          <input
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            placeholder="예: 중2"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold",
            canSave ? "bg-stone-950 text-white" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <span
      className={[
        "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
        isActive ? "bg-emerald-50 text-emerald-800" : "bg-stone-200 text-stone-700",
      ].join(" ")}
    >
      {isActive ? "재원" : status}
    </span>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: "원장",
    manager: "관리자",
    teacher: "선생님",
    assistant: "보조",
  };

  return labels[role] ?? role;
}
