# 제품 동작 정책

사용자의 기록·일정에 영향을 주는 서비스 동작을 정리한다. 구현 방식, 캐시 설정, 리팩터링 이력은 다루지 않는다. 아래는 현재 코드와 테스트에서 확인한 정책이며, 선택 이유가 확인되지 않은 내용에 이유를 덧붙이지 않았다. 요구사항이 바뀌면 관련 코드·테스트와 함께 갱신한다.

## 운동 연결 해제와 데이터 삭제는 다르게 처리한다

- 루틴에서 운동을 제외해도 해당 운동의 기존 완료 기록은 남는다. 현재 루틴의 진행률 계산에서는 제외한다.
- 루틴 자체를 삭제하면 그 루틴의 완료 기록도 삭제한다.
- 운동 자체를 삭제하면 그 운동의 완료 기록도 삭제한다. 다만 루틴에 포함된 운동은 먼저 모든 루틴에서 연결을 제거해야 삭제할 수 있다.

근거: [완료 기록 DB 계약](../supabase/migrations/20261016111342_create_routine_progress.sql), [루틴 연결 DB 계약](../supabase/migrations/20261016090226_create_routines.sql), [홈 진행률 계산](../src/features/routine/homeRoutines/HomeRoutines.tsx). 관련 테스트: [완료 기록 보존·삭제](../supabase/tests/progress.test.sql).

## 루틴 활성화는 일정이나 기록을 초기화하지 않는다

새 루틴은 비활성 상태로 시작한다. 홈의 오늘 운동 대상은 활성화된 루틴 중 오늘 일정에 해당하는 루틴이다. 관리 목록에서는 비활성 루틴도 확인할 수 있다.

활성화·비활성화는 루틴의 운동 구성·일정·미루기 내역과 기존 완료 기록을 초기화하지 않는다. 다시 활성화할 때 활성화 날짜를 새로운 시작일로 삼지 않고 기존 일정으로 예정일을 계산한다.

근거: [루틴 DB 계약](../supabase/migrations/20261016090226_create_routines.sql), [활성 상태 변경](../src/api/routine/index.ts), [홈 대상 선택](../src/features/routine/homeRoutines/HomeRoutines.tsx), [일정 계산](../src/features/routine/routineSchedule.ts). 관련 테스트: [활성 상태](../tests/routine-active.spec.ts), [다음 예정일](../tests/routine-next-date.spec.ts).

## 반복 일정 변경 시 미루기 내역을 구분한다

간격 반복 루틴의 이름·메모·운동 구성만 수정하고 시작일과 반복 간격을 유지하면 기존 미루기 내역도 유지한다. 시작일이나 반복 간격을 바꾸면 미루기 내역을 초기화한다. 요일 반복으로 바꿀 때도 기존 간격 반복의 미루기 내역을 이어받지 않는다.

근거: [루틴 수정 값 준비](../src/features/routine/routineActions.ts), [폼 안내](../src/features/routine/routineForm/RoutineForm.tsx). 관련 테스트: [일정 수정과 미루기 내역](../tests/routine-postpone.spec.ts).

## 루틴 저장은 입력 검증 후 운동 존재 여부를 확인한다

루틴 폼은 이름·운동 선택·반복 일정의 입력 오류를 먼저 안내한다. 유효한 입력에 대해서만 운동 목록을 재조회해 선택한 운동이 여전히 존재하는지 확인하고 저장한다. 조회 실패는 운동 목록 오류 영역에서 한 번만 안내하며 입력을 유지한다. 운동 선택을 다시 열어 조회에 성공하면 저장을 재시도할 수 있다.

근거: [루틴 폼](../src/features/routine/routineForm/RoutineForm.tsx). 관련 테스트: [입력 검증 순서와 조회 실패 복구](../tests/routine-refetch.spec.ts).
