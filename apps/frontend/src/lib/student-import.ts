export type StudentImportClassOption = {
  id: string;
  name: string;
};

export type StudentImportDraft = {
  rowNumber: number;
  name: string;
  className: string;
  schoolName: string;
  gradeLabel: string;
  parentName: string;
  parentPhone: string;
  studentPhone: string;
  scheduleShareConsentConfirmed: string;
  status: string;
};

export type StudentImportValidatedRow = Omit<StudentImportDraft, "scheduleShareConsentConfirmed"> & {
  classId: string | null;
  normalizedParentPhone: string;
  normalizedStudentPhone: string | null;
  scheduleShareConsentConfirmed: boolean;
  status: "active" | "paused" | "left";
  errors: string[];
};

export type StudentImportValidationResult = {
  rows: StudentImportValidatedRow[];
  validRows: StudentImportValidatedRow[];
  invalidRows: StudentImportValidatedRow[];
};

const headerMap: Record<string, keyof Omit<StudentImportDraft, "rowNumber">> = {
  "학생": "name",
  "학생명": "name",
  "이름": "name",
  "name": "name",
  "student": "name",
  "반": "className",
  "반명": "className",
  "소속반": "className",
  "class": "className",
  "classname": "className",
  "학교": "schoolName",
  "학교명": "schoolName",
  "school": "schoolName",
  "학년": "gradeLabel",
  "grade": "gradeLabel",
  "학부모": "parentName",
  "학부모명": "parentName",
  "parent": "parentName",
  "학부모연락처": "parentPhone",
  "학부모전화": "parentPhone",
  "보호자연락처": "parentPhone",
  "보호자전화": "parentPhone",
  "parentphone": "parentPhone",
  "학생연락처": "studentPhone",
  "학생전화": "studentPhone",
  "studentphone": "studentPhone",
  "타학원공유동의": "scheduleShareConsentConfirmed",
  "스케줄공유동의": "scheduleShareConsentConfirmed",
  "공유동의": "scheduleShareConsentConfirmed",
  "shareconsent": "scheduleShareConsentConfirmed",
  "scheduleshareconsent": "scheduleShareConsentConfirmed",
  "상태": "status",
  "status": "status",
};

const statusMap: Record<string, "active" | "paused" | "left"> = {
  "": "active",
  "재원": "active",
  "active": "active",
  "휴원": "paused",
  "paused": "paused",
  "퇴원": "left",
  "left": "left",
};

const consentTrueValues = new Set(["y", "yes", "true", "1", "동의", "확인", "확인완료", "o", "ㅇ"]);

export const studentImportTemplate =
  "학생명,반,학교,학년,학부모명,학부모연락처,학생연락처,타학원공유동의,상태\n" +
  "테스트학생01,UAT 중2 수학 A반,한들중,중2,테스트학생01 보호자,010-9100-0001,010-9200-0001,동의,재원\n" +
  "테스트학생02,UAT 중2 수학 A반,한들중,중2,테스트학생02 보호자,010-9100-0002,,미동의,재원\n" +
  "테스트학생03,UAT 중2 수학 A반,설화고,고1,테스트학생03 보호자,010-9100-0003,010-9200-0003,동의,재원";

export function validateStudentImportCsv(
  csvText: string,
  classes: StudentImportClassOption[],
): StudentImportValidationResult {
  const parsedRows = parseCsv(csvText);

  if (parsedRows.length === 0) {
    return { rows: [], validRows: [], invalidRows: [] };
  }

  const [headers, ...bodyRows] = parsedRows;
  const headerIndexes = buildHeaderIndexes(headers);
  const seenInFile = new Set<string>();
  const classMap = new Map(classes.map((classItem) => [normalizeHeader(classItem.name), classItem]));
  const rows = bodyRows
    .map((values, index) => toDraftRow(values, headerIndexes, index + 2))
    .filter((row) => hasAnyValue(row))
    .map((row) => validateDraftRow(row, classMap, seenInFile));

  return {
    rows,
    validRows: rows.filter((row) => row.errors.length === 0),
    invalidRows: rows.filter((row) => row.errors.length > 0),
  };
}

export function validateStudentImportDrafts(
  drafts: StudentImportDraft[],
  classes: StudentImportClassOption[],
) {
  const seenInFile = new Set<string>();
  const classMap = new Map(classes.map((classItem) => [normalizeHeader(classItem.name), classItem]));
  const rows = drafts
    .filter((row) => hasAnyValue(row))
    .map((row) => validateDraftRow(row, classMap, seenInFile));

  return {
    rows,
    validRows: rows.filter((row) => row.errors.length === 0),
    invalidRows: rows.filter((row) => row.errors.length > 0),
  };
}

