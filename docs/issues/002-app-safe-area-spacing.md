# 앱 화면 상·하단 공간

- 등록일: 2026-10-19
- 관련: 앱 WebView 배치 · 웹 배경 및 하단 메뉴
- 조사 기준: `8c184fb12595dac55fff0742d8b8d83e25467e20`, 조사 시작 시 작업 트리 깨끗함

## 사용자 관찰

웹에서는 괜찮지만 앱에서는 화면 상단과 하단에 공간이 생긴다. 사용자는 흰색이 아니라 웹 배경색이 보인다고 정정했고, 상태 표시줄 아래와 웹 헤더 사이 및 웹 하단 메뉴와 시스템 영역 사이의 공간이라는 설명에 동의했다. 기기·OS·설치 빌드·공간의 높이는 미확인이다. 실기기 재현과 화면 캡처 확인은 미실행이다.

## 수정 전 코드에서 확인한 사실

- [App.tsx](../../health-note-app/App.tsx)의 최상위 `SafeAreaView`가 WebView를 감싼다. `edges`를 별도로 지정하지 않아 기본 안전 영역 패딩이 적용된다. 따라서 WebView는 상태 표시줄·하단 시스템 영역을 피한 내부에 배치된다.
- 같은 파일의 `styles.container`는 배경이 `#ffffff`이며 `StatusBar`는 `dark`이다. 반면 [웹 전역 스타일](../../health-note/src/styles/global.scss)은 어두운 배경이다. 안전 영역이 흰 띠처럼 분리되어 보일 수 있는 구조다.
- WebView의 `contentInsetAdjustmentBehavior="never"`, `automaticallyAdjustContentInsets={false}`가 지정되어 있다. WebView 자동 inset이 중복 적용된다고 단정할 근거는 없다.
- [하단 메뉴 스타일](../../health-note/src/app/BottomNavigationLayout.module.scss)은 `env(safe-area-inset-bottom)`을 사용한다. 해당 기기의 실제 계산값은 미측정이며 네이티브와 웹이 안전 영역을 중복 적용했다고 확정할 수 없다.

SafeAreaView의 패딩 동작은 [공식 문서](https://appandflow.github.io/react-native-safe-area-context/api/safe-area-view/)와 대조했다.

## 판단과 해결 방향

안전 영역을 확보하는 구조는 확인했지만, 배경색 차이가 보인다는 초기 설명은 사용자 관찰과 맞지 않는다. 현재 소스의 흰 배경과 사용자가 보는 배경색의 차이는 설치 빌드 또는 실제 공간 위치 확인이 필요하다.

배경색 변경은 사용자가 제보한 공간 자체의 해결책으로 제안하지 않는다. 공간 자체를 없애고 시스템 영역까지 웹을 확장하려면 우선 앱의 안전 영역 적용 범위를 좁혀 비교하고 웹 헤더·하단 메뉴·모달의 겹침 여부를 확인해야 한다. CSS 변경이 반드시 필요하다고 미리 단정하지 않는다.

## 앱 설정 재조사

- 생성된 `health-note-app/android/gradle.properties`는 `edgeToEdgeEnabled=true`다. Android `res/values/styles.xml`은 상태 표시줄과 내비게이션 바 색을 투명으로 설정하며 `NoActionBar` 테마를 사용한다. 앱 전체 화면 확장이 꺼져 있거나 네이티브 액션바가 추가된 설정은 발견하지 못했다. 생성 파일은 설치된 APK의 설정을 직접 증명하지 않는다.
- 앱 소스에서는 `SafeAreaView`의 `edges`가 생략되어 있다. 설치된 라이브러리 `src/SafeAreaView.tsx`도 생략 시 네 방향을 `additive`로 처리한다. 명시적 상·하단 패딩의 출처로 좁힐 수 있다.
- 따라서 `app.json`에 전체 화면 확장 옵션을 추가하거나 CSS `dvh`를 바꾸는 것보다, 앱의 `SafeAreaView` 적용 범위만 바꿔 비교하는 것이 작은 다음 검증이다. 예를 들어 `edges={['left', 'right']}`는 상·하단 안전 패딩을 제외한다. 실제 적용 여부는 시스템 UI와 콘텐츠의 겹침을 확인한 뒤 판단한다.

## 비교용 수정

사용자가 수정을 요청하고 새 APK로 실기기 비교를 진행하기로 했다. `App.tsx`의 `SafeAreaView`에 `edges={['left', 'right']}`를 지정해 상·하단 안전 패딩을 제외했다. 웹 viewport 메타와 CSS는 유지한다. 앱 아키텍처 문서에도 비교 구성과 미검증 경계를 반영했다.

- lint·typecheck 통과.
- Android `:app:assembleRelease` 통과. 생성 캐시가 이전 작업 공간 경로를 참조해 최초 빌드가 실패했으며 autolinking 생성 캐시를 갱신한 뒤 성공했다.
- 비교 APK: `health-note-app/artifacts/health-note-1.0.2-safe-area-test.apk` (앱 버전 1.0.2 / versionCode 3 유지).
- 변경 검토: 상·하단 패딩만 제외하며 좌우 안전 영역과 기존 WebView 설정은 유지한다.
- 사용자가 위 APK로 실기기 테스트 후 “해결됐네”라고 확인했다(2026-10-19). 제보한 상·하단 공간은 앱의 상·하단 안전 패딩 제외로 해결된 것으로 기록한다. 기기·OS 및 모달·키보드·다른 내비게이션 모드의 개별 검증 결과는 제공되지 않았다. 모의 컴포넌트 테스트로 실제 inset을 증명할 수 없어 새 테스트는 추가하지 않았다.
- 수정 코드와 이 기록을 같은 커밋에 포함한다.

웹 viewport 메타와 CSS 변경 없이 해결되었다. 다른 기기·OS와 모달·키보드·시스템 UI 겹침의 개별 검증은 이번 사용자 확인만으로 통과로 확대하지 않는다.
