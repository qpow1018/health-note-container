# Health Note App

기존 Health Note 웹을 표시하는 Android/iOS용 최소 Expo + TypeScript 앱입니다. 네이티브 헤더·하단 메뉴·라우터·전역 상태는 추가하지 않았습니다. Google 로그인은 시스템 인증 브라우저와 WebView의 PKCE 코드 교환을 연결합니다.

## 준비 및 실행

Node.js 22 LTS 이상을 사용하세요. 이 프로젝트는 Node 22.23.3, Expo SDK 58, React Native 0.88, WebView 14.0.1로 초기화했습니다. 정확한 의존성은 package-lock.json에 고정되어 있습니다.

```sh
npm ci
cp .env.example .env
# .env의 EXPO_PUBLIC_WEB_URL에 웹 주소 입력
npm start
```

EXPO_PUBLIC_WEB_URL은 HTTP(S) 절대 주소입니다. Google 로그인에는 웹의 `VITE_SUPABASE_URL`과 같은 HTTPS 주소를 `EXPO_PUBLIC_SUPABASE_URL`에도 설정해야 합니다. Supabase 키나 토큰은 앱 환경변수에 넣지 않습니다. 공백·누락·잘못된 주소이면 앱에서 설정 방법을 안내합니다. 기본값은 넣지 않았으며, 현재 로컬 `.env`에는 `https://health-note-six.vercel.app/`이 설정되어 있습니다. EXPO_PUBLIC 변수는 번들에 공개되므로 비밀 키를 넣지 마세요. 변경 후 앱을 완전히 다시 로드하고, 반영되지 않으면 `npx expo start --clear`로 다시 시작하세요. 배포 번들은 다시 생성해야 합니다.

SDK 58을 지원하는 Expo Go에서 QR을 열거나, Android 에뮬레이터를 실행한 뒤 `npx expo start --android`를 사용하세요. `npm run android`는 생성된 네이티브 프로젝트를 로컬 컴파일하여 실행합니다. iOS Simulator는 macOS + Xcode + 설치된 iOS 런타임이 필요하며 `npm run ios`로 엽니다. 이 앱의 WebView는 Android/iOS용입니다. Expo 웹 실행은 제공하지 않습니다.

## APK로 직접 설치하기

배포된 HTTPS 웹을 사용하는 APK는 Expo Go나 Metro 개발 서버 없이 실행됩니다. 웹 서버에 접속할 인터넷은 필요합니다. 현재 Android 앱 ID는 로컬 설치 테스트용 `com.healthnote.app`입니다.

macOS 로컬 빌드에는 Android SDK와 호환 JDK가 필요합니다. 이번 환경은 SDK 경로 `~/Library/Android/sdk`, JDK 21, Node 22.23.3을 사용합니다.

```sh
# nvm 사용 시
nvm use 22.23.3
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME="$HOME/Library/Android/sdk"
# .env의 EXPO_PUBLIC_WEB_URL 확인 후 Android 프로젝트 생성
npx expo prebuild --platform android --no-install
cd android
NODE_ENV=production ./gradlew :app:assembleRelease --console=plain --max-workers=4
```

출력 파일: `android/app/build/outputs/apk/release/app-release.apk`. 현재 설치용 복사본은 `artifacts/health-note-1.0.2.apk`입니다. Expo 템플릿의 release 빌드는 현재 기본 debug keystore로 서명합니다. JS가 내장된 release 변형이지만 서명은 로컬 설치 테스트용이며, 스토어 배포용 서명은 아닙니다. 스토어 배포 시 고유 앱 ID 확정과 별도 서명 키 관리가 필요합니다.

APK를 휴대폰에 옮겨 파일을 열고, 해당 파일 앱의 '출처를 알 수 없는 앱 설치'를 허용하여 설치하세요. USB 디버깅으로 설치하려면 프로젝트 루트에서 다음을 실행합니다.

