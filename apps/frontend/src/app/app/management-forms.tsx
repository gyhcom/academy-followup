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

const managementFieldClass = "grid min-w-0 gap-1.5 text-sm font-medium text-[var(--academy-ink)]";
const managementInputClass =
  "min-h-10 w-full min-w-0 rounded-sm border border-[var(--academy-border)] bg-white px-3 text-sm text-[var(--academy-ink)] outline-none transition placeholder:text-[#9A9CA3] focus:border-[var(--academy-accent)] focus:ring-2 focus:ring-[var(--academy-accent-soft)]";
const managementReadonlyInputClass =
  "min-h-10 w-full min-w-0 rounded-sm border border-[var(--academy-border)] bg-[var(--academy-surface-strong)] px-3 text-sm text-[var(--academy-muted)] outline-none";
const managementFormShellClass =
  "mb-4 min-w-0 overflow-hidden rounded-sm border border-[var(--academy-border)] bg-white";
const managementFormHeaderClass =
  "flex items-start justify-between gap-3 border-b border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-4 py-3";
const managementCloseButtonClass =
  "flex size-8 shrink-0 items-center justify-center rounded-sm border border-[var(--academy-border)] bg-white text-[var(--academy-muted)] transition hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)]";
const managementFormBodyClass = "grid min-w-0 gap-3 p-4 sm:grid-cols-2";
const managementWideFormBodyClass = "grid min-w-0 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4";
const managementActionsClass =
  "flex flex-col gap-2 border-t border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-4 py-3 sm:flex-row sm:justify-end";
const managementSecondaryButtonClass =
  "min-h-10 w-full min-w-0 rounded-sm border border-[var(--academy-border)] bg-white px-4 text-sm font-semibold text-[var(--academy-muted-strong)] transition hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)] sm:w-auto";
const managementPrimaryButtonBaseClass =
  "flex min-h-10 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition sm:w-auto";
const managementSectionClass = "border border-[var(--academy-border)] bg-white";
const managementSectionHeaderClass =
  "border-b border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--academy-muted)]";
const managementHintClass = "text-xs leading-5 text-[var(--academy-muted)]";

