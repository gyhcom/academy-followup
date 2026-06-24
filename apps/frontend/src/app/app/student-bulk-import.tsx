"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Save, X } from "lucide-react";
import type { FormStatus, ManagementClass } from "@/app/app/management-types";
import {
  formatPhoneForDisplay,
  normalizePhone,
  studentImportTemplate,
  type StudentImportValidatedRow,
  validateStudentImportCsv,
} from "@/lib/student-import";

export function StudentBulkImportForm({
  classes,
  existingStudents,
  status,
  onCancel,
  onSubmit,
}: {
  classes: ManagementClass[];
  existingStudents: Array<{
    name: string;
    parentPhone: string;
  }>;
  status: FormStatus;
  onCancel: () => void;
  onSubmit: (rows: StudentImportValidatedRow[]) => void;
}) {
  const [csvText, setCsvText] = useState(studentImportTemplate);
  const validation = useMemo(
    () => validateStudentImportCsv(csvText, classes),
    [classes, csvText],
  );
  const existingStudentKeys = useMemo(
    () =>
      new Set(
        existingStudents
          .map((student) => createStudentImportKey(student.name, student.parentPhone))
          .filter((key): key is string => Boolean(key)),
      ),
    [existingStudents],
  );
  const previewRows = useMemo(
    () =>
      validation.rows.map((row) => {
        const duplicateKey = createStudentImportKey(row.name, row.normalizedParentPhone);

        if (!duplicateKey || !existingStudentKeys.has(duplicateKey)) {
          return row;
        }

        return {
          ...row,
          errors: [...row.errors, "이미 등록된 학생입니다."],
        };
      }),
    [existingStudentKeys, validation.rows],
  );
  const validRows = previewRows.filter((row) => row.errors.length === 0);
  const invalidRows = previewRows.filter((row) => row.errors.length > 0);
  const existingDuplicateCount = previewRows.filter((row) =>
    row.errors.includes("이미 등록된 학생입니다."),
  ).length;
  const canSubmit = validRows.length > 0 && status.status !== "saving";

  async function readCsvFile(file: File | null) {
    if (!file) {
      return;
    }

    setCsvText(await file.text());
  }

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF", studentImportTemplate], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "academy-students-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-4 min-w-0 overflow-hidden border border-[#D8D6DE] bg-[#FFFEFA] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">학생 CSV 일괄 등록</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            엑셀에서 열 때 한글이 깨지지 않는 CSV 템플릿을 내려받을 수 있습니다. 반 이름은 현재
            등록된 반 이름과 정확히 일치해야 하며, 이미 등록된 학생은 미리보기에서 제외됩니다.
            `010` 앞자리 0이 엑셀에서 사라진 휴대폰 번호는 등록 전에 자동으로 보정합니다. 타 학원
            공유 동의는 `동의`, `Y`, `true` 중 하나로 입력하면 반영됩니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="학생 일괄 등록 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center border border-[#D8D6DE] bg-[#FFFEFA] text-stone-600 transition hover:bg-[#F7F7FA]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 border border-[#D8D6DE] bg-[#FFFEFA] px-3 text-sm font-semibold text-stone-800 transition hover:bg-[#F7F7FA] sm:w-auto">
              <FileSpreadsheet size={16} />
              CSV 파일 선택
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => void readCsvFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex min-h-11 w-full items-center justify-center gap-2 border border-[#D8D6DE] bg-[#FFFEFA] px-3 text-sm font-semibold text-stone-800 transition hover:bg-[#F7F7FA] sm:w-auto"
            >
              <Download size={16} />
              템플릿 다운로드
            </button>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-stone-800">
            CSV 내용
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={12}
              spellCheck={false}
              className="min-h-72 w-full min-w-0 resize-y border border-[#D8D6DE] bg-[#FFFEFA] px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-[#494d5a] focus:ring-2 focus:ring-[#f6f7f8]"
            />
          </label>
        </div>

        <div className="min-w-0 border border-[#D8D6DE] bg-[#FFFEFA]">
          <div className="grid grid-cols-3 divide-x divide-[#E4E1DC] border-b border-[#D8D6DE] bg-[#F4F4F1] text-center">
            <ImportStat label="전체" value={`${validation.rows.length}명`} />
            <ImportStat label="등록 가능" value={`${validRows.length}명`} tone="good" />
            <ImportStat label="확인 필요" value={`${invalidRows.length}명`} tone="bad" />
          </div>

          {existingDuplicateCount > 0 ? (
            <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              이미 등록된 학생 {existingDuplicateCount}명은 저장 대상에서 제외됩니다.
            </p>
          ) : null}

          <div className="max-h-[420px] overflow-y-auto">
            {previewRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-stone-500">
                CSV 데이터를 입력하면 미리보기가 표시됩니다.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {previewRows.slice(0, 80).map((row) => (
                  <ImportPreviewRow key={`${row.rowNumber}-${row.name}-${row.parentPhone}`} row={row} />
                ))}
              </div>
            )}
          </div>

          {validation.rows.length > 80 ? (
            <p className="border-t border-[#D8D6DE] px-3 py-2 text-xs text-stone-500">
              화면에는 80명까지만 미리보기로 표시합니다. 실제 등록은 유효한 전체 행을 처리합니다.
            </p>
          ) : null}
        </div>
      </div>

      {status.status === "saved" || status.status === "error" ? (
        <p
          className={[
            "mt-3 border px-3 py-2 text-sm",
            status.status === "saved"
              ? "border-[#D8D6DE] bg-[#F4F4F1] text-[#2f3437]"
              : "border-red-200 bg-red-50 text-red-900",
          ].join(" ")}
        >
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full min-w-0 border border-[#D8D6DE] bg-[#FFFEFA] px-4 text-sm font-semibold text-stone-700 transition hover:bg-[#F7F7FA] sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(validRows)}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold sm:w-auto",
            canSubmit ? "bg-[#494d5a] text-white hover:bg-[#2f3437]" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "등록 중" : `${validRows.length}명 등록`}
        </button>
      </div>
    </div>
  );
}

function ImportStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}) {
  const valueClass =
    tone === "good" ? "text-[#494d5a]" : tone === "bad" ? "text-red-700" : "text-stone-950";

  return (
    <div className="min-w-0 px-3 py-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function ImportPreviewRow({ row }: { row: StudentImportValidatedRow }) {
  const isValid = row.errors.length === 0;

  return (
    <div className="grid min-w-0 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
            {row.rowNumber}행
          </span>
          <p className="min-w-0 truncate text-sm font-semibold text-stone-950">{row.name || "학생명 없음"}</p>
          <span
            className={[
              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
              isValid ? "bg-[#f6f7f8] text-[#2f3437]" : "bg-red-50 text-red-800",
            ].join(" ")}
          >
            {isValid ? "등록 가능" : "확인 필요"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-stone-500">
          {row.className || "반 미배정"} · {row.schoolName || "학교 미입력"} · {row.gradeLabel || "학년 미입력"}
        </p>
        <p className="mt-1 truncate text-xs text-stone-500">
          학부모 {row.parentName || "미입력"} · {formatPhoneForDisplay(row.normalizedParentPhone || null) || row.parentPhone || "연락처 없음"}
        </p>
        {row.errors.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs leading-5 text-red-700">
            {row.errors.map((error) => (
              <li key={error}>- {error}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="text-left text-xs font-medium text-stone-500 sm:text-right">
        <p>{row.status === "active" ? "재원" : row.status === "paused" ? "휴원" : "퇴원"}</p>
        <p className={row.scheduleShareConsentConfirmed ? "text-[#494d5a]" : "text-stone-400"}>
          {row.scheduleShareConsentConfirmed ? "공유 동의" : "공유 미동의"}
        </p>
      </div>
    </div>
  );
}

function createStudentImportKey(name: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedName = name.trim();

  if (!normalizedName || !normalizedPhone) {
    return null;
  }

  return `${normalizedName}:${normalizedPhone}`;
}
