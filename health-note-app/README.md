# Health Note App

Health Note 웹을 WebView로 제공하는 Android/iOS용 Expo + TypeScript 앱입니다. 제품 화면과 하단 메뉴는 웹이 담당합니다. Google 로그인은 시스템 인증 브라우저와 WebView의 PKCE 코드 교환을 연결합니다.

## 준비 및 실행

Node.js 22 LTS 이상을 사용하세요. 이 프로젝트는 Node 22.23.3, Expo SDK 58, React Native 0.88, WebView 14.0.1로 초기화했습니다. 정확한 의존성은 package-lock.json에 고정되어 있습니다.

```sh
npm ci
cp .env.example .env
# .env에 웹 주소와 Google 로그인용 Supabase URL 입력
npm start
```

EXPO_PUBLIC_WEB_URL은 HTTP(S) 절대 주소입니다. Google 로그인에는 웹의 `VITE_SUPABASE_URL`과 같은 HTTPS 주소를 `EXPO_PUBLIC_SUPABASE_URL`에도 설정해야 합니다. Supabase 키나 토큰은 앱 환경변수에 넣지 않습니다. 공백·누락·잘못된 주소이면 앱에서 설정 방법을 안내합니다. 웹 주소에 기본값은 없으므로 연결할 환경에 맞게 설정하세요. EXPO_PUBLIC 변수는 번들에 공개되므로 비밀 키를 넣지 마세요. 변경 후 앱을 완전히 다시 로드하고, 반영되지 않으면 `npx expo start --clear`로 다시 시작하세요. 배포 번들은 다시 생성해야 합니다.

SDK 58을 지원하는 Expo Go에서 QR을 열거나, Android 에뮬레이터를 실행한 뒤 `npx expo start --android`를 사용하세요. `npm run android`는 생성된 네이티브 프로젝트를 로컬 컴파일하여 실행합니다. iOS Simulator는 macOS + Xcode + 설치된 iOS 런타임이 필요하며 `npm run ios`로 엽니다. 이 앱의 WebView는 Android/iOS용입니다. Expo 웹 실행은 제공하지 않습니다.

## APK로 직접 설치하기

배포된 HTTPS 웹을 사용하는 APK는 Expo Go나 Metro 개발 서버 없이 실행됩니다. 웹 서버에 접속할 인터넷은 필요합니다. 현재 Android 앱 ID는 로컬 설치 테스트용 `com.healthnote.app`입니다.

macOS 로컬 빌드에는 Android SDK와 호환 JDK가 필요합니다. 로컬 빌드 환경 예시는 SDK 경로 `~/Library/Android/sdk`, JDK 21, Node 22.23.3입니다.

```sh
# nvm 사용 시
nvm use 22.23.3
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME="$HOME/Library/Android/sdk"
# 앱 폴더에서 .env의 웹·Supabase URL 확인 후 Android 프로젝트 생성
npx expo prebuild --platform android --no-install
cd android
NODE_ENV=production ./gradlew :app:assembleRelease --console=plain --max-workers=4
```

출력 파일: `android/app/build/outputs/apk/release/app-release.apk`. 현재 설치용 복사본은 `artifacts/health-note-1.0.2.apk`입니다. Expo 템플릿의 release 빌드는 현재 기본 debug keystore로 서명합니다. JS가 내장된 release 변형이지만 서명은 로컬 설치 테스트용이며, 스토어 배포용 서명은 아닙니다. 스토어 배포 시 고유 앱 ID 확정과 별도 서명 키 관리가 필요합니다.

APK를 휴대폰에 옮겨 파일을 열고, 해당 파일 앱의 '출처를 알 수 없는 앱 설치'를 허용하여 설치하세요. USB 디버깅으로 설치하려면 `health-note-app/` 폴더에서 다음을 실행합니다.

```sh
adb devices
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

`adb devices` 목록이 비어 있으면 USB 연결·디버깅 설정·PC 연결 승인을 확인하세요. 서명이 다른 같은 앱 ID가 이미 설치되어 있으면 업데이트가 거부될 수 있습니다. 이 경우 기존 앱 삭제 전에 WebView 안의 로컬 데이터가 삭제될 수 있음을 확인하세요.

## Expo Go로 실제 Android 휴대폰 연결

1. PC와 휴대폰을 같은 Wi-Fi에 연결합니다. 호환되는 Expo Go를 휴대폰에 설치합니다.
2. `health-note/` 폴더에서 `npm run dev -- --host 0.0.0.0`으로 Vite를 실행합니다.
3. PC의 LAN IP가 예를 들어 `192.168.0.10`이면 앱 `.env`에 `EXPO_PUBLIC_WEB_URL=http://192.168.0.10:5173`을 설정합니다. 이는 설명용 IP이므로 실제 PC 주소로 바꾸세요.
4. 앱 폴더에서 `npm start` 후 Expo Go로 QR을 스캔합니다. 방화벽에서 Metro와 Vite 연결을 허용하고 Wi-Fi의 기기 간 통신 차단 여부를 확인하세요.
5. USB 사용 시 Android 개발자 옵션과 USB 디버깅을 켜고 PC 연결을 승인합니다. `adb devices`에서 `device` 상태를 확인하세요. `adb reverse tcp:8081 tcp:8081`, `adb reverse tcp:5173 tcp:5173` 후 `npx expo start --localhost --android`를 사용하면 웹 주소도 `http://127.0.0.1:5173`으로 설정할 수 있습니다. USB reverse를 해제하면 이 주소는 동작하지 않습니다.