function managementPrimaryButtonClass(canSave: boolean) {
  return [
    managementPrimaryButtonBaseClass,
    canSave
      ? "bg-[var(--academy-accent)] text-white hover:bg-[var(--academy-accent-strong)]"
      : "cursor-not-allowed bg-[var(--academy-surface-strong)] text-[var(--academy-muted)]",
  ].join(" ");
}

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
    <div className={managementFormShellClass}>
      <div className={managementFormHeaderClass}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--academy-ink)]">
            {form.mode === "create" ? "새 구성원 등록" : "구성원 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
            신규 등록은 이름, 연락처, 직위, 임시 비밀번호만 입력합니다. 시스템 로그인 ID는 자동 생성됩니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="구성원 입력 닫기"
          onClick={onCancel}
          className={managementCloseButtonClass}
        >
          <X size={15} />
        </button>
      </div>

      <div className={managementFormBodyClass}>
        <label className={managementFieldClass}>
          이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 김선생"
            className={managementInputClass}
          />
        </label>

        {form.mode === "edit" ? (
          <label className={managementFieldClass}>
            시스템 로그인 ID
            <input
              type="email"
              value={form.email}
              readOnly
              className={managementReadonlyInputClass}
            />
          </label>
        ) : null}

        <label className={managementFieldClass}>
          전화번호
          <input
            value={form.phone}
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
            placeholder="010-0000-0000"
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          직위
          <select
            value={form.role}
            onChange={(event) => onChange({ ...form, role: event.target.value })}
            className={managementInputClass}
          >
            <option value="manager">관리자</option>
            <option value="teacher">선생님</option>
            <option value="assistant">보조 선생님</option>
            <option value="owner">원장</option>
          </select>
        </label>

        <label className={managementFieldClass}>
          상태
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
            className={managementInputClass}
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </label>

        {form.mode === "create" ? (
          <label className={managementFieldClass}>
            임시 비밀번호
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
              placeholder="8자 이상"
              className={managementInputClass}
            />
          </label>
        ) : null}
      </div>

      {status.status === "error" ? (
        <p className="mx-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className={managementActionsClass}>
        <button
          type="button"
          onClick={onCancel}
          className={managementSecondaryButtonClass}
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={managementPrimaryButtonClass(canSave)}
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
    <div className={managementFormShellClass}>
      <div className={managementFormHeaderClass}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--academy-ink)]">
            {form.mode === "create" ? "새 반 등록" : "반 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
            반 이름을 먼저 정하고, 주 담당 선생님을 연결하면 선생님 권한과 출석부 필터가 같이 정리됩니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="반 입력 닫기"
          onClick={onCancel}
          className={managementCloseButtonClass}
        >
          <X size={15} />
        </button>
      </div>

      <div className={managementFormBodyClass}>
        <label className={managementFieldClass}>
          반 이름 <span className="text-xs font-normal text-[var(--clinic-muted)]">필수</span>
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 중2 수학 A반"
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          주 담당 선생님
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className={managementInputClass}
          >
            <option value="">담당자 미지정</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>

        <label className={managementFieldClass}>
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          학년
          <select
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            className={managementInputClass}
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
        <p className="mx-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className={managementActionsClass}>
        <button
          type="button"
          onClick={onCancel}
          className={managementSecondaryButtonClass}
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={managementPrimaryButtonClass(canSave)}
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
    <div className={managementFormShellClass}>
      <div className={managementFormHeaderClass}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--academy-ink)]">
            {form.mode === "create" ? "새 학생 등록" : "학생 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
            반 배정, 연락처, 재원 상태를 먼저 정리합니다. 주간 스케줄은 저장 후 이어서 입력합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="학생 입력 닫기"
          onClick={onCancel}
          className={managementCloseButtonClass}
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-4">
          <section className={managementSectionClass}>
            <p className={managementSectionHeaderClass}>기본 정보</p>
            <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2">
              <label className={managementFieldClass}>
                학생 이름
                <input
                  value={form.name}
                  onChange={(event) => onChange({ ...form, name: event.target.value })}
                  placeholder="예: 김민준"
                  className={managementInputClass}
                />
              </label>

              <label className={managementFieldClass}>
                학부모명
                <input
                  value={form.parentName}
                  onChange={(event) => onChange({ ...form, parentName: event.target.value })}
                  placeholder="예: 김민준 어머니"
                  className={managementInputClass}
                />
              </label>

              <label className={managementFieldClass}>
                학교
                <input
                  value={form.schoolName}
                  onChange={(event) => onChange({ ...form, schoolName: event.target.value })}
                  placeholder="예: 한들중"
                  className={managementInputClass}
                />
              </label>

              <label className={managementFieldClass}>
                학년
                <select
                  value={form.gradeLabel}
                  onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
                  className={managementInputClass}
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
          </section>

          <section className={managementSectionClass}>
            <p className={managementSectionHeaderClass}>반 배정 / 연락처</p>
            <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2">
              <label className={managementFieldClass}>
                <span className="flex min-h-5 items-center justify-between gap-2">
                  소속 반
                  <span className="truncate text-xs font-normal text-[#858895]">출석/권한 기준</span>
                </span>
                <select
                  value={form.classId}
                  onChange={(event) => onChange({ ...form, classId: event.target.value })}
                  className={managementInputClass}
                >
                  <option value="">미배정 - 나중에 배정</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={managementFieldClass}>
                학부모 연락처
                <input
                  value={form.parentPhone}
                  onChange={(event) => onChange({ ...form, parentPhone: event.target.value })}
                  inputMode="tel"
                  placeholder="예: 010-1234-5678"
                  className={managementInputClass}
                />
              </label>

              <label className={managementFieldClass}>
                학생 연락처
                <input
                  value={form.studentPhone}
                  onChange={(event) => onChange({ ...form, studentPhone: event.target.value })}
                  inputMode="tel"
                  placeholder="선택 입력"
                  className={managementInputClass}
                />
              </label>

              <div className="border border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--academy-muted)]">
                엑셀에서 앞자리 0이 사라진 경우에도 이 입력칸에는 010으로 시작하는 번호를 그대로 입력해 저장할 수 있습니다.
              </div>
            </div>
          </section>
        </div>

        <aside className="grid min-w-0 gap-4 xl:content-start">
          <section className={managementSectionClass}>
            <p className={managementSectionHeaderClass}>운영 상태</p>
            <div className="grid gap-3 p-3">
              <label className={managementFieldClass}>
                상태
                <select
                  value={form.status}
                  onChange={(event) => onChange({ ...form, status: event.target.value })}
                  aria-describedby="student-status-help"
                  className={managementInputClass}
                >
                  <option value="active">재원</option>
                  <option value="paused">휴원</option>
                  <option value="left">퇴원</option>
                </select>
              </label>

              <div
                id="student-status-help"
                role="note"
                className="border border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--academy-muted)]"
              >
                <p className="font-semibold text-[var(--academy-ink)]">퇴원 처리 안내</p>
                <p className="mt-1">
                  다니지 않는 학생은 상태를 <b className="text-[var(--academy-ink)]">퇴원</b>으로
                  바꾼 뒤 저장합니다. 학생과 과거 출석·연락 기록은 삭제하지 않고 보존합니다.
                </p>
              </div>
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-sm border border-[var(--academy-border)] bg-[var(--academy-surface)] p-3 text-sm text-[var(--academy-muted-strong)]">
            <input
              type="checkbox"
              checked={form.scheduleShareConsentConfirmed}
              onChange={(event) =>
                onChange({ ...form, scheduleShareConsentConfirmed: event.target.checked })
              }
              className="mt-1 size-4 shrink-0 accent-[var(--academy-accent)]"
            />
            <span className="min-w-0">
              <span className="block font-semibold text-[var(--academy-ink)]">
                타 학원 스케줄 공유 동의 확인
              </span>
              <span className="mt-1 block leading-5">
                보호자에게 타 학원 스케줄 공유 목적과 범위를 안내했고 동의를 확인했습니다.
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--academy-muted)]">
                체크하면 같은 학생으로 확인되는 다른 학원 일정이 자동으로 연결됩니다. 전화번호는
                동일 학생 확인에만 사용되며 상대 학원에 노출되지 않습니다.
              </span>
            </span>
          </label>
        </aside>
      </div>

      {status.status === "error" ? (
        <p className="mx-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className={managementActionsClass}>
        <button
          type="button"
          onClick={onCancel}
          className={managementSecondaryButtonClass}
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={managementPrimaryButtonClass(canSave)}
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
    <div className={managementFormShellClass}>
      <div className={managementFormHeaderClass}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--academy-ink)]">
            {form.mode === "create" ? "스케줄 등록" : "스케줄 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
            {form.studentName} 학생의 반복 수업, 날짜 지정 보강, 개인/기타 일정을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="스케줄 입력 닫기"
          onClick={onCancel}
          className={managementCloseButtonClass}
        >
          <X size={15} />
        </button>
      </div>

      <div className={managementWideFormBodyClass}>
        <label className={managementFieldClass}>
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className={managementInputClass}
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">개인/기타 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <label className={managementFieldClass}>
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
            className={managementInputClass}
          />
          <span className={managementHintClass}>
            비워두면 주간 반복, 입력하면 해당 날짜 1회 일정입니다.
          </span>
        </label>

        <label className={managementFieldClass}>
          요일
          <select
            value={form.dayOfWeek}
            onChange={(event) => onChange({ ...form, dayOfWeek: Number(event.target.value) })}
            className={managementInputClass}
          >
            {weekDayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className={managementFieldClass}>
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className={managementInputClass}
          />
        </label>

        <label className={`${managementFieldClass} sm:col-span-2`}>
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          연결 반
          <select
            value={form.classId}
            onChange={(event) => changeClass(event.target.value)}
            className={managementInputClass}
          >
            <option value="">반 연결 없음</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className={managementFieldClass}>
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className={managementInputClass}
          >
            <option value="">담당자 미지정</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className={managementFieldClass}>
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className={managementInputClass}
          />
        </label>

        <label className={`${managementFieldClass} sm:col-span-2 xl:col-span-3`}>
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 보강 후보에서 제외할 개인 일정"
            className={managementInputClass}
          />
        </label>

        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-sm border border-[var(--academy-border)] bg-[var(--academy-surface)] px-3 text-sm font-medium text-[var(--academy-ink)]">
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
        <p className="mx-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className={managementActionsClass}>
        {form.mode === "edit" && form.isActive && onDelete ? (
          <button
            type="button"
            disabled={status.status === "saving"}
            onClick={onDelete}
            className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-sm border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Trash2 size={16} />
            스케줄 삭제
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={managementSecondaryButtonClass}
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className={managementPrimaryButtonClass(canSave)}
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
    <div className={managementFormShellClass}>
      <div className={managementFormHeaderClass}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--academy-ink)]">이 반 학생 전체 수업 시간 등록</p>
          <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
            {form.className} 재원 학생 전체에게 같은 요일·시간의 반복 수업을 등록합니다.
            이미 같은 시간의 활성 스케줄이 있는 학생은 자동으로 건너뜁니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="일괄 스케줄 입력 닫기"
          onClick={onCancel}
          className={managementCloseButtonClass}
        >
          <X size={15} />
        </button>
      </div>

      <div className={managementWideFormBodyClass}>
        <label className={managementFieldClass}>
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className={managementInputClass}
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">개인/기타 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <div className={`${managementFieldClass} sm:col-span-2 xl:col-span-3`}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span>요일</span>
            <span className="truncate text-xs font-normal text-[var(--academy-muted)]">
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
                      ? "border-[var(--academy-accent)] bg-[var(--academy-accent)] text-white"
                      : "border-[var(--academy-border)] bg-[var(--academy-surface)] text-[var(--academy-ink)] hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)]",
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
                      ? "border-[var(--academy-accent)] bg-[var(--academy-accent)] text-white"
                      : "border-[var(--academy-border)] bg-[var(--academy-surface)] text-[var(--academy-muted-strong)] hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)]",
                  ].join(" ")}
                  aria-pressed={isSelected}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className={managementFieldClass}>
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className={managementInputClass}
          />
        </label>

        <label className={`${managementFieldClass} sm:col-span-2`}>
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className={managementInputClass}
          />
        </label>

        <label className={managementFieldClass}>
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className={managementInputClass}
          >
            <option value="">반 담당자 사용</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className={managementFieldClass}>
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className={managementInputClass}
          />
        </label>

        <label className={`${managementFieldClass} sm:col-span-2 xl:col-span-4`}>
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 반 전체 정규 스케줄"
            className={managementInputClass}
          />
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mx-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className={managementActionsClass}>
        <button
          type="button"
          onClick={onCancel}
          className={managementSecondaryButtonClass}
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={managementPrimaryButtonClass(canSave)}
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
