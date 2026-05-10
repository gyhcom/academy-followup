import { Save, X } from "lucide-react";
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
    form.email.trim().length > 0 &&
    (form.mode === "edit" || form.password.trim().length >= 8) &&
    status.status !== "saving";

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "새 구성원 등록" : "구성원 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            MVP에서는 임시 비밀번호를 원장이 직접 전달하는 수동 계정 생성 방식으로
            시작합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="구성원 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 김선생"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          이메일
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
            placeholder="teacher@example.com"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          전화번호
          <input
            value={form.phone}
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
            placeholder="010-0000-0000"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          역할
          <select
            value={form.role}
            onChange={(event) => onChange({ ...form, role: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="manager">관리자</option>
            <option value="teacher">선생님</option>
            <option value="assistant">보조 선생님</option>
            <option value="owner">원장</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          상태
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </label>

        {form.mode === "create" ? (
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
            임시 비밀번호
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
              placeholder="8자 이상"
              className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        ) : null}
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
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto",
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
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          반 이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 중2 수학 A반"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          담당 선생님
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">담당자 미지정</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          학년
          <input
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            placeholder="예: 중2"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto",
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
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "새 학생 등록" : "학생 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            학생명과 학부모 연락처는 필수입니다. 저장 후 주간 스케줄을 이어서 입력합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="학생 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          학생 이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 김민준"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          소속 반
          <select
            value={form.classId}
            onChange={(event) => onChange({ ...form, classId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">미배정</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          상태
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          >
            <option value="active">재원</option>
            <option value="paused">휴원</option>
            <option value="left">퇴원</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          학교
          <input
            value={form.schoolName}
            onChange={(event) => onChange({ ...form, schoolName: event.target.value })}
            placeholder="예: 한들중"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          학년
          <input
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            placeholder="예: 중2"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          학부모명
          <input
            value={form.parentName}
            onChange={(event) => onChange({ ...form, parentName: event.target.value })}
            placeholder="예: 김민준 어머니"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2 lg:col-span-1">
          학부모 연락처
          <input
            value={form.parentPhone}
            onChange={(event) => onChange({ ...form, parentPhone: event.target.value })}
            inputMode="tel"
            placeholder="예: 010-1234-5678"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2 lg:col-span-1">
          학생 연락처
          <input
            value={form.studentPhone}
            onChange={(event) => onChange({ ...form, studentPhone: event.target.value })}
            inputMode="tel"
            placeholder="선택 입력"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
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
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto",
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

export function ScheduleForm({
  form,
  status,
  classes,
  members,
  onChange,
  onCancel,
  onSave,
}: {
  form: ScheduleFormState;
  status: FormStatus;
  classes: ManagementClass[];
  members: ManagementMember[];
  onChange: (form: ScheduleFormState) => void;
  onCancel: () => void;
  onSave: () => void;
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
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "스케줄 등록" : "스케줄 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            {form.studentName} 학생의 반복 수업, 날짜 지정 보강, 외부 일정을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="스케줄 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">외부 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
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
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
          <span className="text-xs font-normal leading-5 text-stone-500">
            비워두면 주간 반복, 입력하면 해당 날짜 1회 일정입니다.
          </span>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          요일
          <select
            value={form.dayOfWeek}
            onChange={(event) => onChange({ ...form, dayOfWeek: Number(event.target.value) })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            {weekDayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          연결 반
          <select
            value={form.classId}
            onChange={(event) => changeClass(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">반 연결 없음</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">담당자 미지정</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2 xl:col-span-3">
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 보강 후보에서 제외할 외부 일정"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800">
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
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto",
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
    form.startTime.trim().length > 0 &&
    form.endTime.trim().length > 0 &&
    status.status !== "saving";

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">반 스케줄 일괄 등록</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            {form.className} 재원 학생 전체에게 같은 주간 반복 스케줄을 등록합니다.
            이미 같은 요일과 시간의 스케줄이 있으면 건너뜁니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="일괄 스케줄 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">외부 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          요일
          <select
            value={form.dayOfWeek}
            onChange={(event) => onChange({ ...form, dayOfWeek: Number(event.target.value) })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            {weekDayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">반 담당자 사용</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2 xl:col-span-4">
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 반 전체 정규 스케줄"
            className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
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
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto",
            canSave ? "bg-stone-950 text-white" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "등록 중" : "반 전체 등록"}
        </button>
      </div>
    </div>
  );
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}
