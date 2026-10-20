---
name: following-health-note-frontend-style
description: Apply Health Note conventions when writing, reviewing, or refactoring React UI, feature logic, TanStack Query, mobile layouts, SCSS, or browser storage. API requests, Supabase auth infrastructure, and DB contracts use the backend-boundaries skill.
---

# Health Note 프론트엔드 스타일

## 구조

- 앱 레이아웃·라우트 조립은 src/app/, 페이지는 src/pages/<domain>/에 둔다.
- 페이지는 URL 파라미터 해석, 화면 조립, 저장 후 이동을 담당하고 페이지 전용 스타일을 같은 폴더에 둔다.
- 도메인 폼·검증·일정 계산·기능별 화면 로직은 src/features/<domain>/에 둔다. features는 공유 코드만 모으는 곳이 아니라 기능 책임을 가진 코드의 위치다.
- 서버 상태를 관리하는 조회·mutation 훅과 Query 키는 src/queries/<domain>Query.ts에 둔다.
- 서버 요청과 API·DB 경계 타입은 src/api/<domain>/에 두고, 폼 전용 상태·UI 타입은 해당 feature에 둔다.
- React 생명주기에 의존하며 도메인과 무관하게 재사용하는 로직은 src/hooks/에 둔다. Modal·Confirm·BottomSheet는 src/components/common/modal/에서 관리한다.
- 페이지에서만 쓰는 JSX는 페이지 안에 유지할 수 있다. 페이지를 얇게 만들기 위해 억지로 분리하지 않는다.
- 도메인과 무관한 공용 UI는 src/components/common/에 둔다.
- 공용화는 사용처 수만으로 결정하지 않고 역할과 변경 이유가 같은지 확인한다. 기존 공용 UI를 우선 확인하고, 예상되는 재사용이나 모양의 유사성만으로 공용화를 미리 하지 않는다.
- 폴더·추상화·옵션은 필요한 시점에 추가한다.
- 폴더명은 lower camel case, 컴포넌트 파일명은 PascalCase.
- 같은 폴더나 하위 폴더 import는 ./를 허용한다. ../ 대신 src/ 기준 @/를 사용한다.

### Feature 내부 배치

- 모든 `src/features/<domain>/`에 같은 배치 기준을 적용한다. 도메인 폴더 바로 아래에는 컴포넌트와 해당 스타일을 둔다.
- 순수 계산·검증·값 가공은 `utils/`, 도메인 React 훅은 `hooks/`, 안내 문구·상수는 `constants/`, 기능 실행 명령은 `actions/`로 구분한다. 실제 파일이 필요한 폴더만 만든다.
- `actions/`를 서버 상태 관리의 대체 위치로 사용하지 않는다. API 요청은 `src/api/`, 조회·mutation과 캐시 갱신은 `src/queries/`의 기존 책임 기준을 따른다.
- 컴포넌트와 스타일 한 쌍을 담기 위해 컴포넌트별 폴더를 만들지 않는다. 내부 파일이 늘어나 별도 묶음이 필요하면 책임과 탐색 이점을 근거로 판단한다.
- 페이지는 URL 해석과 공통 헤더·탭·본문 레이아웃을 조립하고, 도메인 목록 컴포넌트는 목록 조회·로딩·오류·빈 상태와 항목 표시를 담당한다. 단순한 페이지 JSX까지 의무적으로 feature로 분리하지 않는다.
- 새 작성과 관련 코드 수정에 이 기준을 적용한다. 구조를 맞추기 위해 요청 범위 밖의 기존 feature를 일괄 재배치하지 않는다.

## Import

- import는 외부 라이브러리 → 내부 로직 → UI 컴포넌트 → 스타일 → 아이콘·이미지 등 시각 리소스 순으로 배치한다.
- 그룹 사이는 빈 줄 하나로 구분하고, 없는 그룹은 생략한다.
- 경로보다 가져오는 대상의 역할로 분류한다. 아이콘 라이브러리는 시각 리소스로 분류한다.
- 타입 import는 관련 대상과 같은 그룹에 두고, 같은 모듈의 import끼리 인접하게 배치한다.

## TypeScript·React

