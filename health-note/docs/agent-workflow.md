# 에이전트 작업 hook

설정은 [.codex/hooks.json](../.codex/hooks.json), 실행 코드는 [workflow.py](../.codex/hooks/workflow.py)에 있다.

`UserPromptSubmit` 하나만 사용해 요청 시작 시 작업 절차를 추가 맥락으로 전달한다. 구현 후 검토·설명, 변경에 맞는 테스트 선택, 커밋 전 최종 diff 리뷰를 상기시키고 실제 판단은 AI와 기존 스킬에 맡긴다.

- 구현·제품 코드 수정: 구현 설명·테스트 스킬을 적용하고 변경 이유·핵심 구현·검증 결과를 전달한다.
- 커밋: 최종 diff와 기존 검증의 유효성을 확인하고, 추가 변경이나 검증 공백이 있을 때만 필요한 검사를 수행한다.
- 설명·리뷰: 코드 수정·테스트를 자동 실행하지 않는다.
- 테스트만 요청: 테스트 스킬을 적용하고 제품 코드를 임의 수정하지 않는다.
- 문서: 링크·설정·포맷 등 관련 검사로 제한한다.

현재 사용자 환경의 `~/.codex/skills/review-feature-implementation/SKILL.md`와 `~/.codex/skills/test-feature-behavior/SKILL.md`를 안내한다. 사용자 요청과 기존 AGENTS.md 절차를 우선하며, 권한이나 작업 범위를 추가하지 않는다.

## 범위와 한계

hook은 명령을 차단하거나 종료 후 추가 턴을 만들지 않는다. Git 명령 분석·파일 지문·임시 상태 저장·별도 모델 실행도 사용하지 않는다. 매 요청에 안내가 추가되므로 맥락 비용은 발생하지만 테스트 실행이나 구현 설명 자체를 매번 요구하지는 않는다.

이 hook은 안내를 반복해서 제공하는 보조 수단이다. AI가 절차를 실제 수행했는지나 리뷰·테스트의 품질을 보장하지 않는다. 기존 지침만 사용할 때보다 누락이 줄어드는지는 실제 사용으로 확인해야 한다. 효과가 없으면 안내를 중복 유지하기보다 hook 제거를 검토한다.

## 활성화와 검증

프로젝트 `.codex/` 설정과 새 hooks 정의는 Codex에서 검토·신뢰해야 실행된다. 프로젝트 위치에서 Codex CLI를 열고 `/hooks`에서 `UserPromptSubmit` 하나가 등록됐는지 확인한다. 이전 세 이벤트 정의를 이미 신뢰했더라도 변경된 정의는 다시 확인해야 한다. 신뢰 확인을 우회하지 않는다.

```sh
python3 -B -m unittest discover -s tests/hooks -v
```

[테스트](../tests/hooks/test_workflow.py)는 이벤트 등록과 스크립트의 JSON 출력을 확인한다. 실제 데스크톱의 이벤트 전달이나 AI의 후속 작업 품질은 검증하지 않는다. 실제 발동을 확인하기 전까지 기존 AGENTS.md 절차는 유지한다.

참고: [Codex hooks 공식 문서](https://learn.chatgpt.com/docs/hooks).
