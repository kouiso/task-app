#!/usr/bin/env python3
"""
文体チェックスクリプト
- 関西弁・タメ口語尾の混入検出
- AI典型構文（banned-phrases）検出
- 英語直訳調マーカー検出
"""

import re
import sys
from pathlib import Path

Finding = tuple[int, str, str, str]
PatternSpec = tuple[re.Pattern[str], str, str]


def strip_code_blocks(content: str) -> list[tuple[int, str]]:
    """コードブロックとインラインコードを除外して、(行番号, 行テキスト) のリストを返す"""
    lines = content.split('\n')
    result: list[tuple[int, str]] = []
    in_code_block = False
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        cleaned = re.sub(r'`[^`]+`', ' ', line)
        cleaned = re.sub(r'https?://\S+', ' ', cleaned)
        result.append((i, cleaned))
    return result


def compile_specs(items: list[tuple[str, str, str]]) -> list[PatternSpec]:
    return [(re.compile(pattern), description, fix) for pattern, description, fix in items]


KANSAI_PATTERNS = compile_specs([
    (r'やで(?:[。！!？?\s]|$)', '関西弁語尾「やで」', '「です」「ました」に変更'),
    (r'やな(?:[。！!？?\s]|$)', '関西弁語尾「やな」', '「ですね」「ましたね」に変更'),
    (r'やねん(?:[。！!？?\s]|$)', '関西弁語尾「やねん」', '「なんです」「だからです」に変更'),
    (r'からや(?:[。！!？?\s]|$)', '関西弁語尾「からや」', '「からです」「ためです」に変更'),
    (r'日や(?:[。！!？?\s]|$)', '関西弁語尾「日や」', '「日です」に変更'),
    (r'ちゃう(?:[。！!？?か\s]|$)', '関西弁「ちゃう」', '「ではありません」「違います」に変更'),
    (r'ええわけやない', '関西弁「ええわけやない」', '「ではありません」「よくありません」に変更'),
    (r'\bワイ\b', '関西弁一人称「ワイ」', '「私」「筆者」または削除'),
    (r'やんか(?:[。！!？?\s]|$)', '関西弁「やんか」', '「じゃないですか」「ですよね」に変更'),
    (r'あかん(?:で)?(?:[。！!？?\s]|$)', '関西弁「あかん」', '「いけません」「避けましょう」に変更'),
    (r'[せそ]やから', '関西弁「せやから/そやから」', '「だから」「なので」に変更'),
])

# 常体（タメ口）の「文末」を検出する。末尾は句読点（。！？）に限定する。
# 行末（$）や半角スペースを境界に含めると、次行へ続く連体修飾（「Step 9 で作った\nURL...」）や
# インラインコード除去後の空白を文末と誤認するため含めない。
# 「した」は敬体「〜ました。」「〜でした。」の末尾にも一致するので、否定後読み (?<![まで]) で除外する。
CASUAL_PATTERNS = compile_specs([
    (r'(?:する|作る|動く|なる|学ぶ|読む|つなぐ|開く)[。！!？?]', 'タメ口の常体語尾', '「します」「作ります」など敬体に変更'),
    (r'(?:(?<![まで])した|作った|起きない|できてる|合ってる|超える)[。！!？?]', 'タメ口の常体語尾', '「しました」「起きません」など敬体に変更'),
    (r'(?:である|ではない|じゃない|ない)[。！!？?]', 'タメ口の常体語尾', '「です」「ではありません」など敬体に変更'),
    (r'(?:必要はない|全部になる)[。！!？?]', 'タメ口の常体語尾', '「必要はありません」「全部になります」に変更'),
])

AI_PHRASE_PATTERNS = compile_specs([
    (r'することができます', 'AI構文「することができます」', '「できます」に変更'),
    (r'これにより', 'AI構文「これにより」', '「だから」「なので」「よって」に変更'),
    (r'と言えるでしょう', 'AI構文「と言えるでしょう」', '「です」「になります」に変更'),
    (r'ではないでしょうか[。、]', 'AI構文「ではないでしょうか」', '「ですよね」「だと思います」に変更'),
    (r'いかがでしたでしょうか', 'AI構文「いかがでしたでしょうか」', '削除する'),
    (r'ここでは.{0,20}について解説します', 'AI構文「ここでは〜について解説します」', '削除して本文から始める'),
    (r'さまざまな場面で', 'AI構文「さまざまな場面で」', '削除するか具体例を書く'),
    (r'言うまでもありません', 'AI構文「言うまでもありません」', '削除する'),
    (r'あらゆる観点から', 'AI構文「あらゆる観点から」', '削除するか具体項目を列挙'),
    (r'重要な示唆を与えて', 'AI構文「重要な示唆を与えて」', '「〜が分かります」に変更'),
    (r'浮き彫りにして', 'AI構文「浮き彫りにして」', '「〜が分かった」に変更'),
    (r'注目に値する', 'AI構文「注目に値する」', '削除する'),
])

TRANSLATION_PATTERNS = compile_specs([
    (r'することは可能です', '直訳調「することは可能です」', '「できます」に変更'),
    (r'について言及', '直訳調「について言及」', '「について」「を紹介」に変更'),
    (r'に関しても同様です', '直訳調「に関しても同様です」', '「も同じです」に変更'),
    (r'を実施することができます', '直訳調「を実施することができます」', '「できます」に変更'),
])

def check_tone(filepath: str) -> bool:
    content = Path(filepath).read_text(encoding='utf-8')
    findings: list[Finding] = []

    for lineno, line in strip_code_blocks(content):
        if line.strip().startswith('>'):
            continue
        stripped = line.strip()
        casual_exempt = stripped.startswith(
            ('|', '- ', '- [ ]', '#', '**ゴール**', '**学んだこと**'),
        ) or bool(re.match(r'^\d+\.\s', stripped))

        for pattern, description, fix in KANSAI_PATTERNS + AI_PHRASE_PATTERNS + TRANSLATION_PATTERNS:
            if pattern.search(line):
                findings.append((lineno, description, fix, stripped))

        if not casual_exempt:
            for pattern, description, fix in CASUAL_PATTERNS:
                if pattern.search(line):
                    findings.append((lineno, description, fix, stripped))

    if findings:
        print(f"❌ 文体チェックFAIL: {filepath}")
        print(f"  {len(findings)} 件の問題を検出")
        print()
        for lineno, description, fix, text in findings:
            preview = text[:60] + ('...' if len(text) > 60 else '')
            print(f"  行 {lineno}: [{description}]")
            print(f"    → 推奨: {fix}")
            print(f"    本文: {preview}")
            print()
        return False

    print(f"✅ 文体チェックPASS: {filepath}")
    return True


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('使用法: python3 scripts/curriculum-qa/check_tone.py <filepath>')
        sys.exit(1)

    sys.exit(0 if check_tone(sys.argv[1]) else 1)
