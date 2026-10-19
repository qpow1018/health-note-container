# 앱 아키텍처

현재 WebView 래퍼의 책임과 웹 연결 방식을 설명합니다. 실행·환경·빌드·검증 방법은 [README](../README.md)를 참고합니다.

## 구성과 탐색

- [App.tsx](../App.tsx): URL 검증, WebView, 로딩, 네트워크/주 문서 HTTP 오류 안내, 시작 URL부터 재시도, Android 뒤로가기, Google 인증 브라우저 연결, 그 외 외부 이동 차단.
- [googleAuth.ts](../src/googleAuth.ts): 허용된 Google PKCE 요청 검증, 앱 callback 검증, WebView로 코드만 반환하는 스크립트.
- [historyScript.ts](../src/historyScript.ts): Android에서 SPA URL 변경 이벤트가 누락되는 경우를 보완하는 전용 history 알림. 토큰이나 인증 데이터는 다루지 않습니다.
- [history.test.cjs](../tests/history.test.cjs): history 알림의 최초 진입, push/replace/pop, reload/pageshow, 중복 주입 테스트.

Android 뒤로가기는 React Router의 `history.state.idx > 0`이면 `history.back()`, 그 외 WebView 문서 이력이 있으면 `goBack()`을 사용합니다. 이력이 없는 시작 화면은 BackHandler에서 false를 반환하여 OS 기본 동작에 맡깁니다. 앱 시작 URL이 상세 경로여도 최초 Router idx는 0입니다. 단순 `history.length`는 이전 브라우저 이력과 replace 이동을 구분하지 못하므로 사용하지 않습니다. 이 스크립트는 현재 웹의 BrowserRouter 구현에 의존합니다.

safe area는 네이티브 SafeAreaProvider/ SafeAreaView가 좌우만 담당합니다. 상·하단 안전 패딩은 제외하며, 사용자가 실기기에서 기존 상·하단 공간 문제가 해결되었음을 확인했습니다. 상태바는 밝은 화면용 dark 스타일입니다. WebView의 iOS 자동 콘텐츠 inset은 끕니다. 웹은 `viewport-fit=cover`가 없는 viewport와 CSS `env(safe-area-inset-*)`를 사용합니다. 웹의 기본 페이지 padding과 56px 하단 메뉴 공간은 유지하며 CSS를 주입하지 않습니다. 다른 기기·OS 및 노치·제스처/3버튼 내비게이션·키보드·모달의 개별 검증 결과는 미확인입니다.

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


## Android 자동 걸음 기록

[로컬 Expo 모듈](../modules/health-note-steps/android/src/main/java/expo/modules/healthnotesteps/HealthNoteStepsModule.kt)이 Android 걸음 센서와 네이티브 저장소를 제공한다. 생성되는 android/ 폴더를 직접 수정하지 않고 모듈의 manifest가 서비스·권한·재부팅 receiver를 병합한다. iOS와 모듈이 없는 Expo Go는 이 기능을 제공하지 않는다.

- [StepTrackingService](../modules/health-note-steps/android/src/main/java/expo/modules/healthnotesteps/StepTrackingService.kt)는 health 유형 포그라운드 서비스와 지속 알림을 사용한다. WebView나 JS 타이머가 측정을 수행하지 않는다. 신체 활동 권한이 있으면 기본으로 시작하며, 알림 권한이 거절되어도 Android가 허용하는 포그라운드 서비스는 시작한다.
- 센서 누적값의 차이만 기기 내부 SharedPreferences에 날짜별로 저장한다. 새 서비스의 첫 센서 값은 기준값이며 이전 누적 걸음수는 가져오지 않는다. 센서 초기화 후 음수 차이를 더하지 않는다. 앱 재실행으로 같은 걸음을 두 번 더하지 않으며, 프로세스 중단 중의 걸음수는 복구하지 않는다.
- 날짜는 센서 이벤트의 단조 증가 시각을 현재 시각으로 환산한 뒤 기기의 현지 날짜로 판단한다. 센서가 걸음을 묶어 전달하면 차이 전체가 마지막 이벤트 날짜에 속한다. 따라서 자정을 걸친 묶음의 개별 걸음을 정확히 나누지는 못한다. 휴대폰 시간·시간대 변경도 날짜 배분에 영향을 줄 수 있다.
- 별도의 켜짐/꺼짐 설정을 사용하지 않는다. 이전 버전의 enabled 저장값도 읽지 않는다. 재부팅 완료 receiver와 앱 복귀 시 권한을 확인해 측정을 재개한다. 일반적인 최근 앱 목록 제거와 설정의 강제 종료는 구분하며, 강제 종료·OS 제한 구간까지 연속 측정을 보장하지 않는다. 저장한 걸음수는 유지한다.
- 자동 기록은 로그인 계정에 귀속되지 않는다. 로그아웃하거나 다른 계정으로 로그인해도 같은 휴대폰 기록이 표시되고 권한이 있으면 측정도 계속된다. 서버 업로드·동기화는 하지 않는다. 앱 데이터 삭제·앱 제거 시 기록이 사라진다.

[steps.ts](../src/steps.ts)는 앱의 JS 실행당 한 번 초기화를 수행한다. 앱이 활성화되면 센서 지원을 확인하고 신체 활동 권한이 없을 때 한 번 요청한다. 반복 거절로 시스템 요청이 차단되면 앱 자체 안내와 설정 열기를 제공한다. 거절 후 화면 잠금 해제·앱 복귀·웹 새로고침에서는 재요청하지 않는다. 새로 앱을 실행하면 다시 한 번 확인·요청한다. 권한이 있으면 자동 기록하며 설정에서 권한을 허용한 뒤 복귀한 경우도 재개한다. 알림 권한도 시작 시 확인하되 알림 거절을 측정 불가로 취급하지 않는다.

웹은 `health-note-steps` 메시지의 `snapshot`, `reset`만 요청한다. App.tsx는 기존 웹 origin 검사를 거친 메시지만 처리하고 같은 origin일 때만 CustomEvent로 날짜·걸음수·상태를 반환한다. 앱 복귀/문서 로드 완료와 홈이 보이는 동안의 5초 조회로 화면을 갱신한다.

네이티브 상태는 unsupported / permission / tracking / stopped / error로 구분한다. tracking은 센서 구독이 시작되었다는 뜻이며 실제 걸음 정확도·배터리 최적화 환경의 지속성까지 검증했다는 뜻은 아니다.


테스트용 임시 기능으로 홈 카드에 오늘 기록 초기화를 제공한다. 확인창에서 초기화하면 오늘 저장값만 0으로 만들고 센서 기준을 다시 잡는다. 자동 기록을 중단하지 않고 이전 날짜 기록도 유지한다. 초기화 시점 이전의 지연 센서 이벤트는 무시하고, 이후 첫 응답은 기준값으로만 사용하므로 첫 응답까지의 일부 걸음은 집계되지 않을 수 있다. 검증 후 제거할 기능이며 웹 메시지의 `reset` 요청을 앱이 처리한다.