```sh
adb devices
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

`adb devices` 목록이 비어 있으면 USB 연결·디버깅 설정·PC 연결 승인을 확인하세요. 서명이 다른 같은 앱 ID가 이미 설치되어 있으면 업데이트가 거부될 수 있습니다. 이 경우 기존 앱 삭제 전에 WebView 안의 로컬 데이터가 삭제될 수 있음을 확인하세요.

1.0.2 APK는 Google 로그인 시스템 브라우저 연동과 로그인 후 로딩 표시 수정을 포함합니다. 아래 Supabase 복귀 URL 설정이 필요합니다. 기존 APK 위에 업데이트 설치하세요.

## Expo Go로 실제 Android 휴대폰 연결

1. PC와 휴대폰을 같은 Wi-Fi에 연결합니다. 호환되는 Expo Go를 휴대폰에 설치합니다.
2. 기존 웹 저장소에서 사용자가 직접 `npm run dev -- --host 0.0.0.0`으로 Vite를 실행합니다. 이 작업에서는 웹 파일을 수정하지 않았습니다.
3. PC의 LAN IP가 예를 들어 `192.168.0.10`이면 앱 `.env`에 `EXPO_PUBLIC_WEB_URL=http://192.168.0.10:5173`을 설정합니다. 이는 설명용 IP이므로 실제 PC 주소로 바꾸세요.
4. 앱 폴더에서 `npm start` 후 Expo Go로 QR을 스캔합니다. 방화벽에서 Metro와 Vite 연결을 허용하고 Wi-Fi의 기기 간 통신 차단 여부를 확인하세요.
5. USB 사용 시 Android 개발자 옵션과 USB 디버깅을 켜고 PC 연결을 승인합니다. `adb devices`에서 `device` 상태를 확인하세요. `adb reverse tcp:8081 tcp:8081`, `adb reverse tcp:5173 tcp:5173` 후 `npx expo start --localhost --android`를 사용하면 웹 주소도 `http://127.0.0.1:5173`으로 설정할 수 있습니다. USB reverse를 해제하면 이 주소는 동작하지 않습니다.

휴대폰의 `localhost`는 휴대폰 자신입니다. PC를 가리키지 않습니다. Android Studio 기본 에뮬레이터에서는 `http://10.0.2.2:5173`으로 호스트 PC에 접근할 수 있습니다. Expo의 `--tunnel`은 Metro 연결만 해결하며 별도 Vite 웹 주소를 공개하지 않습니다.

**HTTP 제약:** Expo Go와 자체 빌드의 네트워크 정책은 다를 수 있습니다. Android cleartext 정책과 iOS ATS 때문에 HTTP가 거절될 수 있습니다. 앱은 전역 HTTP 예외를 추가하지 않습니다. HTTPS 개발 URL을 우선 사용하세요. 자체 빌드에서 HTTP가 꼭 필요하면 후속 작업으로 개발 빌드에 한정한 Android cleartext / iOS ATS 예외를 설정하고 재빌드해야 합니다. LAN HTTP는 secure context가 아니므로 웹의 `crypto.randomUUID()` 같은 API도 제한될 수 있습니다. HTTPS에서는 신뢰 가능한 인증서를 사용하세요.

## 구성과 책임

- `App.tsx`: URL 검증, WebView, 로딩, 네트워크/주 문서 HTTP 오류 안내, 시작 URL부터 재시도, Android 뒤로가기, Google 인증 브라우저 연결, 그 외 외부 이동 차단.
- `src/googleAuth.ts`: 허용된 Google PKCE 요청 검증, 앱 callback 검증, WebView로 코드만 반환하는 스크립트.
- `src/historyScript.ts`: Android에서 SPA URL 변경 이벤트가 누락되는 경우를 보완하는 전용 history 알림. 토큰이나 인증 데이터는 다루지 않습니다.
- `tests/history.test.cjs`: history 알림의 최초 진입, push/replace/pop, reload/pageshow, 중복 주입 테스트.

Android 뒤로가기는 React Router의 `history.state.idx > 0`이면 `history.back()`, 그 외 WebView 문서 이력이 있으면 `goBack()`을 사용합니다. 이력이 없는 시작 화면은 BackHandler에서 false를 반환하여 OS 기본 동작에 맡깁니다. 앱 시작 URL이 상세 경로여도 최초 Router idx는 0입니다. 단순 `history.length`는 이전 브라우저 이력과 replace 이동을 구분하지 못하므로 사용하지 않습니다. 이 스크립트는 현재 웹의 BrowserRouter 구현에 의존합니다.

safe area는 네이티브 SafeAreaProvider/ SafeAreaView가 네 방향 모두 담당합니다. 상태바는 밝은 화면용 dark 스타일입니다. WebView는 안전 영역 안에 배치하고 iOS 자동 콘텐츠 inset을 끕니다. 웹은 `viewport-fit=cover`가 없는 viewport와 CSS `env(safe-area-inset-*)`를 사용합니다. 안전 영역 안의 WebView에서는 웹 inset이 0인 구성을 기대하며, 웹의 기본 페이지 padding과 56px 하단 메뉴 공간은 그대로 필요합니다. CSS를 주입해 기존 여백을 지우지 않습니다. 노치·가로 회전·키보드·제스처/3버튼 내비게이션에서 실제 inset은 기기 검증이 필요합니다.