휴대폰의 `localhost`는 휴대폰 자신입니다. PC를 가리키지 않습니다. Android Studio 기본 에뮬레이터에서는 `http://10.0.2.2:5173`으로 호스트 PC에 접근할 수 있습니다. Expo의 `--tunnel`은 Metro 연결만 해결하며 별도 Vite 웹 주소를 공개하지 않습니다.

**HTTP 제약:** Expo Go와 자체 빌드의 네트워크 정책은 다를 수 있습니다. Android cleartext 정책과 iOS ATS 때문에 HTTP가 거절될 수 있습니다. 앱은 전역 HTTP 예외를 추가하지 않습니다. HTTPS 개발 URL을 우선 사용하세요. 자체 빌드에서 HTTP가 꼭 필요하면 후속 작업으로 개발 빌드에 한정한 Android cleartext / iOS ATS 예외를 설정하고 재빌드해야 합니다. LAN HTTP는 secure context가 아니므로 웹의 `crypto.randomUUID()` 같은 API도 제한될 수 있습니다. HTTPS에서는 신뢰 가능한 인증서를 사용하세요.

로컬 웹이 PC의 Docker Supabase에 연결되어 있다면 웹 서버 연결만으로 로그인·DB 요청까지 연결되지는 않습니다. 웹의 Supabase 접속 주소와 인증 복귀 URL도 기기에서 접근 가능해야 합니다. 현재 앱의 Google 인증 연결은 HTTPS Supabase 주소만 허용합니다. 로컬 연결 제약은 [웹 README](../health-note/README.md#android-확인)를 참고하세요.

## Google 로그인 설정

앱의 `EXPO_PUBLIC_SUPABASE_URL`을 웹의 `VITE_SUPABASE_URL`과 같은 HTTPS 주소로 설정합니다. Supabase의 Authentication → URL Configuration → Redirect URLs에 다음 주소를 등록하고 기존 웹용 복귀 주소도 유지합니다.

```text
com.healthnote.app://auth/callback
```

Google Cloud의 웹용 OAuth 클라이언트와 Supabase Google provider 설정을 사용합니다. 앱은 네이티브 Google SDK 대신 시스템 인증 브라우저를 사용합니다. 연결 구조와 취소·복귀 처리는 [앱 아키텍처](docs/architecture.md#google-인증-연결)를 참고하세요.

## 검증

`health-note-app/` 폴더에서 실행합니다.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx expo install --check
```

`build`는 Android/iOS JS·Hermes 번들 생성 검사이며 APK/IPA 네이티브 컴파일이나 설치 성공을 의미하지 않습니다. 자동 테스트의 대체 native 이벤트·모의 인증 응답은 실제 Google 로그인이나 브라우저→앱 복귀 성공의 증거가 아닙니다.

실제 기기에서는 다음 흐름을 별도로 확인합니다.

- URL 누락 안내, 연결 오류와 재시도
- Google 인증 브라우저 열기, 취소, 로그인 후 앱 복귀와 세션 복원
- 홈·목록·상세 이동과 Android 뒤로가기, 시작 화면에서 OS 기본 뒤로가기
- replace 이동·새로고침·모달이 열린 상태의 뒤로가기
- safe area, 화면 회전, 키보드·터치 동작

## 문서

- [앱 아키텍처](docs/architecture.md): WebView·탐색·안전 영역·Google 인증 연결·로딩 표시
- [공통 작업 지침](../AGENTS.md)
- [웹 실행·환경 안내](../health-note/README.md)

## 공식 참고 문서

- [Expo 초기화 및 blank-typescript](https://docs.expo.dev/more/create-expo/)
- [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/)
- [WebView API](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)
- [Expo 환경변수](https://docs.expo.dev/guides/environment-variables/)
- [Expo safe area](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Google OAuth 정책](https://developers.google.com/identity/protocols/oauth2/policies)
- [Expo 인증](https://docs.expo.dev/guides/authentication/)
- [Supabase 모바일 deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