- 기본 타입 선언은 type, 타입 이름은 T 접두사, 타입 import는 import type.
- 컴포넌트와 이름 있는 헬퍼는 함수 선언식.
- 기본 내보내기 함수 컴포넌트는 `export default function ComponentName()` 형태로 선언한다.
- 컴포넌트 파일은 import, 모듈 수준 타입·상수, 대표 컴포넌트, 보조 함수·지역 컴포넌트 순으로 배치한다. 이 순서를 맞추기 위해 함수의 책임이나 스코프를 변경하지 않는다.
- boolean은 is..., 이벤트 props는 on..., 처리 함수는 handle....
- 모듈 상수는 UPPER_SNAKE_CASE, any 대신 unknown과 타입 검사.
- 조기 반환으로 중첩을 줄인다.
- Vite 앱에 Next.js 서버·클라이언트 컴포넌트 규칙을 적용하지 않는다.
- 브라우저 저장 코드는 화면과 분리해 feature에서 관리한다.

## 서버 상태와 API 사용

- 캐시가 필요한 조회는 src/queries/의 query 훅이 src/api/의 도메인 함수를 호출한다. UI에서 Supabase table·RPC를 직접 호출하지 않는다.
- 생성·수정·삭제는 src/queries/의 mutation 훅에서 API를 호출하고 성공 결과에 따라 관련 캐시를 갱신하거나 무효화한다. 충돌·삭제 제한 같은 실패 결과를 성공으로 처리하지 않는다.
- API 함수마다 Query 훅을 의무적으로 만들지 않는다. 캐시가 필요 없는 인증 명령은 API를 직접 호출할 수 있다. OAuth URL 준비는 API, 브라우저 이동과 사용자 안내는 feature·화면이 담당한다.
- Query 키는 해당 queries 모듈에서 소유한다. Query 훅은 Query·mutation 결과를 반환하며 사용자 안내 문구·토스트·페이지 이동을 포함하지 않는다.
- URL 해석과 화면별 조회 정책 선택은 feature·page가 담당한다. Query 훅은 라우터에 의존하지 않고 서버 상태 관리에 필요한 입력만 받는다.
- queries는 feature·page와 라우터에 의존하지 않는다. 일정 계산·미루기 조건·편집 이력 유지 같은 기능 정책은 feature에서 처리하고 준비된 요청 값을 mutation에 전달한다.
- Query 훅에는 실제 호출부에서 필요한 옵션만 제공한다. 독립적인 기능 정책 없이 Query 결과의 이름 변경·기본값·안내 문구 변환만 수행하는 래퍼 훅은 기본적으로 만들지 않고, 기존 래퍼도 같은 기준으로 재평가한다. 여러 곳에서 사용한다는 이유만으로 유지하지 않는다.
- 서버 상태를 별도 컴포넌트 상태에 장기 복제하지 않는다. 폼 초안과 미저장 정렬처럼 별도 편집 상태가 필요한 경우는 분리한다.
- QueryProvider와 공유 QueryClient는 src/lib/query/에 둔다. Provider 안에서 별도 인스턴스를 만들지 않는다.
- 인증 사용자가 변경되면 이전 계정의 캐시 데이터와 편집 상태가 다음 계정에 이어지지 않도록 한다. 구체적인 구현 방식은 현재 인증 구조와 요구사항에 맞춰 결정한다.
- 배경 스크롤 잠금은 useBodyScrollLock을 사용한다. 네이티브 dialog의 열기·닫기와 포커스 동작은 컴포넌트에서 처리하고, 기본 동작과 중복되는 수동 제어는 필요성을 검증한 뒤 추가한다.

## 포맷

- `.prettierrc.json`을 기준으로 코드 작성·수정 후 변경한 코드 파일에 Prettier를 적용한다. 요청과 무관한 파일까지 일괄 포맷하지 않는다.
- 프로젝트에 설치된 Prettier를 사용하고, 변경한 파일을 대상으로 `prettier --check`를 실행한다. import 그룹 순서는 위 지침에 따라 별도로 유지한다.

## 가독성과 훅 사용

