"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ClipboardList, Loader2, Plus } from "lucide-react";

export type PlatformAcademySummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  category: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  memberCount: number;
  classCount: number;
  studentCount: number;
  hasSettings: boolean;
  createdAt: string;
};

type PlatformConsoleProps = {
  academies: PlatformAcademySummary[];
};

type FormState = {
  name: string;
  slug: string;
  category: string;
  plan: string;
  status: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
};

const initialForm: FormState = {
  name: "",
  slug: "",
  category: "",
  plan: "pilot",
  status: "active",
  ownerEmail: "",
  ownerName: "",
  ownerPassword: "",
};

const academyPlans = ["pilot", "free", "starter", "standard", "pro"];
const academyStatuses = ["active", "trialing", "paused", "cancelled"];

type CreatedAcademyInfo = {
  academyName: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  loginUrl: string;
};

export function PlatformConsole({ academies }: PlatformConsoleProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [createdAcademy, setCreatedAcademy] = useState<CreatedAcademyInfo | null>(null);
  const [status, setStatus] = useState<{
    state: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ state: "idle", message: "" });
  const summary = useMemo(
    () => ({
      academies: academies.length,
      activeAcademies: academies.filter((academy) => academy.status === "active").length,
      students: academies.reduce((sum, academy) => sum + academy.studentCount, 0),
      classes: academies.reduce((sum, academy) => sum + academy.classCount, 0),
    }),
    [academies],
  );

  const loginUrl =
    typeof window === "undefined" ? "/login" : `${window.location.origin}/login`;

  function updateAcademyName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: isSlugEdited ? current.slug : createSlugSuggestion(value),
    }));
  }

  function generateTemporaryPassword() {
    setForm((current) => ({
      ...current,
      ownerPassword: createTemporaryPassword(),
    }));
  }

  async function createAcademy() {
    setStatus({ state: "saving", message: "" });
    setCreatedAcademy(null);

    try {
      const response = await fetch("/api/platform/academies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          ...form,
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "학원을 생성하지 못했습니다.");
      }

      setStatus({
        state: "saved",
        message: payload.message ?? "학원과 원장 계정을 생성했습니다.",
      });
      setCreatedAcademy({
        academyName: form.name.trim(),
        slug: form.slug.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerPassword: form.ownerPassword,
        loginUrl,
      });
      setForm(initialForm);
      setIsSlugEdited(false);
      setIsCreateOpen(false);
      router.refresh();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "학원을 생성하지 못했습니다.",
      });
    }
  }

  async function updateAcademyStatus({
    academyId,
    statusValue,
    planValue,
  }: {
    academyId: string;
    statusValue: string;
    planValue: string;
  }) {
    setStatus({ state: "saving", message: "" });

    try {
      const response = await fetch("/api/platform/academies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_status",
          academyId,
          status: statusValue,
          plan: planValue,
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "학원 상태를 수정하지 못했습니다.");
      }

      setStatus({
        state: "saved",
        message: payload.message ?? "학원 상태를 수정했습니다.",
      });
      router.refresh();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "학원 상태를 수정하지 못했습니다.",
      });
    }
  }

  const isSaving = status.state === "saving";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#315C7C]">슈퍼어드민</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950">
              플랫폼 학원 관리
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              학원 워크스페이스 생성과 상태 관리를 담당합니다. 학생 개인정보 상세는
              이 화면에서 기본 노출하지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
            className="flex min-h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            학원 생성
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="전체 학원" value={`${summary.academies}곳`} />
          <Metric label="활성 학원" value={`${summary.activeAcademies}곳`} />
          <Metric label="등록 반" value={`${summary.classes}개`} />
          <Metric label="등록 학생" value={`${summary.students}명`} />
        </div>
      </section>

      {isCreateOpen ? (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-black text-stone-950">새 학원 생성</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TextField
              label="학원명"
              value={form.name}
              onChange={updateAcademyName}
              placeholder="예: 더배움프라임영수학원"
            />
            <div className="grid gap-1">
              <TextField
                label="Slug"
                value={form.slug}
                onChange={(value) => {
                  setIsSlugEdited(true);
                  setForm((current) => ({ ...current, slug: value }));
                }}
                placeholder="예: thebaeum-prime"
              />
              <p className="text-xs leading-5 text-stone-500">
                영문 소문자, 숫자, 하이픈만 사용합니다. 학원명 입력 시 자동 후보를 채웁니다.
              </p>
            </div>
            <TextField
              label="카테고리"
              value={form.category}
              onChange={(value) => setForm((current) => ({ ...current, category: value }))}
              placeholder="예: 영어 · 수학 전문 학원"
            />
            <TextField
              label="원장 이름"
              value={form.ownerName}
              onChange={(value) => setForm((current) => ({ ...current, ownerName: value }))}
              placeholder="예: 김원장"
            />
            <TextField
              label="원장 이메일"
              value={form.ownerEmail}
              onChange={(value) => setForm((current) => ({ ...current, ownerEmail: value }))}
              placeholder="owner@example.com"
              type="email"
            />
            <div className="grid gap-1">
              <TextField
                label="임시 비밀번호"
                value={form.ownerPassword}
                onChange={(value) =>
                  setForm((current) => ({ ...current, ownerPassword: value }))
                }
                placeholder="8자 이상"
                type="text"
              />
              <button
                type="button"
                onClick={generateTemporaryPassword}
                className="min-h-9 rounded-md border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700"
              >
                임시 비밀번호 자동 생성
              </button>
            </div>
            <SelectField
              label="플랜"
              value={form.plan}
              options={academyPlans}
              onChange={(value) => setForm((current) => ({ ...current, plan: value }))}
            />
            <SelectField
              label="상태"
              value={form.status}
              options={academyStatuses}
              onChange={(value) => setForm((current) => ({ ...current, status: value }))}
            />
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={createAcademy}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#315C7C] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            학원과 원장 계정 생성
          </button>
        </section>
      ) : null}

      {status.message ? (
        <p
          className={[
            "rounded-md px-3 py-2 text-sm font-semibold",
            status.state === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800",
          ].join(" ")}
        >
          {status.message}
        </p>
      ) : null}

      {createdAcademy ? <DeliveryCard info={createdAcademy} /> : null}

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-black text-stone-950">학원 목록</h2>
        </div>
        {academies.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            아직 등록된 학원이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {academies.map((academy) => (
              <AcademyRow
                key={academy.id}
                academy={academy}
                disabled={isSaving}
                onUpdate={updateAcademyStatus}
                loginUrl={loginUrl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
    </div>
  );
}

function AcademyRow({
  academy,
  disabled,
  onUpdate,
  loginUrl,
}: {
  academy: PlatformAcademySummary;
  disabled: boolean;
  onUpdate: (payload: {
    academyId: string;
    statusValue: string;
    planValue: string;
  }) => Promise<void>;
  loginUrl: string;
}) {
  const [statusValue, setStatusValue] = useState(academy.status);
  const [planValue, setPlanValue] = useState(academy.plan);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const isChanged = statusValue !== academy.status || planValue !== academy.plan;

  return (
    <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(260px,1fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF1F8] text-[#315C7C]">
            <Building2 size={17} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-stone-950">
              {academy.name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-stone-500">
              /{academy.slug} · {academy.category ?? "카테고리 없음"}
            </span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <SmallMetric label="구성원" value={academy.memberCount} />
        <SmallMetric label="반" value={academy.classCount} />
        <SmallMetric label="학생" value={academy.studentCount} />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <SelectField
          label="플랜"
          value={planValue}
          options={academyPlans}
          onChange={setPlanValue}
        />
        <SelectField
          label="상태"
          value={statusValue}
          options={academyStatuses}
          onChange={setStatusValue}
        />
        <button
          type="button"
          disabled={disabled || !isChanged}
          onClick={() =>
            onUpdate({
              academyId: academy.id,
              statusValue,
              planValue,
            })
          }
          className="min-h-10 rounded-md border border-[#315C7C] px-3 text-xs font-semibold text-[#315C7C] disabled:border-stone-200 disabled:text-stone-400"
        >
          저장
        </button>
      </div>
      <p className="text-xs text-stone-500 lg:col-span-3">
        원장: {academy.ownerName ?? "미지정"} · {academy.ownerEmail ?? "이메일 없음"}
      </p>
      <div className="flex flex-wrap gap-1.5 lg:col-span-3">
        <StatusBadge active={Boolean(academy.ownerEmail)} label="원장 연결됨" />
        <StatusBadge active={academy.hasSettings} label="설정 생성됨" />
        <StatusBadge active={academy.classCount === 0} label="반 0개" />
        <StatusBadge active={academy.studentCount === 0} label="학생 0명" />
        <StatusBadge active={Boolean(academy.ownerEmail && academy.hasSettings)} label="/app 연결 준비" />
      </div>
      <div className="lg:col-span-3">
        <button
          type="button"
          onClick={() => setIsDeliveryOpen((current) => !current)}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700"
        >
          <ClipboardList size={14} />
          원장에게 전달할 정보 보기
        </button>
        {isDeliveryOpen ? (
          <div className="mt-2 rounded-lg border border-[#D8E6F1] bg-[#F5FAFE] p-3 text-xs leading-6 text-stone-700">
            <p className="font-black text-stone-950">{academy.name} 전달 정보</p>
            <p>로그인 주소: {loginUrl}</p>
            <p>로그인 이메일: {academy.ownerEmail ?? "원장 이메일 없음"}</p>
            <p>임시 비밀번호: 생성 직후 카드에서만 확인 가능합니다.</p>
            <p className="mt-1 text-stone-500">
              원장이 로그인하면 `/app`에서 이 학원 워크스페이스로 바로 연결됩니다.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeliveryCard({ info }: { info: CreatedAcademyInfo }) {
  return (
    <section className="rounded-xl border border-[#BFD7EA] bg-[#F4FAFF] p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#315C7C] text-white">
          <CheckCircle2 size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-stone-950">
            {info.academyName} 생성 완료
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            아래 정보를 원장에게 전달하면 바로 로그인해서 학원 워크스페이스를 확인할 수 있습니다.
          </p>
          <div className="mt-3 grid gap-2 rounded-lg border border-[#D8E6F1] bg-white p-3 text-sm">
            <CopyLine label="로그인 주소" value={info.loginUrl} />
            <CopyLine label="로그인 이메일" value={info.ownerEmail} />
            <CopyLine label="임시 비밀번호" value={info.ownerPassword} />
            <CopyLine label="학원 slug" value={info.slug} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-center">
      <span className="text-xs font-semibold text-stone-500">{label}</span>
      <code className="break-all rounded bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-950">
        {value}
      </code>
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[11px] font-bold",
        active ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md bg-stone-50 px-2 py-2">
      <span className="block text-[11px] font-semibold text-stone-500">{label}</span>
      <span className="mt-0.5 block text-sm font-black text-stone-950">{value}</span>
    </span>
  );
}

function createSlugSuggestion(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/academy|학원/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized) {
    return normalized;
  }

  const hash = Array.from(value.trim())
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
    .toString(36);

  return hash === "0" ? "" : `academy-${hash}`;
}

function createTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(10);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-stone-600">
      {label}
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-stone-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
