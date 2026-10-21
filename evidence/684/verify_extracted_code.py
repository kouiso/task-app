import argparse
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
args = parser.parse_args()
root = args.root
days = root / 'material/30days-curriculum'
day28 = next(days.glob('day28_*.md')).read_text()
day29 = next(days.glob('day29_*.md')).read_text()
blocks28 = re.findall(r'^```(?:typescript|tsx)[^\n]*\n(.*?)^```', day28, re.M | re.S)
blocks29 = re.findall(r'^```(?:typescript|tsx)[^\n]*\n(.*?)^```', day29, re.M | re.S)
checks = []
for block in blocks28:
    for name in ('bulkComplete', 'bulkUpdateStatus'):
        match = re.search(r'const ' + name + r'Mutation = api\.task\.' + name + r'\.useMutation\(\{.*?\n\s*\}\);', block, re.S)
        if match:
            checks.append({'kind': 'mutation', 'name': name, 'code': match.group()})
    for name in ('selectAllState', 'isAllSelected'):
        match = re.search(r'const ' + name + r' =.*?;', block, re.S)
        if not match:
            continue
        offset = day28.index(block) + match.start()
        preceding = day28[:offset]
        counts = list(re.finditer(r'const selectedSelectableCount =.*?;', preceding, re.S))
        count = counts[-1].group() if counts else ''
        checks.append({'kind': 'selection', 'name': name, 'code': count + '\n' + match.group()})
for block in blocks29:
    for match in re.finditer(r"if \(trpcError\.code === 'NOT_FOUND'[^\n]*notFound\(\);", block):
        checks.append({'kind': '404', 'code': match.group()})
    pattern = r"onClick=\{\(\) => router\.push\(([^\n]+)\)\}.*?<ArrowLeft[^\n]*\n([^\n]+)"
    for match in re.finditer(pattern, block, re.S):
        if match.group(1).strip() != "'/user'" and not match.group(1).strip().startswith("isAdmin ? '/user'"):
            continue
        checks.append({'kind': 'back', 'route': match.group(1).strip(), 'label': match.group(2).strip()})

javascript = r'''
const vm = require('node:vm');
const assert = require('node:assert/strict');
const checks = JSON.parse(process.argv[1]);
let passed = 0;
let failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.log('FAIL ' + name + ': ' + error.message); }
}
const kinds = Object.fromEntries(['mutation','selection','404','back'].map(k => [k, checks.filter(c => c.kind === k).length]));
check('all Step, recap and complete-file copies covered', () => assert.deepEqual(kinds, { mutation: 6, selection: 4, '404': 6, back: 3 }));
checks.forEach((item, i) => {
  if (item.kind === 'mutation') {
    check(`${i} ${item.name}: error notifies and preserves selection; success clears`, () => {
      const notices = [];
      let options;
      let selected = new Set(['task-a']);
      let invalidations = 0;
      vm.runInNewContext(item.code, {
        api: { task: { [item.name]: { useMutation: value => { options = value; } } } },
        utils: { task: { getAll: { invalidate: () => invalidations++ } } },
        setSelectedTasks: value => { selected = value; },
        notifyMutationError: (error, fallback) => notices.push({error, fallback}),
      });
      const error = { message: 'server rejected' };
      assert.equal(typeof options.onError, 'function');
      options.onError(error);
      assert.equal(notices.length, 1);
      assert.equal(notices[0].error, error);
      assert.equal(notices[0].fallback, item.name === 'bulkComplete' ? 'タスクの一括完了に失敗しました' : 'ステータスの一括変更に失敗しました');
      assert.equal(selected.has('task-a'), true);
      assert.equal(invalidations, 0);
      options.onSuccess();
      assert.equal(selected.size, 0);
      assert.equal(invalidations, 1);
    });
  } else if (item.kind === 'selection') {
    const scenarios = [
      ['none', ['a','b'], [], false],
      ['partial', ['a','b'], ['a'], 'indeterminate'],
      ['all', ['a','b'], ['a','b'], true],
      ['only stale selection', ['a','b'], ['lost-a','lost-b'], false],
      ['stale selection with partial current selection', ['a','b'], ['a','lost-a'], 'indeterminate'],
      ['all current plus stale', ['a','b'], ['a','b','lost-a'], true],
      ['no selectable tasks', [], ['lost-a'], false],
    ];
    for (const [name, ids, selected, expected] of scenarios) {
      check(`${i} ${item.name}: ${name}`, () => {
        const context = { selectableTasks: ids.map(id => ({id})), selectedTasks: new Set(selected), selectedTaskList: selected.map(id => ({id})) };
        const actual = vm.runInNewContext(item.code + '\n' + item.name, context);
        assert.equal(actual, item.name === 'isAllSelected' ? expected === true : expected);
      });
    }
  } else if (item.kind === '404') {
    for (const code of ['BAD_REQUEST', 'NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED']) {
      check(`${i} server routing: ${code}`, () => {
        let calls = 0;
        vm.runInNewContext(item.code, {trpcError: {code}, notFound: () => calls++});
        assert.equal(calls, ['BAD_REQUEST','NOT_FOUND'].includes(code) ? 1 : 0);
      });
    }
  } else {
    for (const isAdmin of [true,false]) {
      check(`${i} back button: ${isAdmin ? 'admin' : 'ordinary user'}`, () => {
        assert.equal(vm.runInNewContext(item.route, {isAdmin}), isAdmin ? '/user' : '/dashboard');
        const label = item.label.startsWith('{') ? item.label.slice(1,-1) : JSON.stringify(item.label);
        assert.equal(vm.runInNewContext(label, {isAdmin}), isAdmin ? 'ユーザー一覧に戻る' : 'ダッシュボードに戻る');
      });
    }
  }
});
console.log(JSON.stringify({passed,failed,copies:kinds}));
process.exitCode = failed ? 1 : 0;
'''
result = subprocess.run(['node', '-e', javascript, json.dumps(checks, ensure_ascii=False)], text=True)
raise SystemExit(result.returncode)
