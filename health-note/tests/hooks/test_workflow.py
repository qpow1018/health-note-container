"""Run with python3 -B -m unittest discover -s tests/hooks; no model/API calls."""

import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / '.codex/hooks/workflow.py'


class WorkflowTests(unittest.TestCase):
    def event(self, name):
        result = subprocess.run(
            [sys.executable, '-B', str(SCRIPT)],
            input=json.dumps({'hook_event_name': name}),
            text=True, capture_output=True, check=True,
        )
        return json.loads(result.stdout)

    def test_only_prompt_submission_is_registered(self):
        config = json.loads((ROOT / '.codex/hooks.json').read_text())
        self.assertEqual(list(config['hooks']), ['UserPromptSubmit'])
        self.assertEqual(len(config['hooks']['UserPromptSubmit']), 1)
        self.assertEqual(len(config['hooks']['UserPromptSubmit'][0]['hooks']), 1)

    def test_prompt_adds_context_without_blocking(self):
        result = self.event('UserPromptSubmit')
        self.assertEqual(set(result), {'hookSpecificOutput'})
        output = result['hookSpecificOutput']
        self.assertEqual(set(output), {'hookEventName', 'additionalContext'})
        self.assertEqual(output['hookEventName'], 'UserPromptSubmit')
        self.assertTrue(output['additionalContext'].strip())

    def test_other_events_do_not_request_continuation_or_block_tools(self):
        for name in ['Stop', 'PreToolUse']:
            with self.subTest(event=name):
                self.assertEqual(self.event(name), {})


if __name__ == '__main__':
    unittest.main()