- 인라인 콜백과 effect의 정리 콜백은 화살표 함수를 기본으로 사용한다. 단순히 값을 계산하거나 JSX를 반환하면 간결하게 표현하고, 여러 책임이 섞이면 이름 있는 함수로 분리한다. 기존에 분리된 함수를 전달하는 경우에는 불필요한 콜백으로 감싸지 않는다.
- 훅 콜백에 조회·검증·오류 처리 등 서로 다른 책임이 섞이면 이름 있는 함수로 분리해 역할을 드러낸다. 단순한 한 줄 계산까지 기계적으로 분리하지 않는다.
- 여러 필드의 반환 객체와 긴 조건식을 한 줄로 압축하지 않는다.
- 같은 역할의 데이터는 목록·상세에서 일관된 방식으로 다룬다. 차이가 필요하면 조회 시점과 이유를 설명한다.
- useMemo는 성능상 필요가 있을 때 사용한다. 데이터를 보관하거나 조회 시점을 제어할 목적으로 사용하지 않는다.
- JSX의 중첩 삼항연산자를 피한다. 공통 페이지 구조를 유지하고 조건부 영역은 먼저 JSX 안에서 독립 조건으로 나눈다. 단순 값 선택의 삼항연산자는 허용한다.
- 조건이 길면 의미 있는 boolean 이름을 사용한다. 지역 컴포넌트 분리는 코드 길이뿐 아니라 읽는 흐름을 기준으로 판단한다. 오류·빈 상태 같은 보조 UI가 주요 동작을 읽는 데 방해되면 짧아도 같은 파일 아래로 분리할 수 있다. 부모에는 표시 조건과 주요 데이터 흐름을 남기고, 단순 분기를 위한 렌더 함수를 미리 만들지는 않는다.
- 코드 줄 수보다 동작과 데이터 흐름이 쉽게 읽히는지를 우선한다. 함수 분리 여부는 고정된 줄 수가 아니라 책임을 기준으로 판단한다.

## SCSS

- 프로젝트의 기존 타이포그래피·색상 토큰과 다크 테마를 기준으로 스타일을 작성한다.
- 폰트는 @fontsource/noto-sans-kr 로컬 번들로 제공한다.
- 컴포넌트와 같은 PascalCase 이름의 *.module.scss를 같은 폴더에 둔다.
- styles로 import하고 kebab-case 클래스를 styles['class-name']으로 접근한다.
- HTML 구조에 맞춰 root 아래에 nesting하고 상태·modifier는 대상 아래에 둔다.
- 깊이는 고정하지 않되 불필요한 nesting을 피한다. 공용 컴포넌트 내부 스타일은 해당 컴포넌트가 관리한다.
- src/styles/reset.scss는 reset, global.scss는 폰트·body 등 전역 기본값만 관리한다.
- 기본 줄 높이는 전역에서 관리하고 필요한 요소에서 재정의할 수 있다.
- _variables.scss와 _mixins.scss는 Vite에서 전역 주입하므로 SCSS마다 @use를 반복하지 않는다.
- 주입 파일은 변수·믹스인만 제공한다. 실제 CSS를 출력하는 reset·global은 main.tsx에서 한 번 import한다.

## 레이아웃

- 모바일 전체 너비, PC 중앙 정렬 최대 너비를 사용한다.
- 콘텐츠와 fixed 요소 모두 $app-max-width 또는 app-width 믹스인을 사용한다.
- viewport 기준 fixed 요소는 같은 너비와 중앙 정렬을 함께 적용한다.
- safe area·키보드·좁은 화면·긴 텍스트를 고려한다.
- 크기·간격 토큰은 시작값이며 실제 화면을 보며 조정한다.

## 완료 전 검토와 검증

- 제품 코드 변경은 완료 보고 전에 [self-review-health-note-changes](../../../../.agents/skills/self-review-health-note-changes/SKILL.md)를 적용하고, [test-feature-behavior](../../../../.agents/skills/test-feature-behavior/SKILL.md)와 프로젝트 지침에 따라 필요한 검증을 수행한다. 검증 중 코드를 수정하면 영향을 받는 부분을 다시 검토·검증한다.
- 별도 읽기 전용 리뷰에서는 코드 수정이나 테스트를 자동 실행하지 않는다.
