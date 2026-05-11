# 권한/역할 매트릭스

Academy Follow-up의 학원 내부 역할은 `owner`, `manager`, `teacher`, `assistant` 네 가지입니다.

## 역할 정의

| 역할 | 의미 | 기본 범위 |
| --- | --- | --- |
| `owner` | 원장/대표 | 학원 전체 운영, 관리, 설정 |
| `manager` | 데스크/관리자 | 학원 전체 운영, 관리, 설정 |
| `teacher` | 정규 선생님 | 담당 반 학생 조회, 출석 수정, 팔로업 작성/발송 |
| `assistant` | 보조 선생님 | 담당 반 학생 조회, 출석 수정, 팔로업 작성. 실제 발송은 학원 설정에 따름 |

## 기능별 권한

| 기능 | owner | manager | teacher | assistant |
| --- | --- | --- | --- | --- |
| 운영 보드 조회 | 전체 | 전체 | 담당 반 | 담당 반 |
| 출석부 조회/수정 | 전체 | 전체 | 담당 반 | 담당 반 |
| 학생/반 관리 | 가능 | 가능 | 불가 | 불가 |
| 구성원/설정 관리 | 가능 | 가능 | 불가 | 불가 |
| 문자 미리보기 | 전체 | 전체 | 담당 반 | 담당 반 |
| 팔로업 기록 생성 | 전체 | 전체 | 담당 반 | 담당 반 |
| 문자 발송 | 전체 | 전체 | 담당 반 | 설정 허용 시 담당 반 |

## 구현 기준

- 공통 권한 판단은 `src/lib/permissions.ts`를 기준으로 합니다.
- 담당 반 기준 권한은 `classes.teacher_id === auth.user.id`로 판단합니다.
- `assistant`의 실제 발송은 `academy_settings.allow_assistant_send`가 `true`일 때만 허용합니다.
- UI에서 관리 탭은 owner/manager에게만 노출하고, API에서도 같은 기준으로 다시 검증합니다.

## 현재 배정 모델

- `classes.teacher_id`는 반의 주 담당 선생님입니다.
- `students.class_id`는 학생의 소속 반입니다.
- 학생 스케줄은 `student_schedules.student_id`를 기준으로 저장하고, 필요하면 `class_id`, `teacher_id`를 함께 연결합니다.
- 파일럿 단계에서는 한 반에 주 담당자 1명을 두는 방식으로 운영합니다.
- 보조 선생님을 한 반에 여러 명 배정하는 구조는 아직 DB 모델에 넣지 않습니다. 필요성이 확인되면 `class_staff_assignments` 같은 별도 조인 테이블로 확장합니다.
- 스케줄 삭제는 실제 삭제가 아니라 `student_schedules.is_active=false`로 처리해 운영 화면과 보강 후보에서 제외합니다.
