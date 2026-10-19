---
name: following-health-note-backend-boundaries
description: Apply Health Note boundaries when writing, reviewing, or refactoring src/api, Supabase client and auth infrastructure, database contracts, RLS, migrations, or environment configuration. React UI, feature calculations, and Query cache design use the frontend-style skill.
---

# Health Note API·백엔드 경계

현재 React/Vite 앱의 Supabase 데이터 접근과 인증·DB 계약을 다룬다. Supabase API·CLI 사용법은 변경 시 현재 공식 문서와 설치 버전을 확인한다. 다른 프로젝트의 구조·정책을 근거 없이 도입하지 않는다.

## 배치와 책임

- 서버 요청 함수는 `src/api/<domain>/index.ts`, API 요청·응답·DB row 타입은 같은 도메인의 `type.ts`에 둔다. 작은 내부 타입을 위해 파일을 미리 만들지는 않는다.
- 인증은 `api/auth`, 운동은 `api/exercise`, 루틴과 완료 기록은 `api/routine`에서 관리한다. 완료 기록만을 위한 별도 API 파일은 책임이 커질 때 검토한다.
- 공통 Supabase 클라이언트는 `src/lib/supabase.ts`, 현재 사용자 정보는 `src/lib/auth/currentUser.ts`에 둔다.
- API는 queries·feature·React 훅·QueryClient를 참조하지 않는다. Query 키·캐시 갱신은 src/queries/, 토스트·오류 안내·화면 이동은 feature·page가 담당한다.
- 일정 계산·미루기 조건·편집 시 이력 유지 정책은 feature에 남기고, 저장 요청과 버전 조건은 API가 전달한다.
- 현재 Supabase SDK를 사용한다. 별도 HTTP client나 공통 요청 추상화는 실제 요구가 있을 때 도입한다.

## 데이터 계약과 충돌

- DB row 타입은 `T` 접두사와 `Row` 접미사를 사용한다. DB의 snake_case를 API에서 앱용 camelCase로 변환하고 조회할 column을 명시한다.
- DB 오류를 빈 결과로 숨기지 않는다. API 계약에 정의된 실패 결과를 성공으로 처리하지 않는다.
- 충돌 감지·덮어쓰기·재시도 정책은 해당 기능의 요구사항과 API·DB 계약에서 확인한다. 특정 비교 조건이나 저장 정책을 모든 기능에 일괄 적용하지 않는다.
- 루틴과 운동 연결의 원자적 저장, 루틴에 포함된 운동의 삭제 제한, 완료 기록의 중복 방지·삭제 정책을 변경할 때 API와 SQL 계약을 함께 확인한다.
- 조회의 AbortSignal 전달을 유지하고 API 계층에 캐시나 화면 상태를 추가하지 않는다.

## 인증과 환경

- Google OAuth는 PKCE를 사용한다. 인증 URL 생성은 API, 실제 페이지 이동은 feature가 담당한다. 세션 복원·이벤트 구독은 useAuthSession이 담당한다.
- 현재 사용자 ID는 요청 구성에 사용하는 값이며 보안 경계가 아니다. AuthBoundary의 화면 차단과 별개로 DB·RPC에서 auth.uid() 기준 소유권을 검증한다. 클라이언트가 보낸 user_id·owner_id를 신뢰하지 않는다.
- 브라우저 공개 값은 VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY다. Google Secret·service_role·secret key에는 VITE_ 접두사를 붙이거나 브라우저 코드에 포함하지 않는다.
- Google 자격 증명은 루트 .env와 supabase/config.toml의 env 참조를 사용한다. 비밀값은 코드·예시·로그·보고서에 출력하지 않는다.
- 로컬 개발은 .env.development의 Docker Supabase, 운영 빌드는 .env.production 또는 호스팅 환경 변수를 사용한다. Vite의 로컬·운영 연결 보호와 Docker의 loopback 바인딩을 유지한다.
- 운영 URL·배포 커밋·정책·마이그레이션 상태는 현재 대상에서 확인하고, 과거 README나 로컬 파일만으로 운영 적용을 단정하지 않는다.
- 운영의 임시 테스트 데이터 생성은 목적·범위를 설명하고 명시적 승인을 받은 뒤 수행한다. 로컬·모의 API 검증을 위해 운영 데이터를 사용하지 않는다.

## DB와 검증

- 실제 스키마 기준은 supabase/migrations/다. supabase/schema.sql은 미적용 초안이며 기준으로 삼지 않는다.
- 새 migration은 설치된 CLI의 migration new로 생성한다. 운영에 적용된 migration을 고치지 않고 새 파일로 변경한다. 적용 전 대상과 migration 이력을 확인한다.
- 노출 테이블에는 필요한 grant와 사용자 소유 RLS를 함께 둔다. UPDATE는 SELECT 정책과 USING·WITH CHECK를 함께 확인한다.
- RPC는 SECURITY INVOKER를 우선하고 인증·소유권·트랜잭션을 보존한다. 권한 오류를 피하려고 SECURITY DEFINER로 바꾸지 않는다.
- TypeScript 변경은 lint·typecheck, 환경·빌드 설정 변경은 build도 확인한다. API 변경은 관련 요청·실패 경계와 해당 기능에 정의된 충돌 동작을 적절한 테스트 수단으로 검증한다.
- 정책·제약·RPC 변경은 로컬 Supabase에서 npm run db:test로 검증한다. 모의 응답 기반 테스트 통과를 실제 DB 권한이나 Google OAuth 성공으로 보고하지 않는다.

## 완료 전 검토와 검증

- 제품 코드 변경은 완료 보고 전에 [self-review-health-note-changes](../../../../.agents/skills/self-review-health-note-changes/SKILL.md)를 적용하고, [test-feature-behavior](../../../../.agents/skills/test-feature-behavior/SKILL.md)와 프로젝트 지침에 따라 필요한 검증을 수행한다. 검증 중 코드를 수정하면 영향을 받는 부분을 다시 검토·검증한다.
- 별도 읽기 전용 리뷰에서는 코드 수정이나 테스트를 자동 실행하지 않는다.
