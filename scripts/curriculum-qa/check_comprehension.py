#!/usr/bin/env python3
"""
理解度チェック: 初心者向け教材の機械的品質チェック
beginner-review/SKILL.md の数値基準をコード化

チェック項目:
1. 注釈なし専門用語の初出 (カリキュラム全体で未注釈なら1件でもFAIL。
   より前のdayで注釈済みの再出用語はグレー扱いでWARNINGに留める)
2. 「当然」「簡単」「ググってください」等の禁止表現
3. 各Stepに確認ポイント(✅)が存在するか
"""

import re
import sys
from pathlib import Path

# 機械チェック対象の専門用語 (初出時に注釈が期待されるもの)
TECH_TERMS = [
    # Framework / ツール
    "Next.js", "React", "TypeScript", "Prisma", "tRPC", "Tailwind",
    "shadcn", "Supabase", "PostgreSQL", "Docker", "Vercel",
    # 概念
    "SSR", "SSG", "ISR", "CSR", "API", "ORM", "CLI",
    "CRUD", "JWT", "OAuth", "CDN", "DNS",
    "コンポーネント", "ミドルウェア", "スキーマ", "マイグレーション",
    "デプロイ", "レンダリング", "ルーティング", "スキャフォールド",
    # React/TS 固有
    "useState", "useEffect", "useMemo", "useCallback",
    "Props", "型定義", "型推論", "ジェネリクス", "インターフェース",
    # DB
    "外部キー", "トランザクション", "インデックス", "リレーション",
]

# 注釈判定は「用語そのものを含むパターン」でのみ成立させる。
# 旧実装は用語の周辺ウィンドウに（...）や「...」があるだけで注釈扱いしており、
# 「Next.js React ... を使います。私は昼食を食べました。」のような説明ゼロの文が
# PASS していた（PR#285 レビュー指摘）。用語を正規表現に動的に埋め込むことで、
# 注釈が必ずその用語に結び付いていることを保証する。


def annotation_patterns_for(term: str) -> list[re.Pattern]:
    """用語に結び付いた注釈だけを検出するパターン群を動的に生成する"""
    t = re.escape(term)
    # 閉じ記号のほか、`shadcn/ui` や `Tailwind CSS` のような短いASCII接尾辞まで許容
    deco = r'[」』`＊*）)]{0,2}[A-Za-z0-9/._ -]{0,6}'
    return [
        # 用語（説明） / `用語`（説明） / shadcn/ui（説明）
        re.compile(rf'{t}{deco}\s*[（(][^（）()\n]{{3,}}[）)]'),
        # Markdownリンクの用語に注釈が続く形: [用語](URL)（説明）
        re.compile(rf'\[{t}[^\]\n]{{0,12}}\]\([^)\n]+\)\s*[（(][^（）()\n]{{3,}}[）)]'),
        # 用語集の形式: 見出しが用語で、直後の行に説明の地の文が続く
        re.compile(rf'^#{{2,4}}\s*[`*]*{t}[^\n]{{0,12}}\n+[^\n#|`]{{5,}}', re.MULTILINE),
        # 用語とは、説明
        re.compile(rf'{t}{deco}\s*とは、?[^\n。]{{5,}}'),
        # 「用語」は説明 / 「用語」とは説明
        re.compile(rf'「{t}」[^\n。]{{0,8}}(?:は|とは)、?[^\n。]{{5,}}'),
        # 行頭の 用語：説明
        re.compile(rf'^[`*]*{t}[`*]*\s*[：:]\s*[^\n]{{3,}}', re.MULTILINE),
        # 概念表の行（| 用語 | 読み方 | 役割 | 例え |）: 先頭セルが用語で始まり
        # （`Tailwind CSS` や `shadcn/ui` のような短い接尾辞は許容）、
        # 続きに中身のあるセルが2つ以上ある
        re.compile(
            rf'^\|\s*[`*]*{t}[^|\n]{{0,12}}\|(?:[^|\n]*\S[^|\n]*\|){{2,}}',
            re.MULTILINE,
        ),
    ]

FORBIDDEN_PHRASES = [
    "当然",
    "ご存知",
    "ご存じ",
    "ここでは省略",
    "詳細は割愛",
    "ググってください",
    "検索してください",
    "自明",
    "言うまでもなく",
    "もちろん",
    "簡単にわかります",
]

