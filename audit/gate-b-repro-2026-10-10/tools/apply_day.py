#!/usr/bin/env python3
"""Gate-B day applier v3.
- fresh filepath marker (no 続き) opens a new full listing; 続き blocks extend it.
- Within a day/path, if the LAST segment assembles to a parseable complete file -> use it.
- Else, oracle-merge: use completed baseline (gate-b-repro/app) as anchor map.
  Each fragment must appear (normalized) inside baseline; splice fragments into
  current file at the anchor line preceding the fragment in baseline.
  Non-locatable -> gap ledger."""
import re, sys, json, difflib
from pathlib import Path

ROOT = Path("/Users/devin/gate-b-repro/repro")
BASE = Path("/Users/devin/gate-b-repro/app")
LEDGER = Path("/Users/devin/gate-b-repro/logs/ledger.jsonl")
FP_RE = re.compile(r'filepath:\s*([^\s（)\u3000]+)')
PATH_OK = re.compile(r'^[A-Za-z0-9_./\-]+$')
CONT = '同じファイルの続き'
ELLIP = re.compile(r'^\s*(//|/\*|\{/\*|<!--)?\s*(…|\.\.\.|（?(変更|既存|省略|中略|前略|後略|以降は同じ|同様))')

def fragments(md_path):
    text = md_path.read_text(encoding='utf-8')
    frags = []
    for m in re.finditer(r'```[a-zA-Z0-9]*\n(.*?)```', text, re.S):
        code = m.group(1)
        fm = FP_RE.search(code)
        if not fm:
            continue
        path = fm.group(1)
        if not PATH_OK.match(path):
            continue
        body = '\n'.join(l for l in code.split('\n') if 'filepath:' not in l)
        if not body.strip():
            continue
        head = '\n'.join(code.split('\n')[:2])
        frags.append((path, CONT in code, body, '完成版' in head))
    return frags

def norm(lines):
    return [l.rstrip() for l in lines if l.strip()]

def has_ellipsis(body):
    return any(ELLIP.match(l) for l in body.split('\n'))

def looks_complete(body):
    # heuristic: balanced braces & parens-ish, and not leading with mid-expression
    if has_ellipsis(body):
        return False
    s = body
    opens = s.count('{'); closes = s.count('}')
    return opens == closes and opens > 0

import subprocess, tempfile
ESB = str(ROOT / 'node_modules/.bin/esbuild')
def parses_as_file(path: str, body: str) -> bool:
    if has_ellipsis(body) or not body.strip():
        return False
    ext = path.rsplit('.', 1)[-1].lower() if '.' in path else ''
    if ext in ('ts', 'tsx', 'js', 'mjs', 'jsx'):
        with tempfile.NamedTemporaryFile('w', suffix='.' + ext, delete=False) as t:
            t.write(body)
            tmp = t.name
        # esbuild は拡張子で loader を推論する（--loader:xxx は invalid 構文で全拒否＝誤判定の原因）
        r = subprocess.run([ESB, tmp, '--outfile=/dev/null'],
                           capture_output=True, text=True)
        return r.returncode == 0
    if ext == 'json':
        try:
            json.loads(body)
            return True
        except Exception:
            return False
    # css/prisma/env/yml/sh/md 等: ellipsis無しなら受理
    return True

def find_in(hay_lines, frag_lines, start=0):
    fl = norm(frag_lines)
    if not fl:
        return -1
    n, m = len(hay_lines), len(fl)
    for i in range(start, n - m + 1):
        if hay_lines[i:i+m] == fl:
            return i
    return -1

