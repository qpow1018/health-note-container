# 아키텍처

현재 코드의 책임과 주요 데이터 흐름을 설명한다. 작성 규칙은 [AGENTS.md](../AGENTS.md), 제품 동작 정책은 [제품 동작 정책](./behavior-decisions.md), 실행·환경·검증 명령은 [README](../README.md)를 참고한다.

## 앱과 인증

React 19·TypeScript·Vite 기반 모바일 웹앱이며 React Router와 SCSS Modules를 사용한다.

- [App.tsx](../src/app/App.tsx): 공유 QueryProvider, BrowserRouter, 인증 경계와 라우트를 조립한다. 홈·운동 목록·루틴 목록·마이페이지에는 하단 내비게이션을 제공한다.
- [AuthBoundary.tsx](../src/app/AuthBoundary.tsx): 세션 복원 중에는 대기 화면, 비로그인 상태에서는 로그인 화면을 표시한다. 로그인한 사용자 ID를 key로 하위 화면을 재마운트하고 AuthUserContext로 현재 사용자 정보를 전달한다. 마이페이지는 이 정보를 표시하며 별도 인증 구독이나 사용자 조회를 만들지 않는다.
- [useAuthSession.ts](../src/features/auth/useAuthSession.ts): 세션 복원과 인증 이벤트 구독을 처리한다. 사용자 변경 시 현재 사용자 정보를 갱신하고 공유 QueryClient의 캐시를 비운다.
- [QueryProvider.tsx](../src/lib/query/QueryProvider.tsx): 캐시 초기화에 사용하는 것과 동일한 QueryClient를 제공한다.

현재 인증 구현은 사용자별 재마운트와 캐시 초기화를 함께 사용해 이전 계정의 데이터·편집 상태가 이어지지 않도록 한다. 보안 경계는 클라이언트의 화면 차단이 아니라 DB의 사용자 소유 RLS다.

## 책임과 위치

| 위치                     | 책임                                                  |
| ------------------------ | ----------------------------------------------------- |
| `src/app/`               | Provider·인증 경계·레이아웃·라우트 조립               |
| `src/pages/<domain>/`    | URL 해석·화면 조립·사용자 안내·저장 후 이동           |
| `src/features/<domain>/` | 폼·검증·일정 계산·기능별 화면 로직                    |
| `src/queries/`           | 조회·mutation 훅·Query 키·캐시 갱신·재조회 설정       |
| `src/api/<domain>/`      | 서버 요청·응답 변환·API와 DB 경계 타입                |
| `src/lib/`               | Supabase 클라이언트·현재 사용자 정보·공유 QueryClient |
| `src/components/common/` | 도메인과 무관한 공용 UI                               |
| `src/styles/`            | 폰트·테마·공통 토큰·전역 스타일                       |
| `tests/`                 | Playwright 테스트와 모의 API                          |
| `supabase/migrations/`   | DB 테이블·RLS·제약·RPC의 버전 관리                    |

API는 Query 캐시나 화면에 의존하지 않고, queries는 feature·page·라우터에 의존하지 않는다. 완료 기록 API는 routine 도메인에 포함한다. `supabase/schema.sql`은 미적용 초안이므로 실제 스키마 판단에는 migrations를 사용한다.

## 조회와 저장 흐름

조회는 `page/feature → query 훅 → API → Supabase`로 진행한다. Query 훅은 도메인 객체를 default export하며, 화면은 `exerciseQuery.useGetExercises()`, `routineQuery.useGetRoutines()`처럼 호출한다. API는 DB의 snake_case를 앱의 camelCase로 변환하고, Query는 서버 상태를 관리하며, 화면은 로딩·오류·빈 상태를 표시한다.

저장은 화면에서 요청 값을 준비해 mutation에 전달한다. API 결과에 따라 Query 캐시를 갱신하고, 화면에서 실패 안내나 성공 후 이동을 처리한다. 폼 초안·미저장 정렬은 서버 캐시와 별도의 편집 상태다.

