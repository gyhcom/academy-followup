"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Save, X } from "lucide-react";
import type { FormStatus, ManagementClass } from "@/app/app/management-types";
import {
  formatPhoneForDisplay,
  studentImportTemplate,
  type StudentImportValidatedRow,
  validateStudentImportCsv,
} from "@/lib/student-import";

export function StudentBulkImportForm({
  classes,
  status,
  onCancel,
  onSubmit,
}: {
  classes: ManagementClass[];
  status: FormStatus;
  onCancel: () => void;
  onSubmit: (rows: StudentImportValidatedRow[]) => void;
}) {
  const [csvText, setCsvText] = useState(studentImportTemplate);
  const validation = useMemo(
    () => validateStudentImportCsv(csvText, classes),
    [classes, csvText],
  );
  const canSubmit = validation.validRows.length > 0 && status.status !== "saving";

  async function readCsvFile(file: File | null) {
    if (!file) {
      return;
    }

    setCsvText(await file.text());
  }

  function downloadTemplate() {
    const blob = new Blob([studentImportTemplate], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "academy-students-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-4 min-w-0 overflow-hidden rounded-xl border border-sky-200 bg-sky-50/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">학생 CSV 일괄 등록</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            엑셀에서 CSV로 저장한 뒤 붙여넣거나 파일을 선택합니다. 반 이름은 현재 등록된 반 이름과
            정확히 일치해야 합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="학생 일괄 등록 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 sm:w-auto">
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 sm:w-auto"
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
              className="min-h-72 w-full min-w-0 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </div>

        <div className="min-w-0 rounded-lg border border-stone-200 bg-white">
          <div className="grid grid-cols-3 divide-x divide-stone-200 border-b border-stone-200 text-center">
            <ImportStat label="전체" value={`${validation.rows.length}명`} />
            <ImportStat label="등록 가능" value={`${validation.validRows.length}명`} tone="good" />
            <ImportStat label="확인 필요" value={`${validation.invalidRows.length}명`} tone="bad" />
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {validation.rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-stone-500">
                CSV 데이터를 입력하면 미리보기가 표시됩니다.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {validation.rows.slice(0, 80).map((row) => (
                  <ImportPreviewRow key={`${row.rowNumber}-${row.name}-${row.parentPhone}`} row={row} />
                ))}
              </div>
            )}
          </div>

          {validation.rows.length > 80 ? (
            <p className="border-t border-stone-200 px-3 py-2 text-xs text-stone-500">
              화면에는 80명까지만 미리보기로 표시합니다. 실제 등록은 유효한 전체 행을 처리합니다.
            </p>
          ) : null}
        </div>
      </div>

      {status.status === "saved" || status.status === "error" ? (
        <p
          className={[
            "mt-3 rounded-md border px-3 py-2 text-sm",
            status.status === "saved"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
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
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 sm:w-auto"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(validation.validRows)}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto",
            canSubmit ? "bg-stone-950 text-white" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "등록 중" : `${validation.validRows.length}명 등록`}
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
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-stone-950";

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
              isValid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800",
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
        {row.status === "active" ? "재원" : row.status === "paused" ? "휴원" : "퇴원"}
      </div>
    </div>
  );
}
