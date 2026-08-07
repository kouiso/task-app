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

from markdown_scan import fence_states, mask_inline_code

Finding = tuple[int, str, str, str]
PatternSpec = tuple[re.Pattern[str], str, str]


def strip_code_blocks(content: str) -> list[tuple[int, str]]:
    """コードブロックとインラインコードを除外して、(行番号, 行テキスト) のリストを返す

    ```text のブロックだけは中身も検査する。読者がそのまま貼る前提の文面
    （SNS への共有文など）をここへ置くことがあり、除外すると話し言葉が
    そのまま商品の外へ出る。実際に day04 の共有文へ方言が残っていた。

    言語名は情報文字列の最初の語で判定する。```text title="post" のように属性を
    足した書き方や ````text のような長いフェンスは、文字列そのものを 'text' と
    比べていた頃は素通りしていた。
    """
    result: list[tuple[int, str]] = []
    for lineno, line, state, fence in fence_states(content):
        if state in ('open', 'close'):
            continue
        if state == 'inside' and (fence is None or fence.lang != 'text'):
            continue
        cleaned = mask_inline_code(line)
        cleaned = re.sub(r'https?://\S+', ' ', cleaned)
        result.append((lineno, cleaned))
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
    # `\b` は日本語では一度も成立しない。カタカナも助詞も等しく単語構成文字なので、
    # 「ワイが」「ワイも」の境界がどこにも無く、このパターンは長らく素通りしていた。
    # 一人称の「ワイ」は前後にカタカナが続かない。前後をカタカナで塞ぐと
    # 「ハワイ」「ワイルドカード」「ホワイトボード」のような複合語をまとめて外せる。
    (r'(?<![ァ-ヶー])ワイ(?![ァ-ヶー])', '関西弁一人称「ワイ」', '「私」「筆者」または削除'),
    (r'やんか(?:[。！!？?\s]|$)', '関西弁「やんか」', '「じゃないですか」「ですよね」に変更'),
    (r'あかん(?:で)?(?:[。！!？?\s]|$)', '関西弁「あかん」', '「いけません」「避けましょう」に変更'),
    # 「だけど」を勧めない。あれも常体なので、そのまま直すと敬体の教材に常体が残る。
    (r'やけど(?:[、。！!？?\s]|$)', '関西弁「やけど」', '「ですが」「けれども」に変更'),
    # 「せやから」は下の [せそ]やから にも一致する。両方置くと1つの方言で2件報告される。
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
    # SKILL.md の文体表にある「だ / だぞ / だろ / しろ」と命令形単体は、上の動詞の並びに
    # 入っておらず素通りしていた。textlint の no-mix-dearu-desumasu も、実測では
    # 「である」しか捕まえず「だ。」「だった。」「使え。」はどれも通してしまう。
    (r'だ[。！!？?]', 'タメ口の常体語尾', '「です」に変更'),
    (r'(?:だった|だろう|だろ|だぞ)[。！!？?]', 'タメ口の常体語尾', '「でした」「でしょう」に変更'),
    (r'(?:しろ|せよ)[。！!？?]', '命令形単体', '「してください」「しましょう」に変更'),
    (r'(?:書け|使え|開け|押せ|直せ|消せ|見よ)(?:よ)?[。！!？?]', '命令形単体', '「書いてください」など依頼の形に変更'),
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
    # SKILL.md の直訳調の表にありながら、ここに無いせいで素通りしていた形。
    # 「を実施することができます」だけを見ていたので「を実施します」は捕まらなかった。
    (r'を実施し(?:ます|た|て)', '直訳調「を実施します」', '「します」「を行います」に変更'),
    (r'という点に注意', '直訳調「という点に注意」', '「に注意」に変更'),
    (r'行うことが必要です', '直訳調「行うことが必要です」', '「必要です」に変更'),
])

# SKILL.md 手順6「重言・翻訳調を消す」の表。同じ意味を2回言っている形を捕まえる。
REDUNDANCY_PATTERNS = compile_specs([
    (r'まず最初に', '重言「まず最初に」', '「まず」に変更'),
    (r'約[^。、]{1,8}程度', '重言「約〜程度」', '「約〜」に変更'),
    # 敬体の教材では「返り値を返します」と活用して現れるので、語幹で見る。
    (r'返り値を返[すし]', '重言「返り値を返す」', '「返す」に変更'),
])

# 理由を述べる文末。同じものが1行に何度も並ぶとリズムが単調になる。
# SKILL.md「5つの不在」4番（リズムの不在）に当たる症状で、textlint の
# sentence-length は1文ずつしか見ないため、この重なりは検出できない。
REASON_ENDINGS = ('ためです', 'からです')
MAX_SAME_REASON_PER_LINE = 2


def find_repeated_reason(line: str) -> list[tuple[str, str]]:
    """同じ理由の語尾が1行に許容回数を超えて並んでいたら (説明, 直し方) を返す。"""
    found: list[tuple[str, str]] = []
    for ending in REASON_ENDINGS:
        count = line.count(ending)
        if count > MAX_SAME_REASON_PER_LINE:
            found.append((
                f'同じ理由の語尾「{ending}」が1行に {count} 回',
                'ひとつを別の言い方へ変えるか、段落を分ける',
            ))
    return found


def collect_findings(content: str) -> list[Finding]:
    """本文から検出結果を集める。ファイル読み込みと分けてあるのはテストのため。"""
    findings: list[Finding] = []

    for lineno, line in strip_code_blocks(content):
        if line.strip().startswith('>'):
            continue
        stripped = line.strip()
        casual_exempt = stripped.startswith(
            ('|', '- ', '- [ ]', '#', '**ゴール**', '**学んだこと**'),
        ) or bool(re.match(r'^\d+\.\s', stripped))

        for pattern, description, fix in (
            KANSAI_PATTERNS + AI_PHRASE_PATTERNS + TRANSLATION_PATTERNS + REDUNDANCY_PATTERNS
        ):
            if pattern.search(line):
                findings.append((lineno, description, fix, stripped))

        for description, fix in find_repeated_reason(line):
            findings.append((lineno, description, fix, stripped))

        if not casual_exempt:
            for pattern, description, fix in CASUAL_PATTERNS:
                if pattern.search(line):
                    findings.append((lineno, description, fix, stripped))

    return findings


def check_tone(filepath: str) -> bool:
    findings = collect_findings(Path(filepath).read_text(encoding='utf-8'))

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
