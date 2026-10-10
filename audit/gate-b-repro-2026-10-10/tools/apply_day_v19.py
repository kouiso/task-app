#!/usr/bin/env python3
"""Gate-B day applier v15 — faithful-reader assembly.

Evidence-driven changes vs v14 (audit/gate-b-repro-2026-10-10/tools/apply_day.py):

1. Unmarked-continuation join: the source40 pack splits long listings across
   PDF page boundaries; continuation fences often lose the filepath comment
   (day01 globals.css was truncated mid-@theme -> tool artifact, not a
   material defect). An unmarked code fence attaches to the currently-open
   real-path listing when its lang matches the file family and no new real
   path / non-path filepath context intervened.

2. Spread-safe ellipsis: `...IDENT` / `...(` are JS/TS spread syntax, not
   omission markers. Omission needs a comment-led `…`/`...`, JP omission
   words, or a dots-only line. Fixes false rejection of day29 user.ts
   (371-line complete listing containing `...USER_DETAIL_SELECT`).

3. Candidate ordering + coverage oracle:
   - Candidates: kansei-run (first 完成版-flagged part -> end), then suffix
     runs at each fresh marker (last -> first), then all-joined, then the
     largest singles. Each tried with and without unmarked parts.
   - New file (dest absent): first parse-valid candidate wins.
   - Existing file: a write is accepted only if it parses AND
       (a) r2 >= 0.30   (joined covers >=30% of baseline lines: a real
                          whole-file listing), or
       (b) joined is baseline-divergent (r1 < 0.30), >=25 lines, looks
           complete, and the prose before its first part is not fragment
           prose (追加/追記/末尾/一部/importに追加...) — this rescues
           day01 page.tsx-style full replacements whose final-day content
           diverged from baseline.
     Otherwise the parts are fragments and go to oracle-splice (v14
     semantics). This kills the v14 fragment-overwrite bug (e.g. day26
     dashboard/page.tsx （一時的に追加） debug snippet written as the
     whole file).

4. cont detection widened: any （…）parenthetical on the filepath line
   (同じファイルの続き / 続き / 同じ位置の続き / 一時的に追加) OR a
   `続き` marker in the fence's first 2 lines (// 続き N/7) marks a
   continuation.
"""
import os, re, sys, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(os.environ.get('GATEB_ROOT', '/Users/devin/gate-b-repro/repro'))
BASE = Path("/Users/devin/gate-b-repro/app")
RUN = os.environ.get('GATEB_RUN', 'v16')
LEDGER = Path(f'/Users/devin/gate-b-repro/logs/ledger-{RUN}.jsonl')
FP_RE = re.compile(r'filepath:\s*([^\s（)\u3000]+)')
PATH_OK = re.compile(r'^[A-Za-z0-9_./\-]+$')
KANSEI = re.compile(r'完成版')
ELLIP_C = re.compile(r'^\s*(?://|/\*|\{/\*|<!--)\s*(?:…|\.{3}(?![A-Za-z0-9_$([{\'"`]))')
ELLIP_W = re.compile(r'^\s*(?://|/\*|\{/\*|<!--)?\s*（?(?:変更|既存|省略|中略|前略|後略|以降は同じ|同様|以下略)')
ELLIP_B = re.compile(r'^\s*(?:…|\.{3,})\s*$')

SHELLISH = {'bash', 'sh', 'shell', 'zsh', 'console', 'terminal', 'output',
            'mermaid', 'diff', 'yaml', 'yml', 'json', 'jsonc', 'sql',
            'dockerfile', 'makefile', 'text'}
FAMILY = {
    'ts': {'ts', 'typescript'}, 'tsx': {'tsx', 'ts', 'typescript', 'jsx'},
    'js': {'js', 'javascript', 'mjs', 'jsx'}, 'mjs': {'mjs', 'js', 'javascript'},
    'jsx': {'jsx', 'tsx', 'ts', 'typescript'},
    'css': {'css'}, 'prisma': {'prisma'}, 'json': {'json'},
    'md': {'md', 'markdown'}, 'example': {'env', 'text', 'txt', ''},
    'env': {'env', 'text', 'txt', ''},
}
WRITE_PROSE = re.compile(r'全体|全て|すべて|全消|書き換え|完成形|完成版|最終形|新規作成|ファイルを作成')
FRAG_PROSE = re.compile(r'追加|追記|末尾に|先頭に|途中に|変更|修正|差し替え|差分|一部|該当箇所|import へ|importへ|を挿入')

