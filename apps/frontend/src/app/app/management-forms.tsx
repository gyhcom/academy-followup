import { Save, Trash2, X } from "lucide-react";
import type {
  BulkScheduleFormState,
  ClassFormState,
  FormStatus,
  ManagementClass,
  ManagementMember,
  MemberFormState,
  ScheduleFormState,
  StudentFormState,
} from "@/app/app/management-types";
import { roleLabel, weekDayOptions } from "@/app/app/management-utils";

const gradeOptions = ["무학년제", "초등", "중1", "중2", "중3", "고1", "고2", "고3", "기타"];
const dayGroupOptions = [
  { label: "월수금", values: [1, 3, 5] },
  { label: "화목", values: [2, 4] },
  { label: "월수", values: [1, 3] },
];

export function MemberForm({
  form,
  status,
  onChange,
  onCancel,
  onSave,
}: {
  form: MemberFormState;
  status: FormStatus;
  onChange: (form: MemberFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave =
    form.name.trim().length > 0 &&
    (form.mode === "create" || form.email.trim().length > 0) &&
    (form.mode === "edit" || form.password.trim().length >= 8) &&
    status.status !== "saving";

  return (
    <div className="mb-4 rounded-sm border border-[#8FA6B0] bg-[#E7EEF1] p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--clinic-text)]">
            {form.mode === "create" ? "새 구성원 등록" : "구성원 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#405763]">
            신규 등록은 이름, 연락처, 직위, 임시 비밀번호만 입력합니다. 시스템 로그인 ID는 자동 생성됩니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="구성원 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] text-[#405763]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 김선생"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        {form.mode === "edit" ? (
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
            시스템 로그인 ID
            <input
              type="email"
              value={form.email}
              readOnly
              className="min-h-11 w-full min-w-0 rounded-sm border border-stone-200 bg-[#EDF3F5] px-3 text-sm text-[var(--clinic-muted)] outline-none"
            />
          </label>
        ) : null}

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          전화번호
          <input
            value={form.phone}
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
            placeholder="010-0000-0000"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          직위
          <select
            value={form.role}
            onChange={(event) => onChange({ ...form, role: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="manager">관리자</option>
            <option value="teacher">선생님</option>
            <option value="assistant">보조 선생님</option>
            <option value="owner">원장</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          상태
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </label>

        {form.mode === "create" ? (
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
            임시 비밀번호
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
              placeholder="8자 이상"
              className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
            />
          </label>
        ) : null}
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-4 text-sm font-semibold text-[#405763] sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold sm:w-auto",
            canSave ? "bg-[var(--clinic-primary)] text-white" : "bg-[#C7D4DA] text-[#405763]",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

export function ClassForm({
  form,
  status,
  teacherOptions,
  onChange,
  onCancel,
  onSave,
}: {
  form: ClassFormState;
  status: FormStatus;
  teacherOptions: ManagementMember[];
  onChange: (form: ClassFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave = form.name.trim().length > 0 && status.status !== "saving";

  return (
    <div className="mb-4 min-w-0 overflow-hidden rounded-sm border border-[#8FA6B0] bg-[#E7EEF1] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--clinic-text)]">
            {form.mode === "create" ? "새 반 등록" : "반 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#405763]">
            반 이름을 먼저 정하고, 주 담당 선생님을 연결하면 선생님 권한과 출석부 필터가 같이 정리됩니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="반 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] text-[#405763]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          반 이름 <span className="text-xs font-normal text-[var(--clinic-muted)]">필수</span>
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 중2 수학 A반"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          주 담당 선생님
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">담당자 미지정</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          학년
          <select
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">학년 선택</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-4 text-sm font-semibold text-[#405763] sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold sm:w-auto",
            canSave ? "bg-[var(--clinic-primary)] text-white" : "bg-[#C7D4DA] text-[#405763]",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

export function StudentForm({
  form,
  status,
  classes,
  onChange,
  onCancel,
  onSave,
}: {
  form: StudentFormState;
  status: FormStatus;
  classes: ManagementClass[];
  onChange: (form: StudentFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave =
    form.name.trim().length > 0 &&
    form.parentPhone.trim().length > 0 &&
    status.status !== "saving";

  return (
    <div className="mb-4 rounded-sm border border-[#8FA6B0] bg-[#E7EEF1] p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--clinic-text)]">
            {form.mode === "create" ? "새 학생 등록" : "학생 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#405763]">
            소속 반을 지정해야 출석, 문자, 선생님 권한 기준이 정확해집니다. 저장 후 주간 스케줄을 이어서 입력합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="학생 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] text-[#405763]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          학생 이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 김민준"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          소속 반 <span className="text-xs font-normal text-[var(--clinic-muted)]">출석/권한 기준</span>
          <select
            value={form.classId}
            onChange={(event) => onChange({ ...form, classId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">미배정 - 나중에 배정</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          상태
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="active">재원</option>
            <option value="paused">휴원</option>
            <option value="left">퇴원</option>
          </select>
          <span className="text-xs leading-5 text-[#5C717A]">
            학생 삭제는 제공하지 않습니다. 운영 기록 보존을 위해 다니지 않는 학생은 `퇴원`
            상태로 관리합니다.
          </span>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          학교
          <input
            value={form.schoolName}
            onChange={(event) => onChange({ ...form, schoolName: event.target.value })}
            placeholder="예: 한들중"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          학년
          <select
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">학년 선택</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          학부모명
          <input
            value={form.parentName}
            onChange={(event) => onChange({ ...form, parentName: event.target.value })}
            placeholder="예: 김민준 어머니"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2 lg:col-span-1">
          학부모 연락처
          <input
            value={form.parentPhone}
            onChange={(event) => onChange({ ...form, parentPhone: event.target.value })}
            inputMode="tel"
            placeholder="예: 010-1234-5678"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2 lg:col-span-1">
          학생 연락처
          <input
            value={form.studentPhone}
            onChange={(event) => onChange({ ...form, studentPhone: event.target.value })}
            inputMode="tel"
            placeholder="선택 입력"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>
      </div>

      <label className="mt-3 flex items-start gap-3 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] p-3 text-sm text-[#405763]">
        <input
          type="checkbox"
          checked={form.scheduleShareConsentConfirmed}
          onChange={(event) =>
            onChange({ ...form, scheduleShareConsentConfirmed: event.target.checked })
          }
          className="mt-1 size-4 shrink-0 accent-[var(--clinic-primary)]"
        />
        <span className="min-w-0">
          <span className="block font-semibold text-[var(--clinic-text)]">
            타 학원 스케줄 공유 동의 확인
          </span>
          <span className="mt-1 block leading-5">
            보호자에게 타 학원 스케줄 공유 목적과 범위를 안내했고 동의를 확인했습니다.
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--clinic-muted)]">
            체크하면 같은 학생으로 확인되는 다른 학원 일정이 자동으로 연결됩니다. 전화번호는
            동일 학생 확인에만 사용되며 상대 학원에 노출되지 않습니다.
          </span>
        </span>
      </label>

      {status.status === "error" ? (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-4 text-sm font-semibold text-[#405763] sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold sm:w-auto",
            canSave ? "bg-[var(--clinic-primary)] text-white" : "bg-[#C7D4DA] text-[#405763]",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

export function ScheduleForm({
  form,
  status,
  classes,
  members,
  onChange,
  onCancel,
  onSave,
  onDelete,
}: {
  form: ScheduleFormState;
  status: FormStatus;
  classes: ManagementClass[];
  members: ManagementMember[];
  onChange: (form: ScheduleFormState) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const canSave =
    form.title.trim().length > 0 &&
    form.startTime.trim().length > 0 &&
    form.endTime.trim().length > 0 &&
    status.status !== "saving";

  function changeClass(classId: string) {
    const classItem = classes.find((item) => item.id === classId);

    onChange({
      ...form,
      classId,
      teacherId: classItem?.teacherId ?? form.teacherId,
      subject: classItem?.subject ?? form.subject,
      title: classItem?.name ?? form.title,
    });
  }

  return (
    <div className="mb-4 rounded-sm border border-[#8FA6B0] bg-[#E7EEF1] p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--clinic-text)]">
            {form.mode === "create" ? "스케줄 등록" : "스케줄 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#405763]">
            {form.studentName} 학생의 반복 수업, 날짜 지정 보강, 개인/기타 일정을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="스케줄 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] text-[#405763]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">개인/기타 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          날짜
          <input
            type="date"
            value={form.scheduleDate}
            onChange={(event) => {
              const value = event.target.value;
              onChange({
                ...form,
                scheduleDate: value,
                dayOfWeek: value ? getDayOfWeek(value) : form.dayOfWeek,
              });
            }}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
          <span className="text-xs font-normal leading-5 text-[var(--clinic-muted)]">
            비워두면 주간 반복, 입력하면 해당 날짜 1회 일정입니다.
          </span>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          요일
          <select
            value={form.dayOfWeek}
            onChange={(event) => onChange({ ...form, dayOfWeek: Number(event.target.value) })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            {weekDayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          연결 반
          <select
            value={form.classId}
            onChange={(event) => changeClass(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">반 연결 없음</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">담당자 미지정</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2 xl:col-span-3">
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 보강 후보에서 제외할 개인 일정"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm font-medium text-[var(--clinic-text)]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
            className="size-4 shrink-0"
          />
          활성 일정
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {form.mode === "edit" && form.isActive && onDelete ? (
          <button
            type="button"
            disabled={status.status === "saving"}
            onClick={onDelete}
            className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-sm border border-red-200 bg-[#F7FAFA] px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Trash2 size={16} />
            삭제
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-4 text-sm font-semibold text-[#405763] sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold sm:w-auto",
            canSave ? "bg-[var(--clinic-primary)] text-white" : "bg-[#C7D4DA] text-[#405763]",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
        </div>
      </div>
    </div>
  );
}

export function BulkScheduleForm({
  form,
  status,
  teacherOptions,
  onChange,
  onCancel,
  onSave,
}: {
  form: BulkScheduleFormState;
  status: FormStatus;
  teacherOptions: ManagementMember[];
  onChange: (form: BulkScheduleFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave =
    form.title.trim().length > 0 &&
    form.dayOfWeeks.length > 0 &&
    form.startTime.trim().length > 0 &&
    form.endTime.trim().length > 0 &&
    status.status !== "saving";
  const sortedDayOfWeeks = [...form.dayOfWeeks].sort((a, b) => a - b);
  const selectedDayLabels = weekDayOptions
    .filter((day) => form.dayOfWeeks.includes(day.value))
    .map((day) => day.label)
    .join(", ");
  const setDayOfWeeks = (dayOfWeeks: number[]) => {
    onChange({ ...form, dayOfWeeks: [...new Set(dayOfWeeks)].sort((a, b) => a - b) });
  };
  const toggleDayOfWeek = (dayOfWeek: number) => {
    if (form.dayOfWeeks.includes(dayOfWeek)) {
      setDayOfWeeks(form.dayOfWeeks.filter((value) => value !== dayOfWeek));
      return;
    }

    setDayOfWeeks([...form.dayOfWeeks, dayOfWeek]);
  };

  return (
    <div className="mb-4 rounded-sm border border-[#8FA6B0] bg-[#E7EEF1] p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--clinic-text)]">이 반 학생 전체 수업 시간 등록</p>
          <p className="mt-1 text-xs leading-5 text-[#405763]">
            {form.className} 재원 학생 전체에게 같은 요일·시간의 반복 수업을 등록합니다.
            이미 같은 시간의 활성 스케줄이 있는 학생은 자동으로 건너뜁니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="일괄 스케줄 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] text-[#405763]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">개인/기타 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <div className="grid min-w-0 gap-2 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2 xl:col-span-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span>요일</span>
            <span className="truncate text-xs font-normal text-[var(--clinic-muted)]">
              {selectedDayLabels || "요일을 선택해 주세요"}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            {dayGroupOptions.map((group) => {
              const isSelected =
                group.values.length === sortedDayOfWeeks.length &&
                group.values.every((value, index) => value === sortedDayOfWeeks[index]);

              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => setDayOfWeeks(group.values)}
                  className={[
                    "min-h-9 rounded-sm border px-3 text-xs font-semibold transition",
                    isSelected
                      ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white"
                      : "border-[#B8C9D0] bg-[#F7FAFA] text-[#244B67]",
                  ].join(" ")}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {weekDayOptions.map((day) => {
              const isSelected = form.dayOfWeeks.includes(day.value);

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={[
                    "min-h-10 rounded-sm border text-sm font-semibold transition",
                    isSelected
                      ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white"
                      : "border-[#AFC1C8] bg-[#F7FAFA] text-[#405763]",
                  ].join(" ")}
                  aria-pressed={isSelected}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          >
            <option value="">반 담당자 사용</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[var(--clinic-text)] sm:col-span-2 xl:col-span-4">
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 반 전체 정규 스케줄"
            className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#BFE3E1]"
          />
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 rounded-sm border border-[#AFC1C8] bg-[#F7FAFA] px-4 text-sm font-semibold text-[#405763] sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold sm:w-auto",
            canSave ? "bg-[var(--clinic-primary)] text-white" : "bg-[#C7D4DA] text-[#405763]",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "등록 중" : "전체 학생에게 등록"}
        </button>
      </div>
    </div>
  );
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}
