# M09 curriculum evidence (PR #667)

- Evidence taken from PR head: `8eeac081190257e837f2279e065427040ef8284e` (branch m09/curriculum-20261015)
- Compared against main: `e69374e796664e308a3963cf0d2c0e3dba7556ac`
- PDF pages: built locally on the Mac mini with `scripts/pdf-book/build_pdf_book.py` (same builder and `PDF_BOOK_LINK_MAP` as the 教材PDF検査 workflow, which uploads no PDF artifact). Rendered with `pdftoppm -r 90`.
- Screenshots m09/day12/14/20_side.png were added earlier.

| Day | Page | Before (main e69374e7) | After (head 8eeac081) |
|---|---|---|---|
| day24 | Mermaid: 全体図 | [p3](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day24_before_p3.png) | [p3](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day24_after_p3.png) |
| day24 | ユーザー一覧 (createdAt guard) | [p46](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day24_before_p46.png) | [p46](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day24_after_p46.png) |
| day26 | Mermaid: デバッグの流れ | [p6](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day26_before_p6.png) | [p6](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day26_after_p6.png) |
| day26 | 完成版 dashboard/page.tsx | [p87](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day26_before_p87.png) | [p89](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day26_after_p89.png) |
| day28 | Mermaid: 一括操作の全体像 | [p6](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day28_before_p6.png) | [p6](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day28_after_p6.png) |
| day28 | 完成コード: handleBulkUpdateStatus | [p102](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day28_before_p102.png) | [p109](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day28_after_p109.png) |
| day29 | Mermaid: 認証・認可の流れ | [p6](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day29_before_p6.png) | [p6](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day29_after_p6.png) |
| day29 | user-detail-client (戻るボタン) | [p45](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day29_before_p45.png) | [p46](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day29_after_p46.png) |
| day28 | Step 8: handleBulkUpdateStatus (Step section) | [p59](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day28_before_p59.png) | [p64](https://github.com/kouiso/task-app/blob/evidence/m09-curriculum-20261015/m09/pdf/day28_after_p64.png) |

After pages for day24/28/29 were rebuilt from head 8eeac081; day26 pages are from 12a396cb (day26 is unchanged since then).
