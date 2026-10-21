# 페이지 이동 후 이전 스크롤 위치 유지

- 등록일: 2026-10-21
- 관련: 웹 라우팅, 앱 WebView 공통 화면
- 조사 기준: `3132819` 및 미커밋 Intro·페이지 분기 변경. 사용자가 Intro 확인을 위해 PlanPage 분기를 임시 주석 처리한 상태이므로 HEAD만으로 현재 화면을 대표하지 않는다.

## 현상과 근거

사용자 제보: Intro 하단의 플랜 만들기를 누르면 `/plan/new`가 위에서 시작하지 않고 아래쪽 스크롤 위치로 열린다. 구체적인 기기는 미확인이다.

[PlanIntro](../../health-note/src/features/plan/PlanIntro.tsx)는 공통 ButtonLink로 이동하며, [ButtonLink](../../health-note/src/components/common/button/ButtonLink.tsx)는 React Router Link를 사용한다. [App](../../health-note/src/app/App.tsx)은 BrowserRouter를 사용하며 별도 스크롤 초기화·복원 처리가 없다. 페이지들은 문서 스크롤을 공유하고 PlanCreatePage도 진입 시 스크롤을 초기화하지 않는다.

코드상 원인: 문서를 교체하지 않는 라우트 이동에서 이전 문서 스크롤을 초기화하지 않아 기존 위치가 유지될 수 있다. 사용자 관찰과 구현이 부합한다. 이번 조사에서는 브라우저 직접 재현과 실제 Android 검증은 미실행이다.

## 제안과 검증

Intro 버튼 하나에 처리를 넣기보다 앱 라우팅 경계에서 새 페이지 진입 시 맨 위로 이동하도록 처리하는 것을 추천한다. 뒤로가기의 이전 위치 복원은 별도로 구분하고, 운동 관리 탭처럼 쿼리만 바뀌는 이동은 이번 초기화 범위에서 제외하는 것이 적절하다. BrowserRouter 구조를 바꾸는 작업까지 확대할 필요는 없다.

검증: 작은 모바일 높이에서 Intro를 아래로 스크롤한 뒤 플랜 만들기를 클릭하여 생성 헤더와 scrollY=0 확인. 루틴·운동 생성 진입, 뒤로가기, 쿼리 탭 이동도 선택한 정책대로 동작하는지 확인한다. 네이티브 WebView는 실제 기기 확인이 필요하다.

## 실제 수정

사용자 요청에 따라 공통 [RouteScrollReset](../../health-note/src/app/RouteScrollReset.tsx)을 BrowserRouter 안에 배치했다. 이전 pathname과 현재 pathname이 다르고 이동 종류가 POP이 아닐 때 layout effect에서 즉시 상단으로 이동한다. POP도 이전 pathname을 갱신하므로 뒤로가기 이후 새 이동을 올바르게 비교한다. 쿼리만 변경되는 탭 전환은 초기화하지 않는다. 별도 위치 저장·복원은 추가하지 않았다.

검증: [브라우저 테스트](../../health-note/tests/route-scroll.spec.ts)로 모바일 높이에서 Intro 하단 → 플랜 생성 상단 진입, 쿼리 탭과 뒤로·앞으로 이동의 초기화 제외를 검사한다. 실제 Android는 미확인이다. 사용자가 PlanPage의 임시 주석을 해제한 최종 상태에서 lint·typecheck와 관련 브라우저 테스트 17개가 통과했다. Intro·플랜 생성 UI 보강과 함께 커밋한다.
