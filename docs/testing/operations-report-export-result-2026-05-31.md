# 운영 리포트/CSV 내보내기 결과

날짜: 2026-05-31
관련 티켓: T-213, T-446

## 구현 결과

- 관리 탭에 `리포트` 메뉴를 추가했다.
- 기간 필터는 `오늘`, `최근 7일`, `이번 달`로 제한했다.
- 요약 카드 4개를 제공한다.
  - 출석 처리: 출석, 지각, 결석, 확인 필요, 미체크
  - 문자 기록: dry-run, 실발송, 실패, LMS
  - 학생 운영: 재원 학생 수, 반 수, 스케줄 미등록 학생 수
  - 최근 변경: 감사 로그 건수
- CSV 내보내기 4종을 추가했다.
  - 학생 목록
  - 출석 기록
  - 문자 기록
  - 변경 이력
- CSV는 UTF-8 BOM을 포함한다.
- 전화번호는 기본 마스킹이고, 원장/관리자만 `원문 포함` 옵션을 켤 수 있다.

## API

- `GET /api/reports/summary?range=today|7d|month`
- `GET /api/reports/export?type=students|attendance|messages|audit&range=today|7d|month&includePrivate=true|false`

## 권한

- 원장/관리자만 리포트 API를 사용할 수 있다.
- 선생님/보조 선생님은 관리 탭 접근 제한과 서버 권한 검사로 차단된다.
- 모든 조회는 현재 로그인 사용자의 `academy_id` 기준으로만 수행한다.

## 검증

- `npm run lint`: 통과
- `npx tsc --noEmit`: 통과
- `npm run build`: 통과

## 남은 확인

- 운영형 200명 seed 기준으로 CSV가 Excel/Numbers에서 정상 열리는지 실제 파일 확인이 필요하다.
- Production 배포 후 원장 계정에서 브라우저 다운로드 동작을 확인해야 한다.
- PDF 리포트, 차트, 감사 로그 상세 검색은 후속으로 둔다.