BEGINNER_NEGATIVE = [
    "簡単です",
    "簡単に",
    "一目でわかる",
    "誰でもわかる",
]


def is_in_code_block(lines: list[str], line_idx: int) -> bool:
    """コードブロック内かどうか判定"""
    in_code = False
    for i, line in enumerate(lines):
        if line.strip().startswith("```"):
            in_code = not in_code
        if i == line_idx:
            return in_code
    return False


def code_block_lines(lines: list[str]) -> set[int]:
    """コードブロックに含まれる行番号(0始まり)の集合を一度だけ計算する"""
    in_code = False
    result = set()
    for i, line in enumerate(lines):
        if line.strip().startswith("```"):
            in_code = not in_code
            result.add(i)
            continue
        if in_code:
            result.add(i)
    return result


def term_annotated(content: str, code_lines: set[int], term: str) -> bool:
    """地の文のどこかに、用語に結び付いた注釈があるか"""
    for pat in annotation_patterns_for(term):
        for m in pat.finditer(content):
            line_idx = content[:m.start()].count('\n')
            if line_idx not in code_lines:
                return True
    return False


def check_unannotated_terms(content: str, lines: list[str]) -> list[dict]:
    """初出の専門用語で注釈がないものを列挙"""
    issues = []
    code_lines = code_block_lines(lines)

    for term in TECH_TERMS:
        pattern = re.compile(re.escape(term))
        for m in pattern.finditer(content):
            line_idx = content[:m.start()].count('\n')
            if line_idx in code_lines:
                continue  # コードブロック内はスキップ

            if not term_annotated(content, code_lines, term):
                issues.append({
                    "term": term,
                    "line": line_idx + 1,
                })
            break  # 地の文の初出だけ見ればよい（注釈判定はファイル全体）

    return issues


def curriculum_order_key(path: Path) -> tuple[int, str]:
    """カリキュラム内の読む順序 (目次/roadmap → day01..day30 → appendix)"""
    name = path.name
    m = re.match(r'day(\d+)_', name)
    if m:
        return (1000 + int(m.group(1)), name)
    if name.startswith("appendix"):
        return (9000, name)
    return (0, name)


_FILE_CACHE: dict[Path, tuple[str, set[int]]] = {}


def _load_file(path: Path) -> tuple[str, set[int]] | None:
    """クロスファイル走査用にファイル内容とコード行集合をキャッシュする"""
    if path in _FILE_CACHE:
        return _FILE_CACHE[path]
    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return None
    entry = (content, code_block_lines(content.splitlines()))
    _FILE_CACHE[path] = entry
    return entry


def file_annotates_term(path: Path, term: str) -> bool:
    """そのファイルの地の文に、用語に結び付いた注釈があるか"""
    entry = _load_file(path)
    if entry is None:
        return False
    content, code_lines = entry
    return term_annotated(content, code_lines, term)


def is_teaching_file(path: Path) -> bool:
    """「先に教えた」とみなせる教材ファイルか (dayXX / appendix)。

    目次(00_)やロードマップ(00-1_)の箇条書きは教えたことにならないため除外。
    """
    return bool(re.match(r'day\d+_', path.name)) or path.name.startswith("appendix")


def find_prior_annotation(target: str, term: str) -> str | None:
    """カリキュラム上で target より前の教材ファイルに注釈済み初出があれば、そのファイル名を返す"""
    target_path = Path(target)
    target_key = curriculum_order_key(target_path)
    siblings = sorted(target_path.parent.glob("*.md"), key=curriculum_order_key)
    for sib in siblings:
        if curriculum_order_key(sib) >= target_key:
            break
        if not is_teaching_file(sib):
            continue
        if file_annotates_term(sib, term):
            return sib.name
    return None


def find_later_annotation(target: str, term: str) -> str | None:
    """カリキュラム上で target より後のファイルに注釈があれば、そのファイル名を返す"""
    target_path = Path(target)
    target_key = curriculum_order_key(target_path)
    siblings = sorted(target_path.parent.glob("*.md"), key=curriculum_order_key)
    for sib in siblings:
        if curriculum_order_key(sib) <= target_key:
            continue
        if file_annotates_term(sib, term):
            return sib.name
    return None


