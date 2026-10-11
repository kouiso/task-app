#!/usr/bin/env python3
"""check_fence_roles.py の退行テスト。

通さないもの（path 無し expect・部分ファイル expect・apply 不在・危険パス）と、
通さなければならないもの（正しい apply/expect 対・従来の filepath フェンス）の
両方を置く。片方だけでは全部を止める検査か全部を通す検査か分からない。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_fence_roles import check_text  # noqa: E402

APPLY = """```typescript apply path=src/app/page.tsx
export default function Page() {
  return <main />;
}
```
"""

EXPECT = """```typescript expect path=src/app/page.tsx
export default function Page() {
  return <main />;
}
```
"""

CASES: list[tuple[str, str, int]] = [
    (
        "apply + expect の正しい対は通す",
        APPLY + "\n" + EXPECT,
        0,
    ),
    (
        "従来の filepath フェンスだけは後方互換で通す",
        "```typescript\n// filepath: src/app/page.tsx\nexport default function Page() {}\n```",
        0,
    ),
    (
        "expect に path= が無ければ止める",
        "```typescript expect\nexport const a = 1;\n```",
        1,
    ),
    (
        "expect に対応する apply が無ければ止める",
        EXPECT,
        1,
    ),
    (
        "expect 本体に省略記号があれば止める",
        APPLY + "\n" + """```typescript expect path=src/app/page.tsx
export default function Page() {
  // ...
}
```""",
        1,
    ),
    (
        "expect に危険なパスは止める",
        APPLY + "\n" + """```typescript expect path=../secret.ts
export const a = 1;
```""",
        1,
    ),
    (
        "apply path= に危険なパスは止める",
        "```typescript apply path=../../etc/passwd\nbody\n```",
        1,
    ),
    (
        "apply path= の途中 .. セグメントも止める",
        "```typescript apply path=src/../../outside.ts\nbody\n```",
        1,
    ),
    (
        "expect は本文の // filepath: だけでは契約にならない",
        APPLY + "\n" + """```typescript expect
// filepath: src/app/page.tsx
export default function Page() {
  return <main />;
}
```""",
        1,
    ),
    (
        "expect が同じ対象に重複していれば止める",
        APPLY + "\n" + EXPECT + "\n" + EXPECT,
        1,
    ),
    (
        "実コード中の日本語（既存の〜）はプレースホルダーにしない",
        APPLY + "\n" + """```typescript expect path=src/app/page.tsx
export const message = "既存のタスクを表示";
export default function Page() {
  return <main />;
}
```""",
        0,
    ),
    (
        "従来の filepath フェンスが expect の apply 対象として数えられる",
        "```typescript\n// filepath: src/app/page.tsx\nexport const a = 1;\n```\n\n" + EXPECT,
        0,
    ),
    (
        "無タグの path= フェンスは対応 apply に数えない（実行時に止まるため）",
        "```typescript path=src/app/page.tsx\nexport const a = 1;\n```\n\n" + EXPECT,
        1,
    ),
]


def main() -> int:
    failed = 0
    for label, text, want_errors in CASES:
        got = check_text(text, "dayXX_test.md")
        ok = (len(got) > 0) == bool(want_errors)
        if not ok:
            failed += 1
            print(f"❌ {label}: findings={len(got)} (期待={want_errors})")
            for f in got:
                print(f"   {f.lineno}: {f.message}")
        else:
            print(f"✅ {label}")
    if failed:
        print(f"❌ {failed} 件の退行")
        return 1
    print("✅ check_fence_roles 退行テスト全パス")
    return 0


if __name__ == "__main__":
    sys.exit(main())