운동 목록·상세·수정은 [exerciseQuery.ts](../src/queries/exerciseQuery.ts)의 사용자별 목록 캐시를 공유한다. 상세·수정 화면은 이 목록에서 URL의 ID에 해당하는 운동을 선택한다. 별도 상세 API는 사용하지 않는다. 루틴도 [routineQuery.ts](../src/queries/routineQuery.ts)의 사용자별 목록 캐시를 목록·상세·수정·정렬·홈에서 공유한다. 화면별 조회 래퍼나 라우터 키로 나눈 캐시는 두지 않는다.

루틴 수정은 편집 시작 시 원본을 보관해 재조회 이후에도 충돌 검사와 미루기 이력 유지의 기준으로 사용한다. 폼 초안과 미저장 정렬은 재조회 실패·복구로 초기화하지 않는다. 기존 데이터가 있으면 오류 안내와 함께 유지한다. 홈은 완료 상태를 잘못 표시하지 않도록 조회 오류 중에는 완료 조작 영역을 표시하지 않는다.

## 캐시 정책의 현재 구현

[queryClient.ts](../src/lib/query/queryClient.ts)의 공통 설정은 `staleTime` 1분, 조회 `retry: false`다. `gcTime`은 라이브러리 기본값인 5분이며, 포커스·재연결 재조회도 기본값을 사용한다. 1분은 자동 갱신 주기가 아니라 데이터를 최신 상태로 간주하는 시간이다. 주기적 폴링이나 실시간 구독을 뜻하지 않는다.

- 운동·루틴 mutation은 성공 시 관련 목록을 무효화하고, 사용 중인 Query를 기본 동작으로 재조회한다. 완료 기록은 저장 성공 시 요청한 사용자·날짜 캐시의 해당 항목을 갱신하고 그 Query를 무효화한다. 갱신 전에 진행 중인 해당 조회를 취소하여 이전 응답이 성공 기록을 덮지 않게 한다. 홈은 저장 중인 항목의 변경을 조회 결과 위에 즉시 표시하고, 실패 시 해당 변경만 제거한다. 잠금은 같은 날짜·루틴·운동에 한정하며 다른 운동은 계속 저장할 수 있다. 충돌 결과는 성공 갱신으로 처리하지 않는다.
- 홈의 완료 기록 조회도 공통 Query의 포커스·재연결 정책을 사용한다. 별도 focus·pageshow 강제 재조회는 두지 않는다.

이 설정은 현재 구현 설명이며 모든 도메인에 강제할 규칙은 아니다.

## 검증 경계

브라우저 테스트는 인증과 데이터 API를 모의 응답으로 제어한다. fixture의 localStorage는 테스트 데이터 저장 수단이며 제품의 저장소가 아니다. 실제 데이터는 계정별 Supabase DB에 저장한다.

DB 제약·RLS·RPC는 로컬 Supabase의 DB 테스트로 확인한다. 모의 API 테스트는 실제 Google 인증·운영 DB·Android 실기기 동작의 증거가 아니다. 실행 방법과 환경은 README를 참고한다.


## Android 걸음 카드

홈은 [StepCard](../src/features/steps/StepCard.tsx)를 오늘 루틴 위에 조립한다. Android 네이티브 모듈의 응답을 받은 경우에만 표시하며 일반 브라우저·iOS·이전 APK에는 표시하지 않는다. 센서 측정과 기기 저장은 앱이 담당하고 권한 요청과 기본 자동 기록 시작은 앱이 담당하고 웹은 상태 조회·오늘 기록 초기화 요청과 결과 표시만 담당한다. 켜기·끄기 버튼은 제공하지 않는다. 서버 상태가 아니므로 Query 캐시나 API 계층을 추가하지 않는다.

홈이 보이는 동안 5초마다 최신 상태를 조회하고 문서가 다시 보일 때도 갱신한다. 날짜가 다른 이전 응답의 걸음수는 오늘 값으로 표시하지 않는다. 계정별 운동·루틴과 달리 걸음 기록은 휴대폰에 귀속되며 카드에 기기 내부 저장을 안내한다. 메시지 계약과 서비스·날짜 경계는 [앱 아키텍처](../../health-note-app/docs/architecture.md#android-자동-걸음-기록)를 참고한다.