기존 모달과 BottomSheet는 HTML `<dialog>.showModal()`과 `cancel` 이벤트를 사용합니다. 네이티브 모달을 중복 구현하지 않습니다. 열린 dialog에서 Android 뒤로가기가 웹 cancel을 전달하는지는 WebView/OS별 확인이 필요합니다. 이번 앱은 dialog 상태를 native history로 바꾸거나 닫기 브리지를 만들지 않습니다.

설정된 Supabase 서버의 Google PKCE authorize 요청만 시스템 인증 브라우저로 엽니다. 다른 외부 origin과 비 HTTP 스킴 이동은 안내 후 차단합니다. originWhitelist는 모든 요청을 onShouldStartLoadWithRequest 정책으로 보내기 위한 설정이며, 실제 허용 범위는 설정된 웹 origin입니다.

## Google 로그인

Supabase → Authentication → URL Configuration → Redirect URLs에 아래 주소를 추가하고 저장합니다. 기존 웹용 복귀 주소는 유지하세요.

```text
com.healthnote.app://auth/callback
```

사용자가 위 설정 저장 완료를 확인했습니다. Google Cloud의 기존 웹용 OAuth 클라이언트와 Supabase Google provider 설정은 그대로 사용합니다. 이번 방식은 네이티브 Google SDK를 쓰지 않으므로 Android OAuth 클라이언트나 SHA 등록을 새로 요구하지 않습니다.

흐름:

1. 기존 웹의 `signInWithGoogle.ts`가 WebView 안에 PKCE verifier를 저장하고 Google OAuth URL을 만듭니다.
2. 앱이 `onShouldStartLoadWithRequest`에서 설정한 Supabase origin + `/auth/v1/authorize` + Google + S256 challenge + 원래 웹 복귀 origin을 검사합니다. 요청의 challenge는 유지하고 `redirect_to`만 앱 callback으로 바꿉니다.
3. Expo WebBrowser가 Android Chrome Custom Tabs / iOS 인증 세션을 엽니다. Google 로그인은 embedded WebView에서 수행하지 않습니다.
4. 브라우저가 callback으로 반환한 일회용 code만 받아, 원래 WebView의 웹 origin으로 `location.replace`합니다. callback의 scheme/host/path를 정확히 확인하고 오류·토큰·중복 code는 거절합니다. 진행 중인 인증 세션에서만 복귀를 처리합니다.
5. 기존 웹 Supabase 클라이언트(`flowType: 'pkce'`, 기본 `detectSessionInUrl: true`)가 같은 WebView 저장소의 verifier와 code를 교환합니다. 성공하면 웹 라이브러리가 URL의 code를 제거하고 세션을 저장합니다.

앱에는 Supabase 클라이언트나 장기 토큰 저장소를 만들지 않았습니다. 인증 요청의 PKCE verifier는 처음부터 끝까지 WebView 저장소에 남고, 인증 코드만 전달합니다. 다른 코드로 앱 복귀를 위조해도 해당 verifier와 일치하지 않으면 서버의 코드 교환이 실패합니다. 브라우저 로그인 세션이 WebView에 자동 공유된다고 가정하지 않습니다. 웹 로그아웃은 기존 웹 Supabase 클라이언트가 처리합니다.

취소하거나 브라우저를 닫으면 로그인 페이지를 새로 불러와 버튼을 다시 활성화합니다. 복귀 오류는 안내 후 재시도할 수 있습니다. 인증 중 OS가 앱 프로세스를 종료하면 진행 중이던 native 인증 세션은 복원하지 않습니다. 앱을 다시 열어 로그인을 재시도하세요. 앱 재실행 시 이미 완료된 로그인은 WebView의 기존 세션으로 복원합니다.

기존 웹 소스는 읽기 전용 확인했고 수정하지 않았습니다. 웹은 이미 필요한 PKCE 코드 교환을 제공하므로 웹 재배포도 필요하지 않습니다. auth URL 구성 방식이나 PKCE 설정을 웹에서 변경하면 앱의 연동 검사와 브라우저 테스트를 함께 확인해야 합니다.

검증 경계: 허용 origin/PKCE/callback 단위 테스트, 기존 웹의 실제 Supabase 클라이언트가 verifier로 코드를 교환하고 세션을 복원하는 격리 Chrome 검증을 수행했습니다. 로컬·배포 웹 Chrome 테스트의 Supabase token/user/REST 응답은 모의 응답입니다. 실제 Google 계정 인증과 Android/iOS 브라우저→앱 전환은 실기기 미확인입니다.

푸시·카메라·헬스 데이터·스토어 배포는 이번 범위에 포함하지 않습니다.

## 로그인 후 로딩 표시 수정 (1.0.2)

