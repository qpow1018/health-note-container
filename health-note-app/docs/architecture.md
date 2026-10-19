# 앱 아키텍처

현재 WebView 래퍼의 책임과 웹 연결 방식을 설명합니다. 실행·환경·빌드·검증 방법은 [README](../README.md)를 참고합니다.

## 구성과 탐색

- [App.tsx](../App.tsx): URL 검증, WebView, 로딩, 네트워크/주 문서 HTTP 오류 안내, 시작 URL부터 재시도, Android 뒤로가기, Google 인증 브라우저 연결, 그 외 외부 이동 차단.
- [googleAuth.ts](../src/googleAuth.ts): 허용된 Google PKCE 요청 검증, 앱 callback 검증, WebView로 코드만 반환하는 스크립트.
- [historyScript.ts](../src/historyScript.ts): Android에서 SPA URL 변경 이벤트가 누락되는 경우를 보완하는 전용 history 알림. 토큰이나 인증 데이터는 다루지 않습니다.
- [history.test.cjs](../tests/history.test.cjs): history 알림의 최초 진입, push/replace/pop, reload/pageshow, 중복 주입 테스트.

Android 뒤로가기는 React Router의 `history.state.idx > 0`이면 `history.back()`, 그 외 WebView 문서 이력이 있으면 `goBack()`을 사용합니다. 이력이 없는 시작 화면은 BackHandler에서 false를 반환하여 OS 기본 동작에 맡깁니다. 앱 시작 URL이 상세 경로여도 최초 Router idx는 0입니다. 단순 `history.length`는 이전 브라우저 이력과 replace 이동을 구분하지 못하므로 사용하지 않습니다. 이 스크립트는 현재 웹의 BrowserRouter 구현에 의존합니다.

safe area는 네이티브 SafeAreaProvider/ SafeAreaView가 네 방향 모두 담당합니다. 상태바는 밝은 화면용 dark 스타일입니다. WebView는 안전 영역 안에 배치하고 iOS 자동 콘텐츠 inset을 끕니다. 웹은 `viewport-fit=cover`가 없는 viewport와 CSS `env(safe-area-inset-*)`를 사용합니다. 안전 영역 안의 WebView에서는 웹 inset이 0인 구성을 기대하며, 웹의 기본 페이지 padding과 56px 하단 메뉴 공간은 그대로 필요합니다. CSS를 주입해 기존 여백을 지우지 않습니다. 노치·가로 회전·키보드·제스처/3버튼 내비게이션에서 실제 inset은 기기 검증이 필요합니다.

기존 모달과 BottomSheet는 HTML `<dialog>.showModal()`과 `cancel` 이벤트를 사용합니다. 네이티브 모달을 중복 구현하지 않습니다. 열린 dialog에서 Android 뒤로가기가 웹 cancel을 전달하는지는 WebView/OS별 확인이 필요합니다. dialog 상태를 native history로 바꾸거나 닫기 브리지는 사용하지 않습니다.

설정된 Supabase 서버의 Google PKCE authorize 요청만 시스템 인증 브라우저로 엽니다. 다른 외부 origin과 비 HTTP 스킴 이동은 안내 후 차단합니다. originWhitelist는 모든 요청을 onShouldStartLoadWithRequest 정책으로 보내기 위한 설정이며, 실제 허용 범위는 설정된 웹 origin입니다.

## Google 인증 연결

1. 기존 웹의 `signInWithGoogle.ts`가 WebView 안에 PKCE verifier를 저장하고 Google OAuth URL을 만듭니다.
2. 앱이 `onShouldStartLoadWithRequest`에서 설정한 Supabase origin + `/auth/v1/authorize` + Google + S256 challenge + 원래 웹 복귀 origin을 검사합니다. 요청의 challenge는 유지하고 `redirect_to`만 앱 callback으로 바꿉니다.
3. Expo WebBrowser가 Android Chrome Custom Tabs / iOS 인증 세션을 엽니다. Google 로그인은 embedded WebView에서 수행하지 않습니다.
4. 브라우저가 callback으로 반환한 일회용 code만 받아, 원래 WebView의 웹 origin으로 `location.replace`합니다. callback의 scheme/host/path를 정확히 확인하고 오류·토큰·중복 code는 거절합니다. 진행 중인 인증 세션에서만 복귀를 처리합니다.
5. 기존 웹 Supabase 클라이언트(`flowType: 'pkce'`, 기본 `detectSessionInUrl: true`)가 같은 WebView 저장소의 verifier와 code를 교환합니다. 성공하면 웹 라이브러리가 URL의 code를 제거하고 세션을 저장합니다.

앱에는 Supabase 클라이언트나 장기 토큰 저장소를 만들지 않았습니다. 인증 요청의 PKCE verifier는 처음부터 끝까지 WebView 저장소에 남고, 인증 코드만 전달합니다. 다른 코드로 앱 복귀를 위조해도 해당 verifier와 일치하지 않으면 서버의 코드 교환이 실패합니다. 브라우저 로그인 세션이 WebView에 자동 공유된다고 가정하지 않습니다. 웹 로그아웃은 기존 웹 Supabase 클라이언트가 처리합니다.

취소하거나 브라우저를 닫으면 로그인 페이지를 새로 불러와 버튼을 다시 활성화합니다. 복귀 오류는 안내 후 재시도할 수 있습니다. 인증 중 OS가 앱 프로세스를 종료하면 진행 중이던 native 인증 세션은 복원하지 않습니다. 앱을 다시 열어 로그인을 재시도하세요. 앱 재실행 시 이미 완료된 로그인은 WebView의 기존 세션으로 복원합니다.

웹의 인증 URL 구성이나 PKCE 설정을 변경하면 앱의 연동 검사와 관련 테스트를 함께 확인합니다.

## 로딩 표시

로딩 표시는 `onLoadStart`의 `nativeEvent.loading`을 반영합니다. 실제 문서 로딩 없이 SPA 주소만 바뀌는 이벤트에서 로딩 표시가 다시 켜지는 것을 피하기 위한 처리입니다. 관련 테스트는 [webViewLoading.test.cjs](../tests/webViewLoading.test.cjs)입니다.
