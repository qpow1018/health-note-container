"""Add workflow guidance at prompt submission without blocking or tracking state."""

import json
from pathlib import Path
import sys


def main():
    event = json.load(sys.stdin)
    if event.get('hook_event_name') != 'UserPromptSubmit':
        print('{}')
        return

    skills = Path.home() / '.codex/skills'
    guidance = (
        '현재 사용자 요청과 대화 맥락을 기준으로 작업 종류를 판단하세요. '
        '구현·제품 코드 수정이라면 기존 구조와 기대 동작을 확인하고, 완료 전에 '
        f'{skills / "review-feature-implementation/SKILL.md"}으로 요구사항·책임·단순성을 검토하고 '
        f'{skills / "test-feature-behavior/SKILL.md"}으로 변경에 적합한 최소 검증을 선택하세요. '
        '최종 응답에는 변경 이유·핵심 구현·검증 결과와 미확인 범위를 작업 규모에 맞게 설명하세요. '
        '커밋 요청이라면 스테이징할 최종 diff를 리뷰하고, 현재 코드에 유효한 검증 결과를 확인하세요. '
        '이후 변경이나 검증 공백이 있을 때만 필요한 검사를 추가하며 E2E를 일괄 강제하지 마세요. '
        '설명·리뷰만 요청한 경우에는 코드 수정이나 테스트를 자동 실행하지 마세요. '
        '테스트만 요청했다면 테스트 스킬을 적용하고 제품 코드를 임의 수정하지 마세요. '
        '문서 작업은 링크·설정·포맷 등 관련 검증으로 제한하세요. '
        '이미 수행한 절차와 충분한 설명을 반복하지 말고, 사용자 지시와 요청 범위를 우선하세요. '
        '이 안내는 커밋·배포 권한을 추가하거나 승인·사용자 답변 대기를 해제하지 않습니다.'
    )
    print(json.dumps({
        'hookSpecificOutput': {
            'hookEventName': 'UserPromptSubmit',
            'additionalContext': guidance,
        },
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