def ext_of(path):
    return path.rsplit('.', 1)[-1].lower() if '.' in path else ''

def has_ellipsis(body):
    return any(ELLIP_C.match(l) or ELLIP_W.match(l) or ELLIP_B.match(l)
               for l in body.split('\n'))

ESB = str(ROOT / 'node_modules/.bin/esbuild')
def parses_as_file(path, body):
    if has_ellipsis(body) or not body.strip():
        return False
    ext = ext_of(path)
    if ext in ('ts', 'tsx', 'js', 'mjs', 'jsx'):
        with tempfile.NamedTemporaryFile('w', suffix='.' + ext, delete=False) as t:
            t.write(body)
            tmp = t.name
        r = subprocess.run([ESB, tmp, '--outfile=/dev/null'],
                           capture_output=True, text=True)
        return r.returncode == 0
    if ext == 'json':
        try:
            json.loads(body)
            return True
        except Exception:
            return False
    return True

def norm(lines):
    return [l.rstrip() for l in lines if l.strip()]

def find_in(hay, frag, start=0):
    fl = norm(frag)
    if not fl:
        return -1
    n, m = len(hay), len(fl)
    for i in range(start, n - m + 1):
        if hay[i:i+m] == fl:
            return i
    return -1

def strip_fp(code):
    return '\n'.join(l for l in code.split('\n') if 'filepath:' not in l)

def fp_cont(code):
    """True iff the marker/prose says this fence CONTINUES the previous one
    for the same file — `（…続き）` parenthetical or `// 続き N/M` in the
    first lines. Position hints like （X の直後に追加） or （一時的に追加）
    start a NEW unit, not a continuation."""
    lines = code.split('\n')
    fp_line = next((l for l in lines if 'filepath:' in l), '')
    m = re.search(r'（([^（）]*)）', fp_line.split('filepath:')[-1])
    if m:
        return '続き' in m.group(1)
    head = '\n'.join(l for l in lines[:3] if l.strip())[:200]
    return '続き' in head

ADD_POS = re.compile(r'（([^（）]{1,80}?)\s*の(直後|前|後|末尾|先頭)に(?:追加|挿入)')
IMPORT_ADD = re.compile(r'の\s*import\s*に\s*(.+?)\s*を足した')

def fp_directive(code):
    """Parse placement hint in the filepath parenthetical, e.g.
    （taskRouter の前に追加） -> ('taskRouter', '前')."""
    fp_line = next((l for l in code.split('\n') if 'filepath:' in l), '')
    m = ADD_POS.search(fp_line)
    return (m.group(1).strip(), m.group(2)) if m else None

def fp_import_add(code):
    fp_line = next((l for l in code.split('\n') if 'filepath:' in l), '')
    m = IMPORT_ADD.search(fp_line)
    return m.group(1).strip() if m else None

def find_named_block(cur, name, when):
    """Locate the boundary line index for a named construct.
    '前' -> index to insert before; '直後'/'後' -> index after which to insert."""
    pat = re.compile(r'\b' + re.escape(name) + r'\b\s*[:=(]')
    starts = [i for i, l in enumerate(cur) if pat.search(l)]
    if not starts:
        pat2 = re.compile(r'\b' + re.escape(name) + r'\b')
        starts = [i for i, l in enumerate(cur) if pat2.search(l)]
    if not starts:
        return None
    si = starts[0]
    if when == '前':
        j = si
        while j > 0 and cur[j - 1].strip().startswith(('//', '/*', '*')):
            j -= 1
        return j
    indent = len(cur[si]) - len(cur[si].lstrip())
    j = si + 1
    depth = 0
    while j < len(cur):
        l = cur[j]
        depth += l.count('{') + l.count('(') - l.count('}') - l.count(')')
        if depth <= 0 and re.match(r'^\s*\}\s*[),;]?', l):
            return j
        if depth <= 0 and re.match(r'^\s*\},?\s*$', l):
            return j
        j += 1
    return min(j, len(cur) - 1)

def classify_prose(before):
    w = bool(WRITE_PROSE.search(before))
    f = bool(FRAG_PROSE.search(before))
    if f and not w:
        return 'frag'
    return 'write' if w else 'neutral'

