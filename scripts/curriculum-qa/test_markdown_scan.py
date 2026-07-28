#!/usr/bin/env python3
"""markdown_scan.py そのものの退行テスト。

ここが壊れると、これを呼んでいる8本の検査が全部同じ向きに壊れる。
外部レビューで実際に指摘された4つの壊れ方を、そのままケースにしてある。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import markdown_scan as ms  # noqa: E402


def fail(name: str, expected, actual) -> None:
    print(f"❌ {name}")
    print(f"   期待: {expected!r}")
    print(f"   実際: {actual!r}")


def main() -> int:
    failures = 0

    def check(name, expected, actual):
        nonlocal failures
        if expected != actual:
            fail(name, expected, actual)
            failures += 1

    # 1. 4連で開いたブロックを3連では閉じない。
    text = "\n".join(
        [
            "前の地の文",
            "````md",
            "```",
            "中のサンプル",
            "```",
            "````",
            "後ろの地の文",
        ]
    )
    check(
        "4連開始・3連では閉じない",
        ["前の地の文", "後ろの地の文"],
        [line for _, line in ms.iter_prose(text)],
    )

    # 2. 入れ子のフェンス。内側の3連は開始でも終了でもなく中身として扱う。
    states = [state for _, _, state, _ in ms.fence_states(text)]
    check(
        "入れ子フェンスの状態遷移",
        ["outside", "open", "inside", "inside", "inside", "close", "outside"],
        states,
    )

    # 3. 同じ長さの閉じフェンスなら閉じる。
    check(
        "3連開始・3連終了",
        ["外"],
        [line for _, line in ms.iter_prose("```ts\nconst a = 1;\n```\n外")],
    )

    # 4. 開始より長い閉じフェンスも閉じる（CommonMark）。
    check(
        "3連開始・4連終了",
        ["外"],
        [line for _, line in ms.iter_prose("```\nx\n````\n外")],
    )

    # 5. 情報文字列を持つ行は閉じフェンスにならない。
    check(
        "情報文字列つきの行では閉じない",
        [],
        [line for _, line in ms.iter_prose("```\nx\n```js\ny\n```")],
    )

    # 6. 閉じ忘れの検出。
    try:
        ms.strip_fences("```\nx", require_closed=True)
        check("閉じ忘れで例外", "UnclosedFence", "例外なし")
    except ms.UnclosedFence:
        pass

    # 7. 行番号は保たれる。
    check(
        "行番号",
        [(1, "a"), (5, "b")],
        list(ms.iter_prose("a\n```\nx\n```\nb")),
    )

    # 8. 2連のインラインコードを消す。
    check(
        "2連インラインコード",
        "前 " + " " * len("``既に メンバーです``") + " 後",
        ms.mask_inline_code("前 ``既に メンバーです`` 後"),
    )

    # 9. 1連のインラインコードも消す。長さは変えない。
    masked = ms.mask_inline_code("a `code` b")
    check("1連インラインコード", "a        b", masked)
    check("インラインコードで長さが変わらない", len("a `code` b"), len(masked))

    # 10. 対になっていないバッククォートは残す。
    check("片側だけのバッククォート", "a ` b", ms.mask_inline_code("a ` b"))

    # 11. 2連の中の1連は区切りにならない。
    check(
        "2連の中の1連",
        " " * len("``a `b` c``"),
        ms.mask_inline_code("``a `b` c``"),
    )

    # 12. 情報文字列の最初の語だけを言語として読む。
    langs = [f.lang for _, _, state, f in ms.fence_states('```text title="post"\nx\n```') if state == "open"]
    check("属性つき info string の言語", ["text"], langs)
    langs = [f.lang for _, _, state, f in ms.fence_states("````text\nx\n````") if state == "open"]
    check("4連フェンスの言語", ["text"], langs)
    langs = [f.lang for _, _, state, f in ms.fence_states("```\nx\n```") if state == "open"]
    check("info string なし", [""], langs)

    # 13. フェンスの中の見出しは地の文に出てこない。
    check(
        "フェンス内の見出し",
        ["## 本物の見出し"],
        [line for _, line in ms.iter_prose("```md\n### Step 99: 例\n```\n## 本物の見出し")],
    )

    # 14. HTML コメントを消す。改行と文字数は保つ。
    src = "前\n<!-- これは\n読者に見えない -->\n後"
    masked = ms.mask_html_comments(src)
    check("HTML コメントの中身が消える", True, "見えない" not in masked)
    check("HTML コメントで行数が変わらない", src.count("\n"), masked.count("\n"))
    check("HTML コメントで文字数が変わらない", len(src), len(masked))
    check("HTML コメント外は残る", True, masked.startswith("前\n") and masked.endswith("\n後"))

    # 15. コードブロックは段落の切れ目になる。フェンスだけで隔てられた前後の地の文を
    #     繋ぐと、書いた人が別々に書いた2文が1つの段落として判定される。
    check(
        "フェンスで段落が切れる",
        [[(1, "前の文")], [(5, "後ろの文")]],
        ms.paragraphs("前の文\n```bash\nnpm run dev\n```\n後ろの文"),
    )

    # 16. blank_fences は行数を保ったままコードを消す。
    blanked = ms.blank_fences("a\n```\nx\n```\nb")
    check("blank_fences", ["a", "", "", "", "b"], blanked.split("\n"))

    if failures:
        print(f"\n❌ markdown_scan の退行テスト {failures} 件失敗")
        return 1
    print("✅ markdown_scan の退行テスト OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