Android WebView는 `doUpdateVisitedHistory`에서도 loading-start 이벤트를 보냅니다. 로그인 후 웹 Supabase 클라이언트가 `history.replaceState`로 인증 코드를 URL에서 제거할 때처럼, 실제 문서 로딩 없이 주소가 바뀌어도 이벤트가 올 수 있습니다. 기존 앱은 이때 로딩 표시를 무조건 켜서, 뒤에 load-end가 없으면 로딩 화면이 남았습니다. 이제 `onLoadStart`에서 `nativeEvent.loading` 값을 그대로 반영합니다.

`tests/webViewLoading.test.cjs`는 실제 React 렌더링과 대체한 native 이벤트로 '로딩 완료 → 주소 변경(loading=false)'에서 표시가 다시 켜지지 않는지 검사합니다. 수정 전 실패, 수정 후 통과를 확인했습니다. 실제 문서 로딩(loading=true)과 완료 이벤트도 검사합니다. 사용자가 겪은 특정 이벤트 순서는 기기 로그가 없어 확정하지 못했습니다.

## 검증

1.0.2 APK(2026-10-17): Android release 빌드와 서명 검사 통과. 버전 코드 3, 1.0.1과 동일한 테스트 서명, 내장 웹 URL과 인증 callback을 확인했습니다. 수정 단계에서 타입·린트·회귀 테스트 포함 총 9개가 통과했습니다. 실제 기기에서 로그인 후 표시가 사라지는지는 미확인입니다.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx expo install --check
```

2026-10-16: 타입·린트·history 단위 테스트 3개, Android/iOS Metro 번들 생성, Expo 개발 서버 기동과 `/status` 응답, 온라인 의존성 호환 검사 통과. `build`는 JS/Hermes 번들 검사이며 APK/IPA 네이티브 컴파일이나 설치 성공을 의미하지 않습니다.

추가 APK 검증(2026-10-16): `:app:assembleRelease` 네이티브 빌드 성공. 배포 URL `https://health-note-six.vercel.app/`의 HTTPS 200 응답, APK 내부 Hermes 번들과 해당 URL 포함, apksigner v2 서명 검사, 앱 ID `com.healthnote.app` 및 최소 Android API 24를 확인했습니다. 배포용 복사본은 `artifacts/health-note-1.0.0.apk`(66.4 MiB)이며 기본 테스트 서명입니다. 연결된 휴대폰이 없어 실제 설치·실행은 미확인입니다.

1.0.1 로그인 연동 검증(2026-10-16): 타입·린트·단위 테스트 8개, Android/iOS JS 번들, Android 네이티브 release APK 빌드와 서명 검사를 통과했습니다. 로컬 웹 및 실제 배포 웹의 격리 Chrome 컨텍스트에서 PKCE challenge/verifier 일치, callback code 교환, URL code 제거, 새로고침 세션 복원, 로그아웃을 확인했습니다. Supabase token/user/REST 응답은 모의 응답이며 실제 Google 로그인 완료를 의미하지 않습니다. APK 내부에 웹/Supabase URL과 callback 문자열 및 Android scheme 등록을 확인했습니다. 버전 코드는 2, 서명은 1.0.0과 같으며 `artifacts/health-note-1.0.1.apk`(66.4 MiB)로 업데이트 설치할 수 있습니다.

실제 Android 연결 장치가 없고 iOS Simulator 서비스를 사용할 수 없어 실제 앱 화면·재시도·하드웨어 뒤로가기·React Router 실제 WebView 이동·dialog·safe area·Google 계정 인증 완료는 미확인입니다.

기기 확인 순서: URL 누락 안내 → 도달 불가능한 URL의 오류/재시도 → 웹 로그인 표시 → Google 인증 브라우저 열기 → 앱 복귀 → `/` → `/exercise` → 상세 → 뒤로 이동 → 시작 화면의 기본 뒤로가기. replace 이동·상세 새로고침·모달 열림 상태도 확인하세요.

설치 시 npm audit: 22건(높음 15, 보통 7). 주로 Expo/Metro/React Native의 전이 의존성 경로이며 일부 자동 수정 제안은 Expo 44/RN 0.72로 변경하므로 강제 적용하지 않았습니다. 배포 준비 시 upstream 호환 패치와 실제 advisory 영향을 재확인해야 합니다.

## 공식 참고 문서

- [Expo 초기화 및 blank-typescript](https://docs.expo.dev/more/create-expo/)
- [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/)
- [WebView API](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)
- [Expo 환경변수](https://docs.expo.dev/guides/environment-variables/)
- [Expo safe area](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Google OAuth 정책](https://developers.google.com/identity/protocols/oauth2/policies)
- [Expo 인증](https://docs.expo.dev/guides/authentication/)
- [Supabase 모바일 deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