def collect_parts(text):
    """-> {path: [(cont, body, kansei, unmarked, prose, directive)]}
    directive = (name, when) parsed from the filepath parenthetical, e.g.
    （delete の直後に追加） -> ('delete', '直後'), or None."""
    parts = {}
    cur_fp = None
    prev_end = 0
    for m in re.finditer(r'```([a-zA-Z0-9]*)\n(.*?)```', text, re.S):
        lang, code = m.group(1).lower(), m.group(2)
        before = text[max(prev_end, m.start() - 400):m.start()]
        before = '\n'.join(before.split('\n')[-6:])
        prose = classify_prose(before)
        prev_end = m.end()
        fm = FP_RE.search(code)
        if fm:
            fp = fm.group(1)
            if PATH_OK.match(fp):
                cur_fp = fp
                body = strip_fp(code)
                if body.strip():
                    parts.setdefault(fp, []).append(
                        (fp_cont(code), body, bool(KANSEI.search(
                            '\n'.join(body.split('\n')[:2]))),
                         False, prose, fp_directive(code)))
            else:
                cur_fp = None  # 読み比べ用サンプル / ターミナル etc.
            continue
        if cur_fp is None or lang in SHELLISH:
            continue
        if lang in FAMILY.get(ext_of(cur_fp), set()):
            parts.setdefault(cur_fp, []).append(
                (True, code, bool(KANSEI.search(
                    '\n'.join(code.split('\n')[:2]))),
                 True, prose, None))
    return parts

def candidates(parts):
    """Yield (label, joined, first_prose) unique candidates in preference order."""
    seen = set()
    def emit(label, sub):
        body = '\n'.join(b for _c, b, _k, _u, _p, _d in sub)
        key = body[:4000]
        if body.strip() and key not in seen:
            seen.add(key)
            return (label, body, sub[0][4])
        return None
    n = len(parts)
    k0 = next((i for i, p in enumerate(parts) if p[2]), None)
    if k0 is not None:
        for label, sub in (('kansei-run', parts[k0:]),
                           ('kansei-run-marked', [p for p in parts[k0:] if not p[3]])):
            r = emit(label, sub)
            if r:
                yield r
    fresh = [i for i, p in enumerate(parts) if not p[0] and not p[3]]
    for i in reversed(fresh):
        for label, sub in (('listing-run', parts[i:]),
                           ('listing-run-marked', [p for p in parts[i:] if not p[3]])):
            r = emit(label, sub)
            if r:
                yield r
    for label, sub in (('all-joined', parts),
                       ('all-joined-marked', [p for p in parts if not p[3]])):
        r = emit(label, sub)
        if r:
            yield r
    for i in sorted(range(n), key=lambda i: -len(parts[i][1]))[:4]:
        r = emit('single', [parts[i]])
        if r:
            yield r

def looks_complete(joined):
    for l in joined.split('\n'):
        s = l.strip()
        if not s:
            continue
        return bool(re.match(
            r"^('use (client|server)'|\"use (client|server)\"|import |export |//|/\*|\{/\*|#|/\*)", s))
    return False

def coverage(joined, base_lines):
    jl = norm(joined.split('\n'))
    if not jl or not base_lines:
        return 0.0, 0.0
    js, bs = set(jl), set(base_lines)
    return (sum(1 for l in jl if l in bs) / len(jl),
            sum(1 for l in base_lines if l in js) / len(base_lines))

