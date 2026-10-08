"""filepath が .tsx の typescript / ts ブロックの読み替えを固定する（issue #474 直し3）。"""
import unittest

from build_pdf_book import relabel_tsx_fences


class RelabelTsxFencesTest(unittest.TestCase):
    def test_typescript_block_with_tsx_filepath_becomes_tsx(self):
        lines = [
            "```typescript",
            "// filepath: src/app/page.tsx",
            "export default function Page() {",
            "```",
        ]
        self.assertEqual(relabel_tsx_fences(lines)[0], "```tsx")

    def test_ts_block_with_tsx_filepath_becomes_tsx(self):
        lines = ["```ts", "// filepath: src/lib/router.tsx （同じファイルの続き）", "```"]
        self.assertEqual(relabel_tsx_fences(lines)[0], "```tsx")

    def test_block_without_tsx_filepath_stays(self):
        lines = ["```typescript", "const n: number = 1;", "```"]
        self.assertEqual(relabel_tsx_fences(lines), lines)

    def test_tsx_fence_is_untouched(self):
        lines = ["```tsx", "// filepath: src/app/page.tsx", "```"]
        self.assertEqual(relabel_tsx_fences(lines), lines)

    def test_filepath_in_later_block_does_not_leak_into_earlier_block(self):
        lines = [
            "```ts", "const a = 1;", "```",
            "```ts", "// filepath: b.tsx", "```",
        ]
        out = relabel_tsx_fences(lines)
        self.assertEqual(out[0], "```ts")
        self.assertEqual(out[3], "```tsx")

    def test_indented_fence_keeps_indent(self):
        lines = ["  ```ts", "  // filepath: a.tsx", "  ```"]
        self.assertEqual(relabel_tsx_fences(lines)[0], "  ```tsx")


if __name__ == "__main__":
    unittest.main()