def check_forbidden_phrases(content: str, lines: list[str]) -> list[dict]:
    """禁止表現チェック"""
    issues = []
    for phrase in FORBIDDEN_PHRASES + BEGINNER_NEGATIVE:
        for m in re.finditer(re.escape(phrase), content):
            line_idx = content[:m.start()].count('\n')
            if not is_in_code_block(lines, line_idx):
                issues.append({"phrase": phrase, "line": line_idx + 1})
    return issues


def check_confirmation_points(content: str) -> dict:
    """Stepごとの確認ポイント(✅)存在チェック"""
    # ## Step X: ... 形式のステップを抽出
    step_pattern = re.compile(r'^#{1,3}\s+(?:Step\s+\d+|ステップ\s*\d+|手順\s*\d+)', re.MULTILINE | re.IGNORECASE)
    steps = list(step_pattern.finditer(content))

    if not steps:
        return {"steps": 0, "without_checkpoints": 0}

    without_checkpoints = 0
    for i, step_match in enumerate(steps):
        start = step_match.start()
        end = steps[i + 1].start() if i + 1 < len(steps) else len(content)
        section = content[start:end]

        # ✅ または [ ] チェックボックスがあるか
        has_checkpoint = bool(
            re.search(r'✅', section) or
            re.search(r'- \[[ x]\]', section) or
            re.search(r'確認[：:]', section) or
            re.search(r'\*\*確認ポイント\*\*', section)
        )
        if not has_checkpoint:
            without_checkpoints += 1

    return {
        "steps": len(steps),
        "without_checkpoints": without_checkpoints,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("使用法: python3 check_comprehension.py <file.md>")
        return 1

    target = sys.argv[1]
    try:
        with open(target, encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ ファイルが見つかりません: {target}")
        return 1

    lines = content.splitlines()
    failed = False

    # 1. 専門用語チェック
    # 閾値は0: カリキュラム全体で一度も注釈されていない用語は1件でもFAIL。
    # より前のday/appendixで注釈済みの「再出」はグレー扱いでWARNINGに留める。
    unannotated = check_unannotated_terms(content, lines)

    hard_issues = []
    gray_issues = []
    for issue in unannotated:
        prior = find_prior_annotation(target, issue["term"])
        if prior:
            gray_issues.append({**issue, "prior": prior})
        else:
            hard_issues.append(issue)

    if gray_issues:
        print(f"⚠️  既出用語の再出 (グレー): {len(gray_issues)} 件 → WARNING")
        for issue in gray_issues:
            print(f"   Line {issue['line']:4d}: 「{issue['term']}」 — このファイルに注釈はないが {issue['prior']} で注釈済み")
    if hard_issues:
        print(f"📚 注釈なし初出専門用語: {len(hard_issues)} 件")
        for issue in hard_issues:
            later = find_later_annotation(target, issue["term"])
            if later:
                print(f"   Line {issue['line']:4d}: 「{issue['term']}」 — {Path(target).name} より後の {later} にしか注釈がない（読者は先に出会う）")
            else:
                print(f"   Line {issue['line']:4d}: 「{issue['term']}」 — カリキュラム内のどのファイルにも注釈がない")
        print(f"❌ カリキュラム内未注釈の専門用語があります ({len(hard_issues)} 件) → FAIL")
        failed = True
    if not gray_issues and not hard_issues:
        print("✅ 専門用語: 全ての初出用語に注釈あり（またはリストにない用語のみ）")

    # 2. 禁止表現チェック
    forbidden = check_forbidden_phrases(content, lines)
    if forbidden:
        print(f"🚫 禁止表現: {len(forbidden)} 件")
        for issue in forbidden:
            print(f"   Line {issue['line']:4d}: 「{issue['phrase']}」")
        print("❌ 禁止表現が含まれています → FAIL")
        failed = True
    else:
        print("✅ 禁止表現: なし")

    # 3. 確認ポイントチェック (Stepありの場合のみ)
    cp = check_confirmation_points(content)
    if cp["steps"] > 0:
        if cp["without_checkpoints"] > 0:
            print(f"⚠️  確認ポイント未設定のStep: {cp['without_checkpoints']}/{cp['steps']} 件 → WARNING")
        else:
            print(f"✅ 確認ポイント: 全 {cp['steps']} Stepに設定あり")
    else:
        print("ℹ️  確認ポイント: Step形式のセクションなし（チェックスキップ）")

    if failed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
