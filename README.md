# Health Note

하나의 제품을 구성하는 웹앱과 네이티브 앱을 함께 관리하는 저장소입니다.

- [health-note](health-note/README.md): 웹 기능과 화면.
- [health-note-app](health-note-app/README.md): WebView 및 네이티브 연동.

각 프로젝트 폴더에서 의존성을 설치하고 개발·검증 명령을 실행합니다. 공통 작업 기준은 [AGENTS.md](AGENTS.md)를 참고합니다.

실사용 중 발견한 문제와 조사·해결 기록은 [이슈 목록](docs/issues/README.md)에서 관리합니다.

## Git 이력

기존 두 저장소의 main 이력을 squash 없이 Git subtree로 합쳤습니다. 기존 커밋 해시는 유지되며, 과거 커밋 내부 경로는 당시 저장소 루트 기준입니다. `git log --all`과 기존 커밋 해시로 이력을 조회할 수 있습니다. 이후 변경은 이 저장소에서 커밋합니다.

## 배포 전환

새 저장소를 Vercel에 연결할 때 Root Directory는 `health-note`로 설정합니다. 환경 변수와 Production 브랜치 설정을 확인하고 배포를 검증한 뒤 기존 저장소를 보관합니다.