def apply_day(md_path, tag):
    parts_map = collect_parts(md_path.read_text(encoding='utf-8'))
    applied, gaps = [], []
    for path, parts in parts_map.items():
        dest = ROOT / path
        baseline = BASE / path
        base_lines = norm(baseline.read_text(encoding='utf-8').split('\n')) \
            if baseline.exists() else []
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest_exists = dest.exists()
        dest_text = dest.read_text(encoding='utf-8') if dest_exists else ''
        any_import = any('import ' in b for _c, b, _k, _u, _p, _d in parts) or \
            (dest_exists and 'import ' in dest_text)
        any_export = any('export ' in b for _c, b, _k, _u, _p, _d in parts)
        is_ts_family = ext_of(path) in ('ts', 'tsx', 'js', 'mjs', 'jsx')
        picked, mode = None, None
        for label, joined, prose in candidates(parts):
            if any_import and 'import ' not in joined:
                continue
            if is_ts_family and any_export and 'export ' not in joined:
                continue
            if not parses_as_file(path, joined):
                continue
            if dest_exists:
                r1, r2 = coverage(joined, base_lines)
                nlines = len([l for l in joined.split('\n') if l.strip()])
                if r2 >= 0.30:
                    picked, mode = joined, label
                elif (r1 < 0.30 and nlines >= 25 and looks_complete(joined)
                      and prose != 'frag'):
                    picked, mode = joined, label + '-divergent'
                else:
                    continue
            else:
                picked, mode = joined, label
            if picked is not None:
                break
        if picked is not None:
            dest.write_text(picked + ('' if picked.endswith('\n') else '\n'),
                            encoding='utf-8')
            applied.append({'path': path, 'n': len(parts), 'mode': mode,
                            'lines': len(picked.split('\n'))})
            continue
        if not dest_exists:
            gaps.append({'day': tag, 'path': path,
                         'reason': 'diff-fragments-for-nonexistent-file; cannot create'})
            continue
        cur = norm(dest.read_text(encoding='utf-8').split('\n'))
        ok = True
        for cont, body, _k, _u, _p, directive in parts:
            fl = norm(body.split('\n'))
            if not fl:
                continue
            head0 = fl[0]
            if re.search(r'抜粋|作成済み', head0):
                gaps.append({'day': tag, 'path': path,
                             'reason': 'excerpt-shown-for-reader-check; skipped',
                             'head': head0[:80]})
                continue
            if find_in(cur, fl) >= 0:
                continue
            # explicit placement hint in the filepath marker wins
            if directive:
                name, when = directive
                if when == '末尾':
                    cur = cur + fl
                    continue
                if when == '先頭':
                    cur = fl + cur
                    continue
                pos = find_named_block(cur, name, '前' if when == '前' else '直後')
                if pos is not None:
                    ins = pos if when == '前' else pos + 1
                    cur[ins:ins] = fl
                    gaps.append({'day': tag, 'path': path,
                                 'reason': 'directive-applied',
                                 'anchor': f'{name} の{when}に追加'})
                    continue
                gaps.append({'day': tag, 'path': path,
                             'reason': 'directive-anchor-not-found',
                             'anchor': f'{name} の{when}に追加'})
                ok = False
                break
            # instructional fragments often open with a teaching comment
            # that is not file content (e.g. `// （…完成形）`); retry the
            # match after dropping leading comment-only lines.
            variants = [fl]
            i = 0
            while i < len(fl) and fl[i].lstrip().startswith(('//', '/*', '{/*')):
                i += 1
            if i:
                variants.append(fl[i:])
            bi = -1
            use_fl = fl
            for v in variants:
                bi = find_in(base_lines, v)
                if bi >= 0:
                    use_fl = v
                    break
            if bi < 0:
                ok = False
                gaps.append({'day': tag, 'path': path,
                             'reason': 'fragment-not-in-baseline',
                             'head': fl[0][:80] if fl else ''})
                break
            if bi > 0:
                anchor = base_lines[bi - 1]
                idxs = [i for i, l in enumerate(cur) if l == anchor]
                if not idxs:
                    ok = False
                    gaps.append({'day': tag, 'path': path,
                                 'reason': 'anchor-not-found',
                                 'anchor': anchor[:80]})
                    break
                # context-scored anchor: among occurrences of the anchor
                # line in cur, prefer the one whose surrounding lines
                # match the baseline lines surrounding the fragment
                # (backward before the anchor, forward after it).
                bend = bi + len(use_fl)
                def ctx_score(ai):
                    s = 0
                    for k in range(1, 5):
                        if ai - k >= 0 and bi - 1 - k >= 0 and \
                                cur[ai - k] == base_lines[bi - 1 - k]:
                            s += 1
                        else:
                            break
                    for j in range(4):
                        if ai + 1 + j < len(cur) and bend + j < len(base_lines) \
                                and cur[ai + 1 + j] == base_lines[bend + j]:
                            s += 1
                        else:
                            break
                    return s
                best = max(idxs, key=ctx_score)
                if ctx_score(best) == 0 and len(idxs) > 1:
                    ok = False
                    gaps.append({'day': tag, 'path': path,
                                 'reason': 'anchor-ambiguous; no contextual match',
                                 'anchor': anchor[:80]})
                    break
                cur[best + 1:best + 1] = use_fl
            else:
                cur = use_fl + cur
        if not ok:
            continue
        dest.write_text('\n'.join(cur) + '\n', encoding='utf-8')
        applied.append({'path': path, 'n': len(parts),
                        'mode': 'oracle-splice'})
    rec = {'run': RUN, 'day': tag, 'md': md_path.name,
           'applied': applied, 'gaps': gaps}
    with LEDGER.open('a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(json.dumps(rec, ensure_ascii=False)[:1200])

if __name__ == '__main__':
    apply_day(Path(sys.argv[1]), sys.argv[2])
