import json
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
DAY30 = ROOT / 'material/30days-curriculum/day30_完成版を公開！.md'


class Day30ReleaseInstructionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = DAY30.read_text(encoding='utf-8')

    def section(self, start, end):
        return self.text.split(start, 1)[1].split(end, 1)[0]

    def test_preview_setup_does_not_reuse_production_signing_key(self):
        setup = self.section('### Step 1:', '### Step 2:')
        self.assertNotIn('にも同じ値を登録', setup)
        preview = setup.split('ブランチの Preview', 1)[1].split('**シークレットキー', 1)[0]
        self.assertIn('JWT_SECRET', preview)
        self.assertIn('別', preview)

    def test_placeholder_url_has_replacement_instruction_before_command(self):
        step = self.section('### Step 5:', '### Step 6:')
        before_command = step.split('open https://your-app-name.vercel.app', 1)[0]
        self.assertIn('your-app-name', before_command)
        self.assertIn('置き換', before_command)

    def test_each_checklist_route_is_in_numbered_walkthrough(self):
        table = self.section('#### 本番環境チェックリスト', '**確認手順**:')
        steps = self.section('**確認手順**:', '> ブラウザの DevTools')
        expected = set(re.findall(r'`(/[^`]+)`', table))
        observed = set(re.findall(r'`(/[^`]+)`', steps))
        self.assertEqual(len(expected), 8)
        self.assertEqual(expected - observed, set())

    def test_commit_count_is_not_claimed_as_daily_activity_proof(self):
        self.assertNotIn('コミット数が 30 以上あれば毎日コミットできた証拠', self.text)

    def test_introduction_acknowledges_next_config_change(self):
        introduction = self.section('### 30日間の歩み', '### やること / やらないこと')
        self.assertIn('next.config.ts', introduction)
        self.assertNotIn('アプリのコードには一行も手を入れません', introduction)

    def test_server_and_client_examples_parse_as_separate_tsx_modules(self):
        after = self.section('#### After（プロが書くコード）', '#### 覚えておきたいエッセンス')
        blocks = re.findall(r'^```typescript\n(.*?)^```', after, re.M | re.S)
        self.assertEqual(len(blocks), 3)
        modules = [blocks[0], '\n'.join(blocks[1:])]
        program = """
const ts = require('typescript');
const fs = require('node:fs');
const modules = JSON.parse(fs.readFileSync(0, 'utf8'));
const errors = modules.map((text, index) => {
  const source = ts.createSourceFile(`example-${index}.tsx`, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return source.parseDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\\n'));
});
process.stdout.write(JSON.stringify(errors));
"""
        result = subprocess.run(['node', '-e', program], input=json.dumps(modules), cwd=ROOT, capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(result.stdout), [[], []])
        self.assertNotIn("'use client'", modules[0])
        self.assertIn("'use client'", modules[1])


if __name__ == '__main__':
    unittest.main()