def apply_day(md_path, tag):
    frags = fragments(md_path)
    order, per = [], {}
    for path, cont, body, kansei in frags:
        if path not in per:
            per[path] = []
            order.append(path)
        per[path].append((cont, body, kansei))
    applied, gaps = [], []
    for path in order:
        chunks = per[path]
        dest = ROOT / path
        baseline = BASE / path
        base_lines = norm(baseline.read_text(encoding='utf-8').split('\n')) if baseline.exists() else []
        # case 1: split into listing segments (fresh marker = new segment);
        # take the LAST segment that parses as a complete file
        dest.parent.mkdir(parents=True, exist_ok=True)
        KANSEI = re.compile(r'^\s*(//|\{/\*)\s*完成版')
        segs = []
        seg_kansei = []
        prev_kansei = False
        for cont, body, kansei in chunks:
            first_line = body.split('\n', 1)[0] if body else ''
            is_kansei = kansei or bool(KANSEI.match(first_line))
            if (cont or (is_kansei and prev_kansei)) and segs:
                segs[-1].append(body)
            else:
                segs.append([body])
                seg_kansei.append(is_kansei)
            prev_kansei = is_kansei
        # 完成版ランの断片を全結合（途中にcont=Trueで無印の部品が混ざる材料由来の実態に対応。
        # ランの先頭が完成版印なら、そのラン全体を完成版とみなす）
        kansei_join = ''
        if any(seg_kansei):
            kansei_join = '\n'.join(b
                                    for seg, ks in zip(segs, seg_kansei) if ks
                                    for b in seg)
        # import必須条件: 当日断片がimportを示すか、既存ファイルがimportを持つ場合
        # （後日の増分断片がimportなしJSX/関数だけの説明ブロックとして誤って全置換されるのを防ぐ）
        dest_text = dest.read_text(encoding='utf-8') if dest.exists() else ''
        any_import = any('import ' in b for _c, b, _k in chunks) or \
            (dest.exists() and 'import ' in dest_text)
        # 候補0: 完成版ランの順序結合（分割リスティングは完成版=最終版なので最優先）
        # 候補1: 最終パース可セグメント（後方から・Before/Afterで最新版を取る）
        candidates = ([kansei_join] if kansei_join else []) + \
                     ['\n'.join(s) for s in reversed(segs) if s]
        # 候補2: 全断片の順序結合（セグメントが一つも採用できない場合のフォールバック）
        candidates.append('\n'.join(b for _c, b, _k in chunks))
        is_ts_family = path.rsplit('.', 1)[-1].lower() in ('ts', 'tsx', 'js', 'mjs', 'jsx')
        picked = None
        for joined in candidates:
            # 教材がimportを示すファイルでは import 行を含むもののみ完全リスティングと認める
            if any_import and 'import ' not in joined:
                continue
            # TS系でexportを持たない断片（import文のみ等）は部品断片なので完全リスティングと認めない
            if is_ts_family and 'export ' not in joined:
                continue
            if parses_as_file(path, joined):
                picked = joined
                break
        if picked is not None and not (chunks[0][0] and len(segs) == 1):
            dest.write_text(picked + ('' if picked.endswith('\n') else '\n'), encoding='utf-8')
            mode = 'full-listing'
        else:
            # oracle splice: place each fragment into current file at baseline anchor
            if not dest.exists():
                gaps.append({'day': tag, 'path': path,
                             'reason': 'diff-fragments-for-nonexistent-file; cannot create'})
                continue
            cur = norm(dest.read_text(encoding='utf-8').split('\n'))
            seeded = 'existing'
            ok = True
            for cont, body, _k in chunks:
                fl = norm(body.split('\n'))
                if find_in(cur, fl) >= 0:
                    continue  # idempotent: fragment already present in file
                # find fragment inside baseline
                bi = find_in(base_lines, fl)
                if bi < 0:
                    # try progressive trimming (drop trailing partial)
                    ok = False
                    gaps.append({'day': tag, 'path': path,
                                 'reason': 'fragment-not-in-baseline', 'head': fl[0][:80] if fl else ''})
                    break
                # anchor = line in baseline just before fragment
                if bi > 0:
                    anchor = base_lines[bi-1]
                    idxs = [i for i, l in enumerate(cur) if l == anchor]
                    if not idxs:
                        ok = False
                        gaps.append({'day': tag, 'path': path,
                                     'reason': 'anchor-not-found', 'anchor': anchor[:80]})
                        break
                    ai = idxs[-1]
                    cur[ai+1:ai+1] = fl
                else:
                    cur = fl + cur
            if not ok:
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text('\n'.join(cur) + '\n', encoding='utf-8')
            mode = f'oracle-splice({seeded})'
        applied.append({'path': path, 'n': len(chunks), 'mode': mode})
    rec = {'day': tag, 'md': md_path.name, 'applied': applied, 'gaps': gaps}
    with LEDGER.open('a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(json.dumps(rec, ensure_ascii=False)[:800])

if __name__ == '__main__':
    apply_day(Path(sys.argv[1]), sys.argv[2])