export function normalizePhone(value: string) {
  const digits = restoreMissingKoreanMobileLeadingZero(value.replace(/\D/g, ""));
  return digits.length >= 8 && digits.length <= 11 ? digits : null;
}

function restoreMissingKoreanMobileLeadingZero(digits: string) {
  if (/^(10|11|16|17|18|19)\d{7,8}$/.test(digits)) {
    return `0${digits}`;
  }

  return digits;
}

export function formatPhoneForDisplay(value: string | null) {
  if (!value) {
    return "";
  }

  if (value.length === 11) {
    return `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
  }

  if (value.length === 10) {
    return `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
  }

  return value;
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(current.trim());
      rows.push(row);
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  rows.push(row);

  return rows.filter((values) => values.some((value) => value.trim().length > 0));
}

function buildHeaderIndexes(headers: string[]) {
  const indexes = new Map<keyof Omit<StudentImportDraft, "rowNumber">, number>();

  headers.forEach((header, index) => {
    const field = headerMap[normalizeHeader(header)];

    if (field && !indexes.has(field)) {
      indexes.set(field, index);
    }
  });

  return indexes;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/\s/g, "").trim().toLowerCase();
}

function toDraftRow(
  values: string[],
  headerIndexes: Map<keyof Omit<StudentImportDraft, "rowNumber">, number>,
  rowNumber: number,
): StudentImportDraft {
  const getValue = (field: keyof Omit<StudentImportDraft, "rowNumber">) => {
    const index = headerIndexes.get(field);
    return index === undefined ? "" : values[index]?.trim() ?? "";
  };

  return {
    rowNumber,
    name: getValue("name"),
    className: getValue("className"),
    schoolName: getValue("schoolName"),
    gradeLabel: getValue("gradeLabel"),
    parentName: getValue("parentName"),
    parentPhone: getValue("parentPhone"),
    studentPhone: getValue("studentPhone"),
    scheduleShareConsentConfirmed: getValue("scheduleShareConsentConfirmed"),
    status: getValue("status"),
  };
}

function validateDraftRow(
  row: StudentImportDraft,
  classMap: Map<string, StudentImportClassOption>,
  seenInFile: Set<string>,
): StudentImportValidatedRow {
  const errors: string[] = [];
  const name = row.name.trim();
  const className = row.className.trim();
  const classItem = className ? classMap.get(normalizeHeader(className)) : null;
  const normalizedParentPhone = normalizePhone(row.parentPhone);
  const normalizedStudentPhone = row.studentPhone.trim()
    ? normalizePhone(row.studentPhone)
    : null;
  const scheduleShareConsentConfirmed = parseConsentValue(row.scheduleShareConsentConfirmed);
  const normalizedStatus = statusMap[row.status.trim().toLowerCase()];

  if (!name) {
    errors.push("학생명이 필요합니다.");
  } else if (name.length > 40) {
    errors.push("학생명은 40자 이하로 입력해 주세요.");
  }

  if (className && !classItem) {
    errors.push(`반 '${className}'을 찾을 수 없습니다.`);
  }

  if (!normalizedParentPhone) {
    errors.push("학부모 연락처 형식이 올바르지 않습니다.");
  }

  if (row.studentPhone.trim() && !normalizedStudentPhone) {
    errors.push("학생 연락처 형식이 올바르지 않습니다.");
  }

  if (!normalizedStatus) {
    errors.push("상태는 재원, 휴원, 퇴원 중 하나여야 합니다.");
  }

  const duplicateKey = `${name}:${normalizedParentPhone ?? row.parentPhone.trim()}`;

  if (seenInFile.has(duplicateKey)) {
    errors.push("파일 안에 같은 학생명과 학부모 연락처가 중복됩니다.");
  }

  seenInFile.add(duplicateKey);

  return {
    ...row,
    name,
    className,
    schoolName: row.schoolName.trim(),
    gradeLabel: row.gradeLabel.trim(),
    parentName: row.parentName.trim(),
    parentPhone: row.parentPhone.trim(),
    studentPhone: row.studentPhone.trim(),
    classId: classItem?.id ?? null,
    normalizedParentPhone: normalizedParentPhone ?? "",
    normalizedStudentPhone,
    scheduleShareConsentConfirmed,
    status: normalizedStatus ?? "active",
    errors,
  };
}

function parseConsentValue(value: string) {
  const normalized = value.replace(/\s/g, "").trim().toLowerCase();
  return consentTrueValues.has(normalized);
}

function hasAnyValue(row: StudentImportDraft) {
  return [
    row.name,
    row.className,
    row.schoolName,
    row.gradeLabel,
    row.parentName,
    row.parentPhone,
    row.studentPhone,
    row.scheduleShareConsentConfirmed,
    row.status,
  ].some((value) => value.trim().length > 0);
}
