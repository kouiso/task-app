# レビュー指摘事項 優先度別一覧

**総指摘数**: 916件（重複除去済み、元データ: 916件）

## カテゴリ別サマリー

| カテゴリ | 件数 | 影響日数 | Critical | Major | Minor | 自動修正可能 |
|---------|------|---------|----------|-------|-------|------------|
| 機械的/自動修正可能 | 199 | 30/30 | 36 | 98 | 65 | 199 |
| コンテンツ正確性 | 408 | 30/30 | 124 | 186 | 98 | 2 |
| 教育/UX品質 | 308 | 30/30 | 60 | 136 | 112 | 0 |
| インフラ/APIエラー | 1 | 1/30 | 1 | 0 | 0 | 1 |

## 日別×カテゴリ 指摘数マトリクス

| Day | 機械的 | コンテンツ正確性 | 教育/UX | インフラ | 合計 | Critical | Major | Minor |
|-----|--------|----------------|---------|---------|------|----------|-------|-------|
| day01 | 2 | 13 | 4 | 1 | 20 | 4 | 7 | 9 |
| day02 | 7 | 12 | 9 | 0 | 28 | 8 | 12 | 8 |
| day03 | 8 | 5 | 16 | 0 | 29 | 7 | 15 | 7 |
| day04 | 2 | 14 | 13 | 0 | 29 | 7 | 12 | 10 |
| day05 | 4 | 14 | 12 | 0 | 30 | 5 | 14 | 11 |
| day06 | 7 | 15 | 5 | 0 | 27 | 3 | 13 | 11 |
| day07 | 7 | 9 | 10 | 0 | 26 | 3 | 9 | 14 |
| day08 | 7 | 14 | 11 | 0 | 32 | 9 | 13 | 10 |
| day09 | 8 | 15 | 14 | 0 | 37 | 15 | 16 | 6 |
| day10 | 7 | 9 | 15 | 0 | 31 | 6 | 14 | 11 |
| day11 | 8 | 15 | 9 | 0 | 32 | 10 | 14 | 8 |
| day12 | 8 | 17 | 9 | 0 | 34 | 12 | 18 | 4 |
| day13 | 7 | 16 | 13 | 0 | 36 | 9 | 18 | 9 |
| day14 | 5 | 12 | 15 | 0 | 32 | 6 | 16 | 10 |
| day15 | 3 | 14 | 11 | 0 | 28 | 4 | 14 | 10 |
| day16 | 9 | 17 | 7 | 0 | 33 | 4 | 17 | 12 |
| day17 | 8 | 20 | 7 | 0 | 35 | 10 | 16 | 9 |
| day18 | 10 | 13 | 11 | 0 | 34 | 13 | 13 | 8 |
| day19 | 5 | 15 | 16 | 0 | 36 | 6 | 20 | 10 |
| day20 | 3 | 11 | 9 | 0 | 23 | 7 | 9 | 7 |
| day21 | 6 | 15 | 8 | 0 | 29 | 6 | 14 | 9 |
| day22 | 6 | 13 | 13 | 0 | 32 | 8 | 15 | 9 |
| day23 | 9 | 17 | 10 | 0 | 36 | 12 | 16 | 8 |
| day24 | 3 | 19 | 8 | 0 | 30 | 11 | 15 | 4 |
| day25 | 7 | 23 | 5 | 0 | 35 | 10 | 18 | 7 |
| day26 | 6 | 13 | 6 | 0 | 25 | 3 | 10 | 12 |
| day27 | 9 | 7 | 13 | 0 | 29 | 5 | 12 | 12 |
| day28 | 7 | 9 | 7 | 0 | 23 | 0 | 8 | 15 |
| day29 | 5 | 10 | 10 | 0 | 25 | 7 | 12 | 6 |
| day30 | 16 | 12 | 12 | 0 | 40 | 11 | 20 | 9 |

## 機械的/自動修正可能（199件）

### Critical（36件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day03 | Step 3の「コード解説」テーブルが壊れている。`git add .`の行の後にblockquote（`> ⚠️`）が挿入されており、テーブルが途中で分断される。その結果、`git commit -m`の行がテーブルとしてレンダリングされず、パイプ記号付きのプレーンテキストとして表示される。 | ✅ | technical_review |
| 2 | day03 | Step 3の「コード解説」テーブルが途中に⚠️ブロック引用を挿入しているため、Markdownレンダリング時にテーブルが壊れる。`git add .`の行の後にブロック引用が入り、その後`git commit`の行が孤立したテーブル行になる。 | ✅ | ux_review |
| 3 | day03 | Step 3 の「コード解説」テーブルが blockquote の挿入で破壊され、後続行が表として表示されない。 | ✅ | po_decision |
| 4 | day05 | Step 2、Step 3、Step 7 で確認ポイントが重複掲載されている。 | ✅ | po_decision |
| 5 | day06 | Step 2で全く同じ確認ポイント（registerSchemaに.refine()が含まれている / RegisterFormData型が定義されている / npm run devでエラーが出ていない）が2回出現しています。最初はコードブロック直後、2回目はテーブル群の後。これは明らかなコピペミスで、学習者が「あれ、さっきも同じこと書いてあったけど…？」と混乱します。 | ✅ | ux_review |
| 6 | day06 | Step 2 に同一内容の確認ポイントが2回あり、明確な重複です。品質ルール上も学習体験上も不適切です。 | ✅ | po_decision |
| 7 | day07 | Step 7のMermaid図内に `# filepath: 図解（実行可能なコードではありません）` という行がある。Mermaidのコメント構文は `%%` であり、`#` はコメントとして認識されない。このままではMermaid図がパースエラーになり、学習者のブラウザやGitHubで正しくレンダリングされない。 | ✅ | technical_review |
| 8 | day07 | Step 7のMermaidブロック内に `# filepath: 図解（実行可能なコードではありません）` が含まれていますが、Mermaid構文では `#` はコメントではなく、レンダリングエラーを引き起こします。 | ✅ | ux_review |
| 9 | day07 | Step 7 の Mermaid ブロック内に `# filepath: 図解（実行可能なコードではありません）` があり、Mermaid としてパースエラーになる。 | ✅ | po_decision |
| 10 | day08 | Step 4は3つのコードブロック、Step 5は3つのコードブロックを含むが、確認ポイントは各Stepの最後に1つだけ。初心者は途中で間違えても気づけず、最後まで進んでからエラーに直面する。 | ✅ | ux_review |
| 11 | day08 | 1ステップ内に複数コードブロックがあるのに、確認ポイントが最後にしかない。初心者が途中のミスに気づけない。 | ✅ | po_decision |
| 12 | day09 | Step 5 で `{/* ...props省略（Step4参照） */}` を使用している。これは品質ルールで明確に禁止されている「省略」パターンに該当する。初心者はどのコードをコピペすべきか分からなくなる。 | ✅ | ux_review |
| 13 | day09 | Step 2、Step 4、Step 5 で確認ポイントが全く同じ内容で2回ずつ記載されている。コピペミスと思われ、学習者に「2回やるのか？」と混乱を与える。 | ✅ | ux_review |
| 14 | day09 | Step 5 と Step 6 に `...` や JSX コメントによる省略があり、品質ルール違反かつ学習者がコピペできない。 | ✅ | po_decision |
| 15 | day09 | Step 2、Step 4、Step 5 に確認ポイントの重複があり、教材の信頼性を下げている。 | ✅ | po_decision |
| 16 | day09 | 現行原稿は品質ルール上も不合格。全コードブロック直後に確認ポイントがない箇所があり、Step 9 の bash ブロックにも確認ポイントがない。 | ✅ | po_decision |
| 17 | day11 | Step 1、Step 3で複数のコードブロックがあるが、中間のコードブロック直後に確認ポイントがない。品質ルール『全コードブロック直後に確認ポイント』に違反。 | ✅ | ux_review |
| 18 | day11 | 複数のコードブロック直後に確認ポイントがなく、品質ルール違反になっている。 | ✅ | po_decision |
| 19 | day12 | Step 6 内で確認ポイントとスクリーンショットが全く同じ内容で2回繰り返されている。コピペミスと思われる。 | ✅ | ux_review |
| 20 | day12 | Step 6 のサーバー側コードブロックが `// ...` で終わっており、品質ルールの「// ... 禁止」に違反している。 | ✅ | ux_review |
| 21 | day12 | Step 6 の確認ポイントとスクリーンショットが重複している。 | ✅ | po_decision |
| 22 | day12 | Step 6 のコードブロックに `// ...` があり、品質ルールに違反している。 | ✅ | po_decision |
| 23 | day16 | TimeLogDialogがuseState個別管理でフォームを実装しています。品質ルールで「全てのフォームはreact-hook-form + zodで実装」が絶対ルールとして明記されており、useState個別管理は明示的に禁止パターンです。 | ✅ | ux_review |
| 24 | day16 | Step 8 の `// ...既存のprops` は省略記法であり、品質ルールの絶対禁止事項に該当する。 | ✅ | po_decision |
| 25 | day18 | Step 3のJSXが4つのコードブロックに断片化されており、開きタグと閉じタグが別ブロックに分かれている。初心者がどこにどのコードを配置すれば良いか判断できない。各ブロックが単独でコピペ可能という品質ルールに違反している。 | ✅ | ux_review |
| 26 | day18 | コメント投稿フォームが `useState` による個別管理で書かれており、必須ルールの `react-hook-form + zod` に違反している。 | ✅ | po_decision |
| 27 | day20 | 全コードブロック直後に確認ポイントが必須だが、大半のコードブロックの直後に確認ポイントがない。各ステップの末尾にまとめて1つあるだけ。 | ✅ | ux_review |
| 28 | day23 | Step 3で「確認ポイント」「Tableコンポーネントの構造」表、「💡」ヒント、スクリーンショットがすべて2回繰り返されている。Step 6でも同様に「確認ポイント」とスクリーンショットが重複している。初心者は『同じ内容が2回あるけど、2回やるの？』と混乱する。 | ✅ | ux_review |
| 29 | day23 | 品質ルール「全コードブロック直後に確認ポイント」に違反。Step 2の3つのコードブロック、Step 3の4つのコードブロック、Step 5の3つのコードブロック、Step 6の3つのコードブロックのうち、ほとんどがステップ末尾にまとめて1つだけ。中間のコードブロックには確認ポイントがない。 | ✅ | ux_review |
| 30 | day23 | 品質ルール『全コードブロック直後に確認ポイント』に違反している。多くのコードブロックで確認ポイントが末尾にまとめられている。 | ✅ | po_decision |
| 31 | day23 | Step 3とStep 6で確認ポイントやスクリーンショットが重複している。Step 1でも確認ポイントが重複している。 | ✅ | po_decision |
| 32 | day24 | Step 1, 3, 5, 6, 7で確認ポイントが同一内容で2回ずつ記載されています。これは明らかなコピー&ペーストミスで、初心者は「2回やるの？」と混乱します。 | ✅ | ux_review |
| 33 | day25 | change-password と edit の両フォームが useState ベースで、品質ルールの必須要件である react-hook-form + zod に違反している。 | ✅ | po_decision |
| 34 | day27 | 品質ルール『全コードブロックに日本語コメント必須』に対し、大半のコードブロックに日本語コメントがありません。17個中約14個のコードブロックでコード内の日本語コメントが欠落しています。説明文はコードブロックの外にありますが、ルール上はコード内に日本語コメントが必要です。初心者がコードだけコピペしたとき、何をしているか分からなくなります。 | ✅ | ux_review |
| 35 | day29 | プロジェクトの品質ルールで「【絶対ルール】全てのフォームは react-hook-form + zod で実装」と明記されているが、編集ページのフォームは useState + handleChange パターンで実装されている。Day 25（プロフィール編集）等で既にreact-hook-formを学んでいるはずのDay 29でuseStateに退行するのは一貫性がない。 | ✅ | ux_review |
| 36 | day30 | Step 2 の docker-compose.yml コードブロックが25行を超えている。現在のコードブロックは約20行だが、改行の入れ方によっては超過する可能性がある。また、YAML の改行が不自然（ports や volumes の値が途中で改行されており、実際にはそのまま貼り付けると YAML パースエラーになる）。 | ✅ | technical_review |

### Major（98件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 1のPowerShellコード内で `# filepath: PowerShell（Windows）` のようにbashスタイルのコメント記号 `#` を使っているが、PowerShellのコメント記号も `#` なのでたまたま動くものの、`Add-Content` コマンドが93文字あり65文字のPDF互換性ルールに違反している。 | ✅ | ux_review |
| 2 | day02 | Step 8のコード例でstatus.tsの内容を「読むのみ」として表示しているが、コードブロックにfilepathコメントはあるものの日本語コメントが1つもない。品質ルールの「日本語コメント必須」に違反している。同様にStep 9のpriority.tsのコードブロックも日本語コメントがない。 | ✅ | technical_review |
| 3 | day02 | Step 3のCardコードは25行上限ルールに抵触する可能性が高く、現状のままでは品質チェックスクリプトで失敗するリスクがある。 | ✅ | po_decision |
| 4 | day02 | Step 8-9の読むだけコードに日本語コメントがなく、品質ルールの『日本語コメント必須』に反している。 | ✅ | po_decision |
| 5 | day03 | Step 7の見出しが`### Step 7 🧭: .gitignore を理解しよう（5分）`で🧭絵文字があるが、他の全ステップ（Step 1〜6）には絵文字がない。見出しフォーマットが不統一。 | ✅ | technical_review |
| 6 | day03 | Step 6の各サブステップ(6-1, 6-2, 6-3)にそれぞれコードブロックがあるが、個別の確認ポイントがない。品質ルール「全コードブロック直後に確認ポイント」に違反している。Step末尾にまとめて記載されているが、各コードブロック直後にあるべき。 | ✅ | ux_review |
| 7 | day03 | Step 6 の各コードブロック直後に個別の確認ポイントがなく、品質ルールと初心者の確認導線の両方に反する。 | ✅ | po_decision |
| 8 | day04 | Step 2, 4, 6のコードブロックは実際にはブラウザ操作の説明をbashコメントで記述しているだけで、ターミナルで実行するものではない。filepath が「ブラウザ（Vercelで操作）」となっており、初心者がターミナルにコピペして混乱する恐れがある。 | ✅ | ux_review |
| 9 | day05 | Step 6の3番目のコードブロックで `{/* ここにStep4-5のformが入る */}` というプレースホルダーコメントが使われている。品質ルールでは「// ...残りは同じ」「// 省略」等のプレースホルダーは禁止されている。初心者は具体的にどのコードをどこに移動すべきか分からない可能性がある。 | ✅ | technical_review |
| 10 | day05 | Step 2とStep 3で確認ポイントが2回ずつ記載されている（コードブロック直後と解説テーブルの後）。同じ内容の繰り返しは初心者を混乱させ、『どちらが正しいチェックリスト？』と不安にさせる。 | ✅ | ux_review |
| 11 | day06 | Step 2 の末尾に確認ポイントが2回重複して記載されています。「✅ 確認ポイント」ブロックが2つあり、内容も全く同じです。 | ✅ | technical_review |
| 12 | day06 | 品質ルール「全コードブロック直後に確認ポイント」に対して、1ステップ内に複数コードブロックがある場合、最初のブロックの直後に確認ポイントがありません。該当箇所: Step 1（ブロック1の後）、Step 2（ブロック1の後）、Step 4（ブロック1の後）、Step 7（ブロック1・2の後）、Step 8（ブロック1・2・3の後）。check_no_skip.pyで検出される可能性があります。 | ✅ | ux_review |
| 13 | day06 | Step 3のタイトル「Day 05 と同じパターンで useForm を設定します」と本文「Day 05 で学んだ...パターンと全く同じ構造です」は、品質ルールで禁止されている「同じように」「同じ方法で」に極めて近い表現です。初心者が「Day 05と同じなら、もう一度Day 05を見直さないと…」と不安になる原因にもなります。 | ✅ | ux_review |
| 14 | day06 | 複数コードブロックがあるステップで、各ブロック直後に確認ポイントが置かれていません。品質ルール違反であり、自動チェック失敗の可能性があります。 | ✅ | po_decision |
| 15 | day07 | Step 1のbashコードブロックは実際にはコマンドではなく、DevToolsで確認する内容のコメントです。初心者がターミナルで実行しようとして混乱する可能性があります。 | ✅ | ux_review |
| 16 | day07 | Step 1 の bash コードブロックはコマンドではなく観察メモであり、初心者が実行対象と誤解しやすい。 | ✅ | po_decision |
| 17 | day07 | Step 2 で連続するコードブロックのうち、最初のブロック直後に確認ポイントがなく、『全コードブロック直後に確認ポイント』ルールに抵触している。 | ✅ | po_decision |
| 18 | day08 | Step 2のMermaid図の冒頭に`# filepath: 図解（実行可能なコードではありません）`というコメント行がありますが、これはMermaid構文として無効です。`flowchart LR`の前に不正な行があるとMermaidレンダラはパースエラーを起こし、図が表示されません。 | ✅ | technical_review |
| 19 | day08 | Step 1とStep 6のコードブロックに日本語コメントが一切ない。品質ルールでは「全コードブロックに日本語コメント必須」と定められている。読み取り専用コードであっても、初心者が各行の意味を理解するために日本語コメントは必須。 | ✅ | ux_review |
| 20 | day08 | Mermaid図のブロック内に `# filepath: 図解（実行可能なコードではありません）` というコメントがある。Mermaid構文では `#` はヘッダーとして解釈される可能性があり、レンダリングが崩れる。また品質チェックスクリプトが誤検出する可能性もある。 | ✅ | ux_review |
| 21 | day08 | Mermaidブロック内に `# filepath:` 行があり、レンダリング失敗の原因になる。 | ✅ | po_decision |
| 22 | day08 | Step 1 と Step 6 のコードブロックに日本語コメントがなく、品質ルール違反でもある。 | ✅ | po_decision |
| 23 | day09 | Step 5のコードブロック内に `{/* ...props省略（Step4参照） */}` というJSXコメントがあるが、品質ルールで省略コメントは禁止されている。また、学習者がこのコードをそのままコピペするとpropsが渡されず実行時にエラーとなる。 | ✅ | technical_review |
| 24 | day09 | Step 2、Step 4、Step 5のそれぞれに「確認ポイント」が重複して2回ずつ記載されている。特にStep 4は確認ポイント・スクリーンショット・propsテーブルが全て2回出現している。コピペミスと思われる。 | ✅ | technical_review |
| 25 | day09 | 品質ルールで推奨されているtreeコマンド風のディレクトリ構造表示が一切ない。初心者は `src/app/project/page.tsx` がどこに位置するか、既存ファイルとの関係が分からない。 | ✅ | ux_review |
| 26 | day10 | Step 5のカラーピッカー・日付欄のコードブロック3つ、Step 6の送信ボタンのコードブロック、Step 7の一部コードブロックに日本語コメントがない。品質ルール「【絶対ルール】日本語コメント必須（コード内に日本語説明）」に違反。 | ✅ | technical_review |
| 27 | day10 | Step 2に確認ポイントが2回重複しています。最初の確認ポイントの後にテーブルと説明が続き、再度確認ポイントが登場します。初心者は「どこまでやればこのステップは完了？」が分かりにくくなります。 | ✅ | ux_review |
| 28 | day10 | Step 5、Step 6、Step 7 の複数コードブロックで日本語コメントが不足しており、絶対ルールに違反している。 | ✅ | po_decision |
| 29 | day10 | 『全コードブロック直後に確認ポイント』のルールを満たしていない。特に Step 7 の複数ブロックと Step 8 のターミナルコードブロック直後に確認ポイントがない。 | ✅ | po_decision |
| 30 | day10 | Step 2 に確認ポイントが重複しており、ステップの完了条件が分かりにくい。 | ✅ | po_decision |
| 31 | day11 | Step 2とStep 6で全く同じ確認ポイントが2回ずつ記載されている。コピペミスに見え、教材の信頼性を損なう。 | ✅ | ux_review |
| 32 | day11 | Step 6は『コードを読む』だけで、学習者が手を動かすアクションがない。確認ポイントも『理解した』という主観的な確認のみで、客観的に検証できない。 | ✅ | ux_review |
| 33 | day11 | 最終のターミナルコードブロック直後に確認ポイントがなく、全コードブロック直後に確認ポイント必須のルールを満たしていない。 | ✅ | po_decision |
| 34 | day12 | Step 3 でメンバー追加フォームを useState（newMemberUserId, newMemberRole）で個別管理しているが、品質ルールで全フォームは react-hook-form + zod 必須と定められている。 | ✅ | ux_review |
| 35 | day12 | Step 7（動作確認）は4行の箇条書きだけで、確認手順が具体的でない。確認ポイントも2行のみ。3分のStepとしても内容不足。 | ✅ | ux_review |
| 36 | day13 | Step 6のコード内に `<TaskCard key={task.id} ... />` という `...` プレースホルダーがある。品質ルールで「// ...」（JSXスプレッド以外）は禁止されており、初心者もこの `...` に何を書けばよいかわからない。 | ✅ | ux_review |
| 37 | day13 | Step 8の bash コードブロック直後に確認ポイントがなく、品質ルールの『全コードブロック直後に確認ポイント』を満たしていない。 | ✅ | po_decision |
| 38 | day14 | Step 5に「優先度Selectも同じパターンで作ります。」という表現がある。品質ルールの禁止ワード「同じように」「同じ方法で」に近い表現であり、かつ初心者にとって「同じパターン」と言われても、どこが同じでどこが違うか判断できない。 | ✅ | ux_review |
| 39 | day14 | コードブロックが『続きです』前提で分割されており、『各コードブロックは単独でコピペ実行可能』という品質ルールに反している。 | ✅ | po_decision |
| 40 | day15 | Step 4のelse分岐が「// 作成処理（Day 14で実装済み）」というコメントのみ。初心者はDay 14の実装を正確に覚えていないため、実際にどのコードが入るのか分からない。品質ルールの「省略禁止」に抵触する可能性もある。 | ✅ | ux_review |
| 41 | day15 | Step 2の1つ目のコードブロック（handleEditの前半）の直後に確認ポイントがない。品質ルール「全コードブロック直後に確認ポイント」に違反している。 | ✅ | ux_review |
| 42 | day15 | 全コードブロック直後に確認ポイントを置くルールが守られていない箇所がある。 | ✅ | po_decision |
| 43 | day16 | 品質ルールでは「全コードブロック直後に確認ポイント」が必須ですが、複数箇所でコードブロック直後に確認ポイントがありません。例: Step 2の1つ目のインポートブロック直後、Step 3の1つ目のコードブロック直後、Step 5のformatTime直後、Step 6の複数ブロック。 | ✅ | ux_review |
| 44 | day16 | 品質ルールで「全コードブロックに日本語コメント必須」ですが、Step 2のインポートブロック、Step 5のformatTime/formatMinutesブロック、Step 8の一部ブロックでコード内に日本語コメントがありません。 | ✅ | ux_review |
| 45 | day16 | Step 1, 2, 4, 5, 7で全く同じ確認ポイントが2回ずつ記載されています。これは初心者を混乱させます（「さっきも同じこと書いてあったけど、何か違うのかな？」）。 | ✅ | ux_review |
| 46 | day16 | 教材内で `src/component/...` と `@/component/ui/...` が使われているが、品質ルールと一般的な shadcn/ui 構成は `components` 複数形であり、ここが誤っていると学習者が即エラーになる。 | ✅ | po_decision |
| 47 | day16 | 複数のコードブロック直後に確認ポイントがなく、別箇所では重複している。品質ルールの『全コードブロック直後に確認ポイント』を満たしていない。 | ✅ | po_decision |
| 48 | day16 | 複数のコードブロックで日本語コメントが不足しており、品質ルール未達。 | ✅ | po_decision |
| 49 | day17 | Step 2、Step 3、Step 6で全く同じ確認ポイントが2回ずつ記載されている。コピペミスと思われるが、初心者は「2回確認するの？」と混乱する。 | ✅ | ux_review |
| 50 | day17 | 一部コードブロック直後に確認ポイントがなく、最後の `npm run dev` ブロックにも確認ポイントがない。 | ✅ | po_decision |
| 51 | day17 | 説明文に禁止ワードの『同じ』が含まれており、自動チェックで失敗する可能性がある。 | ✅ | po_decision |
| 52 | day18 | Mermaid図で「api.task.getById で取得」と「api.comment.create」が別経路で描かれているが、コメント一覧はtask.getByIdのincludeで一緒に取得される（comment.getByTaskIdは使われていない）。図が実装と乖離している。 | ✅ | technical_review |
| 53 | day18 | Step 1 に「確認ポイント: 4つのメソッドを把握した」が2回記載されている。 | ✅ | technical_review |
| 54 | day18 | 現稿は tree 表示がなく、スクリーンショット位置指定も不足し、品質ルールの必須要件を満たしていない可能性が高い。 | ✅ | po_decision |
| 55 | day18 | 図ではコメント取得が `comment.getByTaskId` 前提に見えるが、実装では `task.getById` の include で取得している。 | ✅ | po_decision |
| 56 | day19 | Step 1の確認ポイント「update と delete のパラメータを把握した」が2回、Step 2の確認ポイント「2つの state が追加された」が2回、同じ内容で繰り返されている。コピペミスと思われる。 | ✅ | ux_review |
| 57 | day19 | 一部コードブロック直後に確認ポイントがなく、品質ルール違反になっている。 | ✅ | po_decision |
| 58 | day19 | 現行ドラフトは『1ファイル=1ステップ』『全コードブロック直後に確認ポイント』『日本語コメント必須』を安定して満たしていない。さらにフォーム実装ルールとの整合説明もない。 | ✅ | po_decision |
| 59 | day21 | Step 1「ローカル集計の考え方」で `npm run dev` コマンドを実行させているが、このステップは概念理解が目的であり、サーバー起動は不要。Step 2以降で開発サーバーが必要になるため、ここでの起動は意味がない。また、コードブロックの filepath が「ターミナル」で、確認ポイントが「ローカル集計の仕組みを理解した」だけで具体性がない。 | ✅ | technical_review |
| 60 | day21 | 複数のコードブロックで確認ポイントが欠落しており、品質ルール『全コードブロック直後に確認ポイント』を満たしていない。 | ✅ | po_decision |
| 61 | day21 | 複数のコードブロックで日本語コメントが不足している。 | ✅ | po_decision |
| 62 | day22 | Step 2とStep 5の確認ポイントが重複している（同じ文言が2回出現）。Step 3とStep 6も同様。コピペミスと思われる。 | ✅ | ux_review |
| 63 | day22 | 禁止ワードの使用、分割コード、確認ポイント重複、コードブロック単独実行不能など、自動品質チェックで落ちる可能性が高い。 | ✅ | po_decision |
| 64 | day23 | 品質ルールでは「スクリーンショット位置指定3箇所以上」だが、実質的に2種類の画像（report.pngとreport-weekly.png）しかなく、report.pngは4回重複使用されている。Step 2完了後のテーブル表示や、Step 5のローディングスピナーなど、初心者が「正しく動いている」と確認したい場面でスクリーンショットが不足。 | ✅ | ux_review |
| 65 | day24 | 確認ポイントが複数のステップで重複している。Step 1（2回同じ確認ポイント）、Step 3（2回）、Step 5（2回）、Step 6（2回）、Step 7（2回）。これは教材の推敲不足を示す。 | ✅ | technical_review |
| 66 | day24 | 複数ステップで確認ポイントが重複しており、教材の推敲不足が見えます。 | ✅ | po_decision |
| 67 | day25 | Step 1、Step 4、Step 5、Step 7 にそれぞれ確認ポイントが2回ずつ記載されている。同一内容の確認ポイントが重複しており、学習者に混乱を与える。 | ✅ | technical_review |
| 68 | day25 | Step 1、Step 4、Step 5、Step 7で同じ確認ポイントが2回ずつ重複している。例：Step 1は『表示する項目とボタンを理解した』が2回、Step 4は『3つのボタンが縦に並ぶ / 管理者にだけユーザー管理ボタンが出る』が2回出現する。初心者は同じことを2回確認すべきか混乱する。 | ✅ | ux_review |
| 69 | day25 | 複数ステップで確認ポイントが重複しており、推敲不足が見える。 | ✅ | po_decision |
| 70 | day25 | Step 10 のインポートなどに65文字超の行があり、PDF互換ルールに違反している。 | ✅ | po_decision |
| 71 | day25 | Step 10 などで、断片は多いのに各ブロックが単独でコピペ実行可能とは言いにくい。品質ルールの『各コードブロックは単独でコピペ実行可能』に実質未達。 | ✅ | po_decision |
| 72 | day26 | Step 1の確認ポイント2で「エラーを仕込むと『エラーが発生しました』画面が表示される」とあるが、Next.js開発モード（npm run dev）ではエラーオーバーレイが先に表示され、error.tsxのフォールバックUIは表示されない。つまずきポイント表には「開発モードではエラーオーバーレイが優先」と書いてあるが、Step 1の確認ポイントと矛盾している。 | ✅ | technical_review |
| 73 | day26 | Step 6の確認ポイントと📸テキストの後に、所属不明のbashコードブロック（F12キーの説明）が浮いている。このブロックはStep 6の本文とStep 7の間に孤立しており、どのステップに属するか不明確。初心者はこのコードブロックを実行すべきなのか、参考情報なのか判断できない。 | ✅ | ux_review |
| 74 | day26 | デバッグ教材なのに視覚的な確認材料が少なく、品質ルールの推奨水準も満たせていない。 | ✅ | po_decision |
| 75 | day26 | 合計37分はDay教材として短く、7〜12ステップ・60〜90分目安に対して学習密度が不足している。 | ✅ | po_decision |
| 76 | day27 | 品質ルール『全コードブロック直後に確認ポイント』に対し、各Step内の途中のコードブロックには確認ポイントがありません。特にStep 1（3ブロック中1つだけ）、Step 3（3ブロック中1つだけ）、Step 4（5ブロック中1つだけ）、Step 7（4ブロック中1つだけ）で欠落が顕著です。 | ✅ | ux_review |
| 77 | day27 | Step 1 で prisma/schema.prisma と src/server/api/routers/project.ts の2ファイルを扱っています。品質ルール『1ファイル = 1ステップまで』に違反しています。 | ✅ | ux_review |
| 78 | day27 | 新しく学ぶ概念が5個（inferRouterOutputs, ダイアログ, アーカイブ, &&演算子レンダリング, コールバック関数）リストされていますが、品質ルールの上限は3個です。また、&&演算子レンダリングとコールバック関数はDay 27までに既に学習済みの可能性が高く、'新しく学ぶ概念'として列挙するのは不適切です。 | ✅ | ux_review |
| 79 | day27 | 大半のコードブロックに日本語コメントがなく、品質ルールに違反している。 | ✅ | po_decision |
| 80 | day27 | 各コードブロック直後の確認ポイントが不足しており、Step単位の末尾にしかない箇所が多い。 | ✅ | po_decision |
| 81 | day27 | 新概念が5個あり、品質ルールの上限3個を超えている。 | ✅ | po_decision |
| 82 | day28 | Step 6・7・8 の mutation 定義・handler 定義・DropdownMenu JSX など複数のコードブロックに日本語インラインコメントがない。品質ルール「全コードブロックに日本語コメント必須」の違反。特に bulkCompleteMutation、bulkDeleteMutation、bulkUpdateStatusMutation、handleBulkComplete、ha | ✅ | ux_review |
| 83 | day28 | Step 6・7・8 の複数コードブロックに日本語コメントがなく、絶対ルール「全コードブロックに日本語コメント必須」に抵触している。 | ✅ | po_decision |
| 84 | day29 | Step 3〜5、Step 7〜10で、1ステップ内に5〜6個のコードブロックがあるが、確認ポイントはステップ末尾にしかない。初心者は中間の各コードブロックを正しく配置できたか不安になり、エラーが出ても原因箇所が特定できない。 | ✅ | ux_review |
| 85 | day29 | 品質ルールで「全コードブロックに日本語コメント必須」だが、Step 4〜5のJSXブロックの多くでコメントが不足している。例：Avatar、Separator、Badge等のコンポーネントの役割が日本語で説明されていないブロックがある。 | ✅ | ux_review |
| 86 | day29 | 複数コードブロックが続くのに、確認ポイントがステップ末尾にしかなく、初心者がどこで壊れたか切り分けにくい。 | ✅ | po_decision |
| 87 | day29 | 現行ドラフトは『全コードブロック直後に確認ポイント』の絶対ルールを満たしていない。さらに一部コードブロックは日本語コメントが不足している。 | ✅ | po_decision |
| 88 | day30 | 複数のコードブロックに filepath コメントがない。Step 1 の .env.example コードブロックは bash 言語指定なのに filepath が .env.example と記載されており不整合。Step 3 の package.json コードブロックは「// filepath: package.json（該当部分）」と書かれているが JSON にコメントは書けない（JSO | ✅ | technical_review |
| 89 | day30 | Step 2 で確認ポイントとスクリーンショット指示が完全に重複している。「✅ 確認ポイント: docker compose ps で db が Running」が2回、「📸 ここでターミナルに docker compose ps を実行し...」が2回出現する。 | ✅ | technical_review |
| 90 | day30 | Step 5, Step 7 のコードブロックが形式的すぎる。echo コマンドだけのコードブロックは技術的に無意味で、品質ルールの「全コードブロック直後に確認ポイント」を形式的に満たすためだけに存在している。Step 6 の cat package.json \| grep も学習価値が低い。 | ✅ | technical_review |
| 91 | day30 | Step 3 で package.json の scripts を JSON コードブロックで表示しているが、JSON にはコメント（// filepath:）を書けない。実行時にパースエラーになる。 | ✅ | technical_review |
| 92 | day30 | Step 2 で確認ポイント『docker compose ps で db が Running』と 📸 スクリーンショット指示がそれぞれ2回ずつ重複している。校正漏れ。 | ✅ | ux_review |
| 93 | day30 | Step 4 で確認ポイント『全機能が本番環境で正常動作する』と dashboard.png のスクリーンショットがそれぞれ2回ずつ重複している。 | ✅ | ux_review |
| 94 | day30 | Step 7 で確認ポイント『次の学習目標を決められた』と dashboard.png のスクリーンショットが2回ずつ重複している。 | ✅ | ux_review |
| 95 | day30 | Steps 5・6・7 のコードブロックが echo コマンドだけで、実質的な学びや操作がない。品質ルールの『全コードブロックに filepath コメント』は満たしているが、学習体験として空虚。 | ✅ | ux_review |
| 96 | day30 | Step 2 の確認ポイントとスクリーンショット指示が重複している。 | ✅ | po_decision |
| 97 | day30 | JSON コードブロックに filepath コメントを入れており、JSON として不正確。 | ✅ | po_decision |
| 98 | day30 | Steps 5-7 の echo 中心のコードブロックは学習価値が低く、最終日の達成感を損ねている。 | ✅ | po_decision |

### Minor（65件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 12のログインアカウント説明で、テーブル直後に引用ブロック（> 💡）内の段落が4行にまたがっている。品質ルールの「段落上限3文」に抵触する可能性がある。 | ✅ | technical_review |
| 2 | day02 | Step 2の最初のコードブロックのfilepathコメントが「（先頭部分・読むのみ）」ではなく「（return内を変更）」となっているが、const宣言はreturn内には書けない。正確には「return文の前に追加」であるべき。 | ✅ | technical_review |
| 3 | day02 | Step 2の2つ目のコードブロック後の確認ポイントで「ブラウザでhttp://localhost:3000/dashboardを確認」とあるが、この画面はログイン済みでないと表示されない（AppLayoutの認証チェック）。未ログイン時の挙動への言及がない。 | ✅ | technical_review |
| 4 | day02 | Step 7の2番目のコードブロック（CardContent内のJSX変更）に日本語コメントがありません。品質ルールの「日本語コメント必須」に抵触します。 | ✅ | ux_review |
| 5 | day02 | dashboardページは認証前提だが、未ログイン時のリダイレクトについて補足がない。 | ✅ | po_decision |
| 6 | day03 | Step 2に`bash`言語タグ付きのコードブロックがあるが、中身はブラウザ操作のコメントのみで実行可能なコマンドがない。コードブロックとしての意味が薄く、学習者が「これをターミナルで実行するの？」と混乱する可能性がある。 | ✅ | technical_review |
| 7 | day03 | Step 6が6-1〜6-4の4つのサブセクションに分かれており、合計で4つのコードブロックと複数のファイル操作（README.md変更、git add、git commit、git push）を含む。1ステップとしては分量が多く、10分では足りない可能性がある。 | ✅ | technical_review |
| 8 | day04 | デプロイメントフロー図で「環境変数適用」がビルド開始の後に来ているが、実際には環境変数はビルド時に使用される（prisma generateがDATABASE_URLを参照）。順序が誤解を招く。 | ✅ | technical_review |
| 9 | day05 | 品質ルールで推奨されているtree形式のディレクトリ構造表示がない。初心者は `src/app/login/page.tsx` がプロジェクト内のどこに位置するか視覚的に把握しにくい。 | ✅ | ux_review |
| 10 | day06 | Step 3 の確認ポイントに『Day 05 のログインフォームと構造が同じことを確認』とあり、学習者に過去教材参照を暗に要求しています。単独で完結する確認になっていません。 | ✅ | po_decision |
| 11 | day07 | Step 2では2つの連続するコードブロックがあり、1つ目のコードブロック直後に確認ポイントがありません。品質ルールでは「全コードブロック直後」に確認ポイントが必要です。 | ✅ | ux_review |
| 12 | day10 | 「今日のゴール」セクションと Step 5 の確認ポイントで同じスクリーンショット `project-create-dialog.png` を2回使用している。Step 5 時点ではフォーム入力中の画面が期待されるが、完成形と同じ画像を参照している。 | ✅ | technical_review |
| 13 | day10 | Step 2 の zodスキーマの各フィールド表で `startDate` のみ記載されており `endDate` が省略されている。品質ルール上「残りも」的な省略は禁止。 | ✅ | technical_review |
| 14 | day11 | Step 2で確認ポイントが2回記載されている（同じ内容: 「編集ボタンでダイアログを開くと既存の名前が入っている」「タイトルが「プロジェクト編集」になっている」）。コピペミスと思われる。 | ✅ | technical_review |
| 15 | day11 | Step 6でも確認ポイントが2回記載されている（同じ内容: 「アーカイブは `isArchived` フラグで管理されていることを理解した」「削除とアーカイブの違いを理解した」）。 | ✅ | technical_review |
| 16 | day11 | Step 2 と Step 6 に重複した確認ポイントがある。 | ✅ | po_decision |
| 17 | day12 | Step 6の確認ポイントとスクリーンショットが重複している。同じ確認ポイント2つ（サーバー側権限チェックの理解）と同じスクリーンショット（project-add-member.png）が2回記載されている。 | ✅ | technical_review |
| 18 | day12 | 最後の `npm run dev` のbashブロックがStep 7の外（まとめセクションの前）に浮いており、構造的に所属が不明確。確認ポイントもない。 | ✅ | ux_review |
| 19 | day13 | Step 2とStep 5でそれぞれ確認ポイントが2回ずつ重複して記載されている。Step 2は「✅ 確認ポイント」が2箇所、Step 5も「✅ 確認ポイント」が2箇所ある。 | ✅ | technical_review |
| 20 | day13 | Step 3の3つ目のコードブロックが `</Select>\n  </div>\n</div>` のみで、閉じタグだけの断片。初心者にとって非常にわかりにくい。品質ルールの「各コードブロックは単独でコピペ実行可能であること」に違反。 | ✅ | technical_review |
| 21 | day13 | Mermaid図で `graph TD` を使用しているが、全体の流れを表す場合は `flowchart TD` の方が標準的。動作上は問題ないが、他のDayとの一貫性を確認すべき。 | ✅ | technical_review |
| 22 | day13 | Step 2とStep 5で確認ポイントが重複して2回記載されている。同じ内容が繰り返されるため、初心者が「何か違うことを確認するのか？」と混乱する。 | ✅ | ux_review |
| 23 | day13 | Step 2とStep 5で確認ポイントが重複している。 | ✅ | po_decision |
| 24 | day14 | Step 1の確認ポイントが2回表示されている。1回目はzodスキーマ直後に「taskFormSchemaを定義した / titleとprojectIdに必須バリデーションが設定されている」、2回目はフィールド表の後に「taskFormSchemaを定義した / TaskFormValuesが自動生成されている」。内容が微妙に異なるが、「taskFormSchemaを定義した」が重複。 | ✅ | technical_review |
| 25 | day14 | 一部のコードブロック（特にインポート文のブロック）に日本語コメントがない。品質ルールでは全コードブロックに日本語コメント必須。 | ✅ | ux_review |
| 26 | day14 | Step 1 の確認ポイントが重複している。 | ✅ | po_decision |
| 27 | day16 | 複数のステップ（Step 1, 2, 4, 5, 7）で確認ポイントが2回ずつ記述されている。例えばStep 1は「ステータスを変更するとBadgeが変わる / 一覧が自動で更新される」が2箇所に書かれている。 | ✅ | technical_review |
| 28 | day17 | Step 2 と Step 3 の確認ポイントに `console.log(currentUser)` が含まれているが、プロジェクトルール（ecc-ts-coding-style.md）で `No console.log statements in production code` と定められている。教材で console.log の使用を教えるのは適切だが、その後の削除を明示すべき。 | ✅ | technical_review |
| 29 | day17 | Step 2 と Step 3 それぞれに全く同じ確認ポイントが重複している（`console.log(currentUser)` と `npm run dev でエラーなし`）。また Step 3 と Step 6 にもそれぞれ同じ確認ポイントが重複。 | ✅ | technical_review |
| 30 | day17 | 確認ポイントに `console.log(currentUser)` が記載されている。本番コードに console.log を残すのはプロジェクト規約違反であり、教材で教えるべきではない。 | ✅ | ux_review |
| 31 | day17 | `console.log` を確認ポイントに使っており、規約との整合が弱い。 | ✅ | po_decision |
| 32 | day17 | UI文言が日本語と英語で混在している。 | ✅ | po_decision |
| 33 | day18 | Step 3 には4つのコードブロックがあり、「1ステップ = 1ファイル」ルールは守られているが、ブロック間の分割が細かすぎて学習者がファイル内のどこにどの順序で配置するか混乱する可能性がある。 | ✅ | technical_review |
| 34 | day18 | Step 1の確認ポイント「4つのメソッドを把握した」が2回繰り返されている。 | ✅ | ux_review |
| 35 | day18 | ディレクトリ構造（tree表示）がない。品質ルールで推奨されているファイル構成の視覚化が欠けている。 | ✅ | ux_review |
| 36 | day18 | Step 1 の確認ポイントが重複している。 | ✅ | po_decision |
| 37 | day19 | Step 1 と Step 2 で確認ポイントが2回ずつ記載されている（同一内容が重複）。 | ✅ | technical_review |
| 38 | day19 | 確認ポイントが重複しており、読み味が悪い。 | ✅ | po_decision |
| 39 | day20 | Step 3 に6個のコードブロックがあるが、確認ポイントは末尾に1つだけ。品質ルールでは「全コードブロック直後に確認ポイント」が必須。 | ✅ | technical_review |
| 40 | day20 | Step 3 は7分で設定されているが、6個のコードブロック＋Select 3種類の実装を含み、初心者が7分で完了するのは困難。品質ルールの「1ステップ = 3〜7分」上限を実質的に超えている可能性がある。 | ✅ | technical_review |
| 41 | day21 | Step 1とStep 4で確認ポイントが2回ずつ記載されている。Step 1は冒頭と末尾の両方に「ローカル集計の仕組みを理解した」があり、Step 4も冒頭と末尾に「4つの統計値が計算される」がある。 | ✅ | technical_review |
| 42 | day21 | 品質ルール「全コードブロックに日本語コメント必須」に対し、Step 3のローディングUI部分のJSXや、Step 5のCard JSX内に日本語コメントがないコードブロックがいくつか存在する。 | ✅ | technical_review |
| 43 | day21 | Mermaid図で `graph TD` を使用しているが、新しいMermaid記法では `flowchart TD` が推奨されている。他のDayとの一貫性も確認が必要。 | ✅ | technical_review |
| 44 | day22 | Step 1 で `npm list recharts` を実行して確認とあるが、確認ポイントが「recharts がpackage.jsonにある」のみ。バージョン番号（3.x.x）との整合性確認や、実際にインポートできることの確認が欠けている。 | ✅ | technical_review |
| 45 | day22 | Step 2 に「確認ポイント: statusData にデータが入る」が2回記載されている。 | ✅ | technical_review |
| 46 | day22 | Step 1（npm list recharts）が2分の見積もりだが、実質コマンド1つ実行するだけで内容が薄い。確認ポイントも1行のみ。 | ✅ | ux_review |
| 47 | day22 | Step 5の説明文『ステータスと同じ構造です』は品質ルールの禁止ワード『同じ』に近い表現。具体的に何が同じで何が違うかを明示すべき。 | ✅ | ux_review |
| 48 | day23 | Step 1の確認ポイントが2回重複している（「4つの統計値の計算方法を理解した」が2箇所）。 | ✅ | technical_review |
| 49 | day23 | Step 3の確認ポイントとスクリーンショットが2回重複している。同一内容のブロックが2つ連続。 | ✅ | technical_review |
| 50 | day23 | Step 6の確認ポイントとスクリーンショットも2回重複している。 | ✅ | technical_review |
| 51 | day23 | Step 5のスクリーンショット位置指定で「📸 ここでデータ読み込み中のスピナー...」とあるが、教材の他のスクリーンショット指定は `![alt](./screenshots/...)` 形式を使用。フォーマットが不統一。 | ✅ | technical_review |
| 52 | day25 | Step 10の一部コードブロック（閉じタグのブロック、ローディング表示のブロック等）に日本語コメントがない。品質ルールでは全コードブロックに日本語コメント必須。 | ✅ | ux_review |
| 53 | day26 | Step 6の末尾に独立した`bash`コードブロック（DevToolsを開くコメント）がStep 6とStep 7の間に宙に浮いている。このコードブロックはどのStepにも属しておらず、構造的に不自然。 | ✅ | technical_review |
| 54 | day26 | 合計37分はDay目安の60〜90分に対して大幅に短い。品質ルールの「1日 = 60〜90分」の目安を下回っている。 | ✅ | ux_review |
| 55 | day27 | 全17個のコードブロックのうち16個に日本語コメントが含まれていない。品質ルールでは「【絶対ルール】日本語コメント必須（コード内に日本語説明）」と規定されている。例えば `setArchiveStatus` のコードブロックには `// メンバーの権限を確認` や `// アーカイブ状態を更新` といったコメントが必要。 | ✅ | technical_review |
| 56 | day27 | 品質ルールでは「全コードブロック直後に確認ポイント」が必須だが、Step 1 は3つのコードブロック（Prismaスキーマ、setArchiveStatus、archive/unarchive）に対して確認ポイントが末尾に1つだけ。Step 3 も3つのコードブロックに対して末尾に1つだけ。Step 4 は4つのコードブロックに対して末尾に1つだけ。 | ✅ | technical_review |
| 57 | day28 | Step 1 の最初のコードブロック（bulkComplete の読むだけコード）にコード内の日本語コメントがない。品質ルールでは「全コードブロックに日本語コメント必須」とされている。「読むだけ」のブロックでも日本語コメントは必要。 | ✅ | technical_review |
| 58 | day28 | Step 4.5 の2つ目のコードブロック（JSX側の差し替え）に「確認ポイント」がない。品質ルールでは「全コードブロック直後に確認ポイント」が必須。Step 4.5 末尾にまとめて確認ポイントがあるが、2つ目のコードブロック直後にも必要。 | ✅ | technical_review |
| 59 | day28 | Step 5 のコードブロックの filepath は `src/app/task/page.tsx` だが、実質的に Step 2〜8 がすべて同一ファイル（page.tsx）への変更なので「1ファイル = 1ステップ」ルールには違反しない。ただし品質チェックスクリプトの観点では問題ない。 | ✅ | technical_review |
| 60 | day28 | Step 3（チェックボックス付きタスクカード）の所要時間が8分で、品質ルールの「1ステップ = 3〜7分」を1分超過している。 | ✅ | ux_review |
| 61 | day28 | Step 4.5 の JSX 差し替えコード直後に個別の確認ポイントがなく、ルール上は不足している。 | ✅ | po_decision |
| 62 | day30 | Step 1 の .env.example コードブロックに日本語コメントがない。Step 2 の docker-compose.yml コードブロックにも日本語コメントがない。 | ✅ | technical_review |
| 63 | day30 | 冒頭の「🤔 なぜこれをやるのか？」セクションの例え話が4文以上の段落になっている（blockquote 内だが、品質ルール的には段落上限3文）。 | ✅ | technical_review |
| 64 | day30 | 卒業チェックリストの表で Day の対応が一部不正確。例えば「Day 4-5: Prisma でテーブルを定義・操作できる」「Day 5-6: shadcn/ui コンポーネントを使える」と重複する Day がある。カリキュラム全体の Day 割り当てとの整合性を確認すべき。 | ✅ | technical_review |
| 65 | day30 | 30日間ジャーニーの Mermaid 図で subgraph のラベルが英語（Week 1, Week 2...）混在。初心者向けなら日本語統一が望ましい。 | ✅ | ux_review |


## コンテンツ正確性（408件）

### Critical（124件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 8の.envファイル内容が実際の.env.exampleと一致しない。教材ではDATABASE_URLを `postgresql://user:password@localhost:5432/taskapp?schema=public` とハードコードで示しているが、実際の.env.exampleは `postgresql://user:password@localhost:${_DOC | ❌ | technical_review |
| 2 | day01 | Step 10で `npm run db:seed` 実行後に「Seed completed」のようなメッセージが表示されると記述しているが、実際のseedスクリプト（src/command/seed.ts）は成功時にメッセージを一切出力せず、無言で終了する。失敗時のみ `❌ シードデータの投入に失敗しました:` と表示される。初心者はメッセージが出ないことに不安を感じ、「失敗したのか？」と混乱す | ❌ | technical_review |
| 3 | day02 | Step 2の最初のコードブロックで「returnの<div>の先頭に追加」と指示しているが、const宣言はJSXの中（return文の中）に書けない。JavaScriptの構文エラーになる。さらに、最初のコードブロックで作成した変数greeting/userName/messageは、2つ目のコードブロックで一切使われておらず、テキストが直接ハードコードされている。変数宣言の意味がなくなってい | ❌ | technical_review |
| 4 | day02 | Step 4でwelcomeTextとdynamicTextを宣言するが、Step 3で作ったCardのJSXはハードコードされたテキストのまま。宣言した変数がUIに接続される手順がない。Step 5-6でも taskCount, projectName, isCompleted を宣言するがUIで使われない。結果として5個以上の未使用変数が残り、BiomeやTypeScriptの警告が大量発生す | ❌ | technical_review |
| 5 | day02 | Step 2の最初のコードブロックで`greeting`・`userName`・`message`の3変数を定義していますが、2番目のコードブロック（実際のJSX）では`{`こんにちは！開発者さん`}`とハードコードしており、変数を一切使っていません。初心者は「変数を作ったのに使わないの？」と混乱します。 | ❌ | ux_review |
| 6 | day02 | Step 2の最初のコードブロックのコメントが「この3行をreturnの<div>の先頭に追加」となっていますが、`const`宣言はJSXの`<div>`内には書けません（構文エラーになります）。初心者がそのまま書くとエラーになり、何が間違っているかわからず詰まります。 | ❌ | ux_review |
| 7 | day02 | Step 2でconst宣言をreturn内の<div>先頭に追加する指示になっており、JSX内にconstを書いてしまう構文エラーを誘発している。 | ❌ | po_decision |
| 8 | day02 | Step 4〜6で宣言したwelcomeText、dynamicText、taskCount、projectName、isCompletedがUIにも確認手順にも接続されず、未使用変数として残る。 | ❌ | po_decision |
| 9 | day03 | git initコマンドがチュートリアル内に存在しない。Day 01でcreate-next-appがgit initを自動実行する事実に依存しているが、その説明が一切ない。学習者がDay 01の手順を完了していない場合や、別の方法でプロジェクトを作成した場合、Step 3の`git add .`で`fatal: not a git repository`エラーが発生する。 | ❌ | technical_review |
| 10 | day04 | Neon DB作成後、Prismaスキーマのデプロイ手順が完全に欠落している。package.jsonのbuildスクリプトは`prisma generate && next build`であり、prisma generateはクライアント生成のみ。DBテーブル作成（migrate deployまたはdb push）はビルド時に自動実行されない。Neonに空のDBがある状態でデプロイすると、アプリ | ❌ | technical_review |
| 11 | day04 | 初期データ（シードデータ）の投入手順が欠落している。Step 7で「ユーザー登録」「ダッシュボード表示」を確認項目にしているが、registerページの存在は確認できるものの、seed.tsによる初期データ投入が必要かどうかの説明がない。学習者がログインしようとしてもユーザーが存在せず混乱する可能性がある。 | ❌ | technical_review |
| 12 | day04 | NeonにクラウドDBを作成した後、Prismaスキーマを反映するステップ（npx prisma db push や npx prisma migrate deploy）が存在しない。DBにテーブルが無い状態でデプロイされるため、アプリは確実にDBエラーで動作しない。 | ❌ | ux_review |
| 13 | day04 | Neon作成後にPrismaスキーマを本番DBへ反映する手順がなく、`prisma generate` だけではテーブルは作成されない。教材どおりに進めるとデプロイ後にDB操作で失敗する。 | ❌ | po_decision |
| 14 | day05 | Step 2, Step 3, Step 7 で確認ポイントが全く同じ内容で2回ずつ掲載されている。例: Step 2の末尾に「✅ 確認ポイント: import文を3行追加した / loginSchemaとLoginFormDataを定義した / npm run devでエラーが出ていない」が2回出現。Step 3も「useFormの設定をLoginForm内に追加した / npm run dev | ❌ | technical_review |
| 15 | day05 | Step 6のCardContent内が `{/* ここにStep4-5のformが入る */}` というプレースホルダーコメントのみで、実際のコードが示されていない。初心者はJSXの構造を自力で組み替えることができず、この時点で完全に手が止まる。品質ルールの『コード完全性ルール』にも違反している。 | ❌ | ux_review |
| 16 | day05 | Step 1 と Step 6 の import が `@/component/ui/*` になっており、必須ルールの `@/components/ui/*` と不一致。実行不能の可能性が高い。 | ❌ | po_decision |
| 17 | day06 | Step 1 の import パスが `@/component/ui/button`、`@/component/ui/card` などになっており、技術スタック規約および一般的な shadcn/ui 構成の `@/components/ui/*` と不一致です。このままでは教材を写経した学習者が即座に import error に遭遇します。 | ❌ | po_decision |
| 18 | day08 | Step 4でBadgeコンポーネントを直接使い、`session.user.role === 'ADMIN' ? 'default' : 'secondary'`でインライン分岐していますが、実際のコードベース（app-layout.tsx:133）では`<UserRoleBadge role={session.user.role} />`を使用しています。UserRoleBadgeは`@/co | ❌ | technical_review |
| 19 | day08 | Step 6でロール判定を`session?.user?.role === 'ADMIN'`と文字列リテラルで説明していますが、実際のコード（app-layout.tsx:86）では`session?.user?.role === USER_ROLE.ADMIN`とし、`@/lib/constant/roles`からインポートした定数を使用しています。マジックストリングではなく定数を使うのはプロジ | ❌ | technical_review |
| 20 | day08 | 実コードではサイドバーのユーザー情報表示とログアウト確認ダイアログが既に完成しているのに、教材では未実装前提で追加作業をさせている。学習者は重複実装や差分不一致で混乱する。 | ❌ | po_decision |
| 21 | day08 | 教材では `Badge` を直接使っているが、実コードでは `UserRoleBadge` を使用している。variant、表示文言、UI表現が一致していない。 | ❌ | po_decision |
| 22 | day08 | 教材では `'ADMIN'` の文字列比較を教えているが、実コードでは `USER_ROLE.ADMIN` を使っている。設計方針と矛盾する。 | ❌ | po_decision |
| 23 | day09 | Step 2で `import { api } from '@/trpc/react';` としているが、実際のファイルは `src/trpc/react.tsx`（拡張子 .tsx）。Next.jsのモジュール解決ではパスは拡張子なしで解決されるため動作するが、教材として正確なファイル名を示すべき。なお、これ自体はビルドエラーにはならない。 | ❌ | technical_review |
| 24 | day09 | Step 3のローディング表示で独自のスピナーdivをハードコードしているが、実際のコードベースでは `PageLoadingSpinner` コンポーネント（`@/component/ui/loading-spinner`）が存在し、それを使用している。教材がわざわざdivで手書きさせると、実コードと乖離する上に、PageLoadingSpinner内部にはAppLayoutが既に含まれているた | ❌ | technical_review |
| 25 | day09 | Step 4のイベントハンドラーが `const handleEdit = () => {};` `const handleDelete = () => {};` `const handleProjectClick = () => {};` と引数なしで定義されているが、実際のProjectCardPropsの型定義は `onEdit: (id: string) => void`、`onDelet | ❌ | technical_review |
| 26 | day09 | Step 4でProjectCardに `isArchived` propを渡していない。実際のコードベースでは `isArchived={project.isArchived}` を渡している。ProjectCardPropsにはオプショナルだが、アーカイブ済みのバッジ表示が正しく動作しない。 | ❌ | technical_review |
| 27 | day09 | Step 4で `project.tasks?.filter((t) => t.status === 'DONE')` と文字列リテラル 'DONE' をハードコードしているが、実際のコードベースでは `TASK_STATUS.DONE` 定数を使用している。文字列リテラルだと将来の定数変更に追従できず、教材として型安全性のベストプラクティスを教える機会を逃している。 | ❌ | technical_review |
| 28 | day09 | Step 4 のイベントハンドラーが引数なしで定義されており、`ProjectCardProps` の `(id: string) => void` と型不一致になっている。 | ❌ | po_decision |
| 29 | day09 | ローディング表示を独自 div で実装しており、実コードの `PageLoadingSpinner` と乖離している。さらに `AppLayout` 二重ネストの原因になる。 | ❌ | po_decision |
| 30 | day09 | 完了タスク判定に `'DONE'` をハードコードしており、実コードの定数利用と不一致で型安全性も弱い。 | ❌ | po_decision |
| 31 | day10 | ダイアログを開くためのボタンとハンドラー（handleCreate）が記載されていない。Mermaid図の最初のステップ「新規作成ボタンをクリック」に対応するUIが存在しない。Step 8の動作確認で『新規プロジェクトボタンをクリック』と書いているが、そのボタンの実装がない。 | ❌ | technical_review |
| 32 | day10 | Step 7 で `dialogOpen` / `setDialogOpen` を使っているのに、state 宣言が存在しないため、そのままではコンパイルエラーになる。 | ❌ | po_decision |
| 33 | day11 | Step 5の削除確認ダイアログで `window.confirm()` を使用しているが、実際のコードベースでは `DeleteConfirmDialog` コンポーネント（`src/component/ui/delete-confirm-dialog.tsx`）と `deleteDialogOpen` / `deleteTargetId` のstate管理を使っている。`window.conf | ❌ | technical_review |
| 34 | day11 | Step 4の `handleDelete` 内で `if (confirm(...))` を使って直接 `deleteMutation.mutate` を呼んでいるが、実際のコードでは `handleDelete` は `setDeleteTargetId(projectId); setDeleteDialogOpen(true);` でstateを設定するだけ。削除実行は `DeleteCon | ❌ | technical_review |
| 35 | day11 | 『楽観的更新（Optimistic Update）』が新概念テーブルにあるが、実装ステップでは一切使用していない。実際の実装はinvalidate()によるキャッシュ無効化のみ。概念だけ紹介して実装しないのは初心者を混乱させる。 | ❌ | ux_review |
| 36 | day11 | 削除確認を `window.confirm()` で説明しているが、実コードは `DeleteConfirmDialog` と `deleteDialogOpen` / `deleteTargetId` の state 管理を使っている。 | ❌ | po_decision |
| 37 | day11 | Step 4 と Step 5 の削除実装が実際の責務分離と一致しておらず、Step 4 単体では不完全な実装になっている。 | ❌ | po_decision |
| 38 | day11 | 『楽観的更新』を新概念として出しているが、本文でも実コードでも使っていない。 | ❌ | po_decision |
| 39 | day12 | Step 3でProjectMemberRoleを`@prisma/client`からインポートしているが、実際のコードベースでは`@/lib/constant/roles`からインポートしている（src/app/project/page.tsx:34行目）。Prismaインストラクションでも`$Enums`禁止・`@prismaClient`からEnum型importが規定されているが、実際には | ❌ | technical_review |
| 40 | day12 | Step 5のメンバー削除ハンドラーで`confirm()`（ブラウザネイティブ）を使用しているが、実際のコードでは`DeleteConfirmDialog`コンポーネントと`removeMemberDialogOpen`/`removeMemberTargetId`のstate管理で実装されている（page.tsx:50-51行目、211-214行目、360-373行目）。学習者がこの教材通りに | ❌ | technical_review |
| 41 | day12 | Step 2でメンバー一覧のUIをpage.tsx内にインラインJSXで構築する指示になっているが、実際のコードベースではProjectDetailDialogが独立コンポーネント（src/component/project/project-detail-dialog.tsx）として存在し、page.tsxからはpropsで制御されている。教材通りにpage.tsxに直接書くと、既存の`Proje | ❌ | technical_review |
| 42 | day12 | `ProjectMemberRole` の import 元が教材では `@prisma/client` だが、実コードは `@/lib/constant/roles` を使っている。 | ❌ | po_decision |
| 43 | day12 | メンバー削除が `confirm()` ベースで説明されているが、実コードは `DeleteConfirmDialog` を使う構成で、Day 11 の学習内容とも不整合。 | ❌ | po_decision |
| 44 | day12 | `ProjectDetailDialog` を page.tsx にインライン実装する説明になっているが、実コードでは独立コンポーネントとして存在する。 | ❌ | po_decision |
| 45 | day13 | Step 1でTaskStatusを `@prisma/client` からimportしているが、実際のコードベースでは `@/lib/constant/status` からimportしている。`import type { TaskStatus } from '@prisma/client'` → 実際は `import { type TaskStatus } from '@/lib/cons | ❌ | technical_review |
| 46 | day13 | Step 4の説明文で「スプレッド演算子 `...` と `&&` を使って」と書いてあるが、実際のコードは三項演算子（`filterProject === 'all' ? undefined : filterProject`）を使っている。スプレッド演算子はコード内に一切登場しない。技術説明とコードが完全に矛盾しており、初心者を混乱させる。 | ❌ | technical_review |
| 47 | day13 | Step 7でタスク詳細ダイアログのstate・データ取得コードは書かれているが、実際のDialog JSX（UIの表示部分）が完全に欠落している。初心者はダイアログをどう画面に表示するのか全くわからない。 | ❌ | ux_review |
| 48 | day13 | Step 4の説明文に「スプレッド演算子 `...` と `&&` を使って」とあるが、実際のコードは三項演算子（`filterProject === 'all' ? undefined : filterProject`）を使用している。初心者がコードと説明文を見比べた時に混乱する。 | ❌ | ux_review |
| 49 | day13 | Step 1で `TaskStatus` を `@prisma/client` から import しているが、実コードベースの設計と不一致。 | ❌ | po_decision |
| 50 | day14 | Step 3のuseFormデフォルト値で、実際のコードは `TASK_STATUS.TODO` と `TASK_PRIORITY.MEDIUM`（定数参照）を使っているが、ドラフトでは `'TODO'` と `'MEDIUM'`（文字列リテラル）を直書きしている。Step 1でTASK_STATUSとTASK_PRIORITYをインポートしているにもかかわらず使っていないのは矛盾しており、学習者 | ❌ | technical_review |
| 51 | day14 | Step 3 の `useForm` 初期値で `TASK_STATUS.TODO` / `TASK_PRIORITY.MEDIUM` ではなく `'TODO'` / `'MEDIUM'` を直書きしている。 | ❌ | po_decision |
| 52 | day15 | Step 1のuseForm values propで `status: initialData?.status ?? 'TODO'` と `priority: initialData?.priority ?? 'MEDIUM'` がハードコード文字列になっている。実際のコード(task-dialog.tsx:83-84)では `TASK_STATUS.TODO` と `TASK_PRIORITY | ❌ | technical_review |
| 53 | day15 | DeleteConfirmDialogコンポーネントがStep 5で突然使われるが、このコンポーネントの作成手順・インポート元が一切説明されていない。初心者は「このコンポーネントはどこから来たの？」と完全に行き詰まる。Day 14以前で作成済みなら明示的にその旨とインポート文を示す必要があり、未作成ならこのDay内で作成ステップが必要。 | ❌ | ux_review |
| 54 | day15 | DeleteConfirmDialog コンポーネントの出自が不明で、受講者が import 元も作成要否も判断できない。 | ❌ | po_decision |
| 55 | day16 | Step 8のTaskCardPropsで「// ...既存のprops」というコメントが使われています。これは「// ...」禁止パターンに該当し、コード省略に当たります。初心者はどのpropsが既存なのか分かりません。 | ❌ | ux_review |
| 56 | day17 | TaskStatusの型インポート元が間違い。教材では `import type { TaskStatus } from '@prisma/client'` としているが、実際のコードでは `import { type TaskStatus } from '@/lib/constant/status'` を使用。また `isTaskStatus` 型ガード関数もこのモジュールからインポートされてい | ❌ | technical_review |
| 57 | day17 | 日付比較で `toDateString()` を使用しているが、実際のコードは `date-fns` の `isSameDay()` を使用。教材では `import { isSameDay } from 'date-fns'` がなく、代わりに `const todayStr = now.toDateString()` + `dueDateStr === todayStr` という比較をしている | ❌ | technical_review |
| 58 | day17 | handleDeleteが `window.confirm()` を使用しているが、実際のコードは `DeleteConfirmDialog` コンポーネント（`@/component/ui/delete-confirm-dialog`）を使用。`deleteDialogOpen` と `deleteTargetId` の2つのstateで管理し、ダイアログUIで確認する。`window.conf | ❌ | technical_review |
| 59 | day17 | Step 4で `activeTab as TaskStatus` という型アサーション（as）が使われている。プロジェクトのTypeScript規約では `as const` 以外の全ての `as` が完全禁止されている。教材でこのパターンを教えると、学習者が悪い習慣を身につけてしまう。 | ❌ | ux_review |
| 60 | day17 | `TaskStatus` のインポート元が実コードと不一致で、教材がプロジェクト実装を誤って教えている。 | ❌ | po_decision |
| 61 | day17 | 日付比較に `toDateString()` を使っており、実コードの `isSameDay()` と乖離している。 | ❌ | po_decision |
| 62 | day17 | 削除フローが `window.confirm()` になっており、実コードの `DeleteConfirmDialog` パターンと一致しない。 | ❌ | po_decision |
| 63 | day18 | 全ステップ（Step 2〜6）で src/app/task/page.tsx にコメント関連コードを追加する指示になっているが、実際のコードベースではコメント機能は src/component/task/task-detail-dialog.tsx に実装されている。page.tsx は TaskDetailDialog コンポーネントを呼び出すだけで、コメント関連のstate・mutation・ | ❌ | technical_review |
| 64 | day18 | Step 5 で selectedTask を使って invalidate しているが、実際の task-detail-dialog.tsx では props の taskId を使用している。教材のコード例をそのまま task-detail-dialog.tsx に書くと taskId ではなく selectedTask を参照しようとしてコンパイルエラーになる。 | ❌ | technical_review |
| 65 | day18 | importパスが `@/component/ui/avatar` 等になっているが、プロジェクトの正しいパスは `@/components/ui/avatar`（sが必要）。このまま写経すると import エラーでビルドが通らない。 | ❌ | ux_review |
| 66 | day18 | 教材の主要ステップが `src/app/task/page.tsx` を編集対象にしているが、実際のコメント機能は `src/components/task/task-detail-dialog.tsx` に存在する。 | ❌ | po_decision |
| 67 | day18 | 教材はコメント機能を新規実装する前提だが、実コードでは投稿・編集・削除・表示が既に完成している。 | ❌ | po_decision |
| 68 | day18 | コメント用 state と mutation を一覧ページ側に置く説明になっており、実際の責務分離と一致していない。 | ❌ | po_decision |
| 69 | day18 | import パスが `@/component/ui/*` になっており、正しい `@/components/ui/*` と一致していない。 | ❌ | po_decision |
| 70 | day19 | 全コード例が src/app/task/page.tsx に追加する指示になっているが、実際のコードベースではコメント関連の全ロジック（state, mutation, ハンドラー, UI）は src/component/task/task-detail-dialog.tsx 内の TaskDetailDialog コンポーネントに実装されている。page.tsx にはコメント関連コードは一切存在 | ❌ | technical_review |
| 71 | day19 | ドラフトでは session の取得方法が示されていない。実際のコードベースでは const { data: session } = api.auth.getSession.useQuery() でセッションを取得しているが、ドラフトでは session?.user?.id を突然使用している。 | ❌ | technical_review |
| 72 | day19 | 実装先が src/app/task/page.tsx になっているが、実際のコメント編集・削除ロジックは src/component/task/task-detail-dialog.tsx に存在する前提でなければ動かない。 | ❌ | po_decision |
| 73 | day20 | Step 3 で `(searchParams.get('status') as 'all' \| TaskStatus)` と `as` 型アサーションを使用している。プロジェクトの TypeScript 規約（typescript.instructions.md）で `as` は `as const` 以外完全禁止。実コードベースでもこのパターンは使われていない。 | ❌ | technical_review |
| 74 | day20 | 検索ボタンとクリアボタンのJSXコードが存在しない。handleSearchとhandleClearは定義されているが、それを呼び出すUIが示されていないため、初心者は検索を実行する方法がわからない。 | ❌ | ux_review |
| 75 | day20 | Step 3が7分で6個のコードブロック（import文、テキスト系state、担当者・日付state＋API呼出、キーワード入力JSX、担当者SelectJSX、日付入力JSX）を含んでおり、1ステップとしては情報量が多すぎる。初心者は途中で迷子になる。 | ❌ | ux_review |
| 76 | day20 | BadRequestError: Error code: 400 - {'error': {'message': "We could not parse the JSON body of your request. (HINT: This likely means you aren't using your HTTP library correctly. The OpenAI API expect | ❌ | po_decision |
| 77 | day21 | completionRateの計算で文字列リテラル 'DONE' を直接使用しているが、実際のコードベースでは `TASK_STATUS.DONE` 定数（src/lib/constant/status.ts で定義）を使用している。Step 4: `t.status === 'DONE'` → 実コード: `t.status === TASK_STATUS.DONE`。定数を使うパターンはコード | ❌ | technical_review |
| 78 | day21 | Step 3でローディング表示に `Loader2` を使ったインラインスピナーを実装しているが、実際のコードベースでは `PageLoadingSpinner` コンポーネント（src/component/ui/loading-spinner.tsx）が存在し、report/page.tsx もこれを使用している。教材が独自のローディングUIを教えると、コードベースの共通パターンと矛盾する。 | ❌ | technical_review |
| 79 | day21 | 完了率の計算で実コードベースの `TASK_STATUS.DONE` ではなく、文字列リテラル `'DONE'` を使っている。 | ❌ | po_decision |
| 80 | day21 | ローディング表示で実コードの共通コンポーネント `PageLoadingSpinner` ではなく、`Loader2` による独自実装を教えている。 | ❌ | po_decision |
| 81 | day22 | 教材では `@/components/ui/card` と記載しているが、実際のコードベースのパスは `@/component/ui/card`（components ではなく component）。Step 4 の Card/CardHeader/CardTitle/CardContent のインポートが暗黙に `@/components/ui/card` を前提としている。初心者がそのまま書く | ❌ | technical_review |
| 82 | day22 | 教材 Step 2 の statusData 集計は `reduce` + `Object.entries` で `{name, value}` 形式を生成しているが、実際のコード（report/page.tsx:37-47）は `Map` を使い `{key, name, value}` 形式で、さらに `TASK_STATUS_LABELS` で日本語ラベルに変換している。教材の方法だとグラフ | ❌ | technical_review |
| 83 | day22 | 教材 Step 4 では `entry.name as keyof typeof TASK_STATUS_COLORS` という型アサーション（as）を使っているが、実コード（report/page.tsx:176-179）は `isTaskStatus(entry.key)` 型ガード関数を使っている。このプロジェクトの TypeScript 規約では `as` による型アサーションは完全禁止（ | ❌ | technical_review |
| 84 | day22 | 教材の Card 系 import パスが実コードベースと一致しておらず、学習者がそのまま書くとモジュール解決エラーになる可能性が高い。 | ❌ | po_decision |
| 85 | day22 | statusData / priorityData の生成方法が実コードと異なり、表示ラベルやデータ構造がズレている。 | ❌ | po_decision |
| 86 | day22 | `as keyof typeof` を教材で教えており、プロジェクトの型アサーション禁止規約に反している。 | ❌ | po_decision |
| 87 | day23 | Step 2: ステータス比較で文字列リテラル 'DONE' を直接使用している。実コード（report/page.tsx:74行目）では `TASK_STATUS.DONE` 定数を使用。プロジェクトではマジックストリング禁止であり、定数を使うのが正しい設計。 | ❌ | technical_review |
| 88 | day23 | Step 5: 週次レポートページのローディング表示が実コードと異なる。教材では `<Loader2>` をAppLayout内に手動配置しているが、実コード（weekly/page.tsx:42行目）では `<PageLoadingSpinner />` コンポーネントを使用し、AppLayoutの外で早期リターンしている。教材通りに書くと実コードと不一致になる。 | ❌ | technical_review |
| 89 | day23 | Step 6: 日付フォーマットに `toLocaleDateString()` を使用しているが、実コード（weekly/page.tsx:103行目）では `date-fns` の `format` 関数と `ja` ロケールを使用している: `format(new Date(...), 'yyyy/MM/dd', { locale: ja })`。教材通りに書くとブラウザ依存の表示になり実コ | ❌ | technical_review |
| 90 | day23 | Step 2で完了ステータス比較に文字列リテラル 'DONE' を使っており、実コードの TASK_STATUS.DONE と不一致。プロジェクト方針にも反する。 | ❌ | po_decision |
| 91 | day23 | Step 5のローディング処理が実コードと異なる。教材では AppLayout 内に Loader2 を置いているが、実コードでは PageLoadingSpinner を使って早期リターンしている。 | ❌ | po_decision |
| 92 | day23 | Step 6の日付表示が `toLocaleDateString()` になっており、実コードの date-fns + ja ロケールと不一致。表示がブラウザ依存になる。 | ❌ | po_decision |
| 93 | day24 | 実際のコードでは `USER_ROLE.ADMIN` 定数を使用して権限チェックしている（46行目: `currentUser?.role !== USER_ROLE.ADMIN`）が、教材Step 3では `currentUser?.role !== 'ADMIN'` とハードコード文字列で比較している。実際のコードベースには `src/lib/constant/roles.ts` に `USE | ❌ | technical_review |
| 94 | day24 | 実際のコードではロールバッジに `UserRoleBadge` コンポーネント（`src/component/ui/user-badges.tsx`）を使用しているが、教材Step 5ではインラインで Badge + Shield/User アイコンを手書きしている。同様にステータスバッジも `ActiveStatusBadge` を使うべき。既存の再利用コンポーネントを無視して車輪の再発明を教え | ❌ | technical_review |
| 95 | day24 | 実際のコードではローディング表示に `PageLoadingSpinner`（`src/component/ui/loading-spinner.tsx`）を使用しているが、教材Step 2ではインラインでスピナーを手書きしている。PageLoadingSpinnerは内部でAppLayoutも含んでおり、教材のコードとは構造が異なる。 | ❌ | technical_review |
| 96 | day24 | Step 2のコードが5つの断片に分割されているが、これらはすべて同一ファイル `src/app/user/page.tsx` の異なる部分であり、学習者がどの順番でどこに配置すべきか不明。特に「残りのコンポーネントをインポートします」「エラー時のリダイレクト処理を追加します」等の接続説明が曖昧で、最終的なファイル全体像が見えない。 | ❌ | technical_review |
| 97 | day24 | ページ全体のreturn文の骨格（タイトル「ユーザー管理」、CardやTableを囲むレイアウト構造）のコードが欠落しています。Step 2でimportとデータ取得、Step 3で権限チェック、Step 4でテーブルを書いていますが、それらを繋ぐメインのreturn文が示されていないため、初心者はコードをどう組み立てればいいか分かりません。 | ❌ | ux_review |
| 98 | day24 | 権限チェックが `currentUser?.role !== 'ADMIN'` のハードコードになっており、実コードの `USER_ROLE.ADMIN` と不一致です。 | ❌ | po_decision |
| 99 | day24 | 教材が `UserRoleBadge` と `ActiveStatusBadge` を使わず、page.tsx 内で Badge を手書きしています。実コードの再利用方針に反します。 | ❌ | po_decision |
| 100 | day24 | ローディング表示をインライン実装していますが、実コードでは `PageLoadingSpinner` を使用しています。 | ❌ | po_decision |
| 101 | day25 | プロフィールページ(page.tsx)のバッジ表示が実際のコードと完全に異なる。実際のコードは `import { ActiveStatusBadge, UserRoleBadge } from '@/component/ui/user-badges'` を使い、`<UserRoleBadge role={currentUser.role} />` と `<ActiveStatusBadge is | ❌ | technical_review |
| 102 | day25 | パスワード変更ページ(change-password/page.tsx)で、実際のコードは `import { PasswordInput } from '@/component/ui/password-input'` を使い、各パスワードフィールドを `<PasswordInput id='...' name='...' value={...} onChange={handleChange} r | ❌ | technical_review |
| 103 | day25 | プロフィールページで管理者判定に文字列リテラル `'ADMIN'` を使用している（Step 3: `currentUser.role === 'ADMIN'`、Step 4: `currentUser.role === 'ADMIN'`）。実際のコードは `import { USER_ROLE } from '@/lib/constant/roles'` をインポートし、`currentUser | ❌ | technical_review |
| 104 | day25 | Step 6のパスワード変更フォームとStep 10のプロフィール編集フォームが、useState + handleChangeパターンで実装されている。品質ルールでは「全てのフォームはreact-hook-form + zodで実装」が絶対ルールとして明記されており、useStateによる個別管理は禁止パターンとして例示されている。教材がプロジェクト自身の禁止パターンを教えてしまっている。 | ❌ | ux_review |
| 105 | day25 | プロフィールページで実コードの `UserRoleBadge` / `ActiveStatusBadge` を使わず、Badge をインライン実装している。教材が再利用コンポーネントの設計方針に反している。 | ❌ | po_decision |
| 106 | day25 | change-password ページで既存の `PasswordInput` を使わず、Eye/EyeOff と表示切替ロジックをページ内で手実装している。 | ❌ | po_decision |
| 107 | day25 | 管理者判定に `'ADMIN'` の文字列リテラルを使っており、実コードの `USER_ROLE.ADMIN` と不一致。 | ❌ | po_decision |
| 108 | day25 | 教材内のインポートパスが `@/component/...` で統一されている一方、品質ルールでは `@/components/ui/*` が必須と書かれている。現状のままだと教材とルールのどちらを信じるべきか学習者が混乱する。 | ❌ | po_decision |
| 109 | day26 | Step 5で`console.log('DEBUG: tasks =', tasks);`をdashboard/page.tsxの`returnの直前に追加`と指示しているが、実際のdashboard/page.tsxでは`tasks`と`projects`は行17-18でuseQueryから取得され、行28-31で加工されている。returnは行62で、その直前に`console.log`を入 | ❌ | technical_review |
| 110 | day27 | project-detail-dialog.tsx のインポート文が一切示されていません。Avatar, AvatarImage, AvatarFallback, Badge, Button, Dialog系コンポーネント, UserPlus, Trash2, Archive, ArchiveRestore など10個以上のインポートが必要ですが、学習者はどこから何をインポートすべきか分かりません | ❌ | ux_review |
| 111 | day27 | Step 7で handleDetailClose, handleRemoveMember, setMemberDialogOpen, utils などの関数・変数が使われていますが、実装が示されていません。学習者はこれらをどう書けばよいか分からず、完全に行き詰まります。特に handleRemoveMember はメンバー削除のAPI呼び出しを含むはずですが、その実装が丸ごと欠落しています。 | ❌ | ux_review |
| 112 | day27 | `project-detail-dialog.tsx` の必須インポートが示されておらず、学習者がファイルを構築できない。 | ❌ | po_decision |
| 113 | day29 | つまずきポイント表に複数の事実と異なる記述がある。(1) パスが「app/admin/users/[id]/page.tsx」だが実際は「src/app/user/[id]/page.tsx」。(2) 「useFormのdefaultValuesにデータを渡していない」と記述されているが、教材のコードはuseFormではなくuseStateを使用している。(3) 「session.user.rol | ❌ | technical_review |
| 114 | day29 | つまずきポイントのテーブルで「useFormのdefaultValuesにデータを渡していない」「defaultValuesにAPIから取得したユーザーデータを設定する」と記載されているが、実装では useForm を一切使わず useState + useEffect で管理している。初心者がトラブルシューティング表を見て「useFormってどこ？」と混乱する。 | ❌ | ux_review |
| 115 | day29 | つまずきポイント表に、実際のファイルパス・状態管理方式・権限判定方法・更新後挙動と異なる記述が複数ある。 | ❌ | po_decision |
| 116 | day30 | docker-compose.yml のコードブロックが実際のファイルと大幅に異なる。実際のファイルには backend サービス、schemaspy サービス、test-db サービス、backend-nodemodules-volume が含まれるが、教材では db サービスのみを表示。さらに volumes セクションの記述が不正確（postgres-data: /var/lib/postg | ❌ | technical_review |
| 117 | day30 | .env.example の内容が実際のファイルと異なる。教材では DATABASE_URL='postgresql://user:password@localhost:5432/taskapp?schema=public' と書いているが、実際のファイルでは DATABASE_URL='postgresql://user:password@localhost:${_DOCKER_COMPOSE_ | ❌ | technical_review |
| 118 | day30 | .env.example のコードブロックで DATABASE_URL と JWT_SECRET の値が途中改行されている。初心者がそのままコピペすると .env ファイルが壊れて接続エラーになる。 | ❌ | ux_review |
| 119 | day30 | docker-compose.yml のコードブロックで ports と volumes の値が途中改行されている。YAML は改行に厳密なため、そのままコピペすると構文エラーになる。 | ❌ | ux_review |
| 120 | day30 | Step 3 で突然『Vercel ダッシュボードにログイン』と書かれているが、Vercel アカウント作成・GitHub 連携・プロジェクトインポートの手順が一切ない。初心者はここで完全に詰まる。 | ❌ | ux_review |
| 121 | day30 | docker-compose.yml の提示内容が実ファイルと大きく異なり、しかも YAML として壊れる改行が入っている。 | ❌ | po_decision |
| 122 | day30 | .env.example、docker-compose.yml、package.json のコードブロックが途中改行されており、そのまま貼ると壊れる。 | ❌ | po_decision |
| 123 | day30 | .env.example の内容が実ファイルと異なり、DATABASE_URL のポート変数参照や他の重要変数が落ちている。 | ❌ | po_decision |
| 124 | day30 | Vercel アカウント作成、GitHub 連携、プロジェクト import の前提手順がなく、初心者が Step 3 で詰まる。 | ❌ | po_decision |

### Major（186件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 2で推奨するVS Code拡張機能（biomejs.biome, Prisma.prisma, bradlc.vscode-tailwindcss）が、プロジェクトの.vscode/extensions.jsonの推奨リスト（biomejs.biome, EditorConfig.EditorConfig, stylelint.vscode-stylelint, wayou.vscode | ❌ | technical_review |
| 2 | day01 | Step 8の.envコード解説表で `JWT_SECRET` の役割を「認証トークンの暗号鍵」と説明しているが、実際のプロジェクトはNextAuth v4を使用しており、NextAuthでは `NEXTAUTH_SECRET` が標準的な環境変数名。教材でJWT_SECRETがNextAuthとどう関係するかの説明がなく、初心者が後のDay（認証機能実装時）で混乱する可能性がある。 | ❌ | technical_review |
| 3 | day01 | Step 1が情報過多。miseのインストール（Mac/Windows両方）＋シェル設定＋Node.jsの概念紹介＋Node.jsインストールの予告と、10分のStepに4〜5トピックが詰め込まれている。特に「Node.jsとは」と「Node.jsのインストール」セクションがStep 1にあるのに、実際のインストールはStep 6で行うという前方参照が混乱を招く。 | ❌ | ux_review |
| 4 | day01 | Step 4の `cd ~/Desktop` はMac/Linux前提。Windows（PowerShell）ユーザーは `~/Desktop` パスが異なる可能性がある。Step 1でWindows対応を丁寧にしているのに、Step 4以降でMac前提に戻っている。 | ❌ | ux_review |
| 5 | day01 | .envファイル内の `DATABASE_URL` 行が79文字あり、65文字のコード行長ルール（PDF互換性）に違反している。PDFに変換すると途中で切れてしまう。 | ❌ | ux_review |
| 6 | day02 | Step 2のコード解説テーブルで{message}を説明しているが、実際のJSXコード例では{message}を使っておらず{`こんにちは！開発者さん`}とハードコードしている。解説と実装が矛盾している。学習者は「messageという変数を作ったのに使わないの？」と混乱する。 | ❌ | technical_review |
| 7 | day02 | Step 7で completionRate と statusText を「stats配列のすぐ下」に追加するよう指示しているが、Step 2-6で追加した未使用変数（greeting, userName, message, welcomeText, dynamicText, taskCount, projectName, isCompleted）がreturn前に散在しているはず。チュートリアル | ❌ | technical_review |
| 8 | day02 | Step 8-9で`as const`、`typeof`、`keyof`、`Record`を一気に紹介しています。Day 02の初心者にとって、const/let/型注釈だけでも十分な学習量です。これらの高度な概念は消化不良を起こす可能性があります。 | ❌ | ux_review |
| 9 | day02 | Step 2の解説では{message}を説明しているのに、実際のJSXはハードコード文字列を表示しており、説明と実装が矛盾している。 | ❌ | po_decision |
| 10 | day02 | Day 02の主題がconst/let/基本型なのに、Step 8-9でas const、typeof、keyof、Recordまで一気に導入しており、初心者には重い。 | ❌ | po_decision |
| 11 | day03 | Step 4-2で、macOS・Windows・Linuxの3つのcredential.helperコマンドが1つのコードブロック内にコメント区切りで並んでいる。初心者は全コマンドを順番に実行してしまう可能性が高い。また、Linux向けの`credential.helper store`はパスワードを平文でファイル保存するセキュリティリスクがあるが、警告がない。 | ❌ | technical_review |
| 12 | day03 | Step 7の`.gitignore`解説で「`.env`が除外される」と説明しているが、実際の`.gitignore`のパターンは`*.env*`（64行目）。`.env`ではなくワイルドカードパターンであり、`.env.local`や`.env.production`なども除外対象に含まれる。初心者が後日`.env.local`を作成した際に「.envしか除外されないのでは」と誤解する可能性が | ❌ | technical_review |
| 13 | day03 | `.gitignore` の説明が `.env` に限定されており、実際のパターン `*.env*` の意味を正しく伝えていない。 | ❌ | po_decision |
| 14 | day04 | 環境変数にNODE_ENVが含まれていない。.env.exampleではNODE_ENV='development'が定義されている。Vercelでは自動的にproductionが設定されるため必須ではないが、教材として.env.exampleに存在する変数を説明なく省略するのは不正確。また、Vercelのビルドコマンドが`prisma generate && next build`（packag | ❌ | technical_review |
| 15 | day04 | Step 7のエラー対処表で`next.config.js`を確認するよう書かれているが、実際のプロジェクトは`next.config.mjs`（ESM形式）を使用している。初心者がファイルを探して見つからず混乱する。 | ❌ | technical_review |
| 16 | day04 | Step 4で「Import」をクリックした後、Step 5で「Configure Project画面でEnvironment Variables」を設定し、Step 6で「Deployボタンをクリック」という流れだが、Vercelの実際のUIでは、Import → Configure Project（環境変数設定含む）→ Deploy が一連の画面。Step 4とStep 5が実質同じ画面での操 | ❌ | technical_review |
| 17 | day04 | プロジェクトの技術スタックにNextAuth v4が記載されているが、NextAuthが必要とする環境変数は通常 NEXTAUTH_SECRET と NEXTAUTH_URL であり、JWT_SECRET ではない。実際のコードベースと環境変数名が一致しない可能性がある。また、NEXTAUTH_URL（本番URL）の設定手順が欠落している。 | ❌ | ux_review |
| 18 | day04 | Step 6で「Deploy」ボタンを押した後、ビルドが失敗した場合の対処がStep 6内に無い。初めてのデプロイはビルドエラーが起きやすく（環境変数ミス、Prisma未設定等）、ビルドログの確認方法を知らないと対処できない。 | ❌ | ux_review |
| 19 | day04 | Import後と環境変数設定が実質同一画面なのに分断されており、学習者が環境変数未設定のままDeployを押す危険がある。 | ❌ | po_decision |
| 20 | day04 | `.env.example` や buildスクリプトとの整合説明が不足しており、Vercelで何が自動実行されるかが不明瞭。 | ❌ | po_decision |
| 21 | day05 | Step 7でisValidRedirectUrl関数がLoginFormコンポーネント内に配置されているが、実際のコードベース（src/app/login/page.tsx:27-38）ではコンポーネント外（モジュールスコープ）に定義されている。コンポーネント内に純粋関数を置くと、レンダリングごとに再作成されるため非効率であり、教材として不適切なパターンを教えることになる。 | ❌ | technical_review |
| 22 | day05 | Step 7で`react-hot-toast`と`toast.success()`が導入されているが、「新しく学ぶ概念」テーブルにも予備知識セクションにも記載がない。初心者にとってtoast通知は未知の概念であり、importだけ追加して説明なしに使うのは教材として不十分。 | ❌ | technical_review |
| 23 | day05 | Step 7が1ステップに新概念を詰め込みすぎ（useRouter, useSearchParams, Open Redirect対策関数, useState, tRPC useMutation, react-hot-toast）。7分で消化するのは初心者には不可能。 | ❌ | ux_review |
| 24 | day05 | tRPC（api.auth.login.useMutation）とreact-hot-toast（toast.success）がStep 7で突然登場するが、冒頭の『新しく学ぶ概念』テーブルに含まれておらず、読み方・役割・例え話の紹介がない。初心者は `api` が何なのか、`toast` が何をするのか分からない。 | ❌ | ux_review |
| 25 | day05 | `isValidRedirectUrl` がコンポーネント内に置かれており、実コード構成と不一致で教材としても不適切。 | ❌ | po_decision |
| 26 | day05 | tRPC と react-hot-toast が『新しく学ぶ概念』に含まれておらず、初心者が文脈を掴みにくい。 | ❌ | po_decision |
| 27 | day06 | Step 7 の onSubmit 関数に `async` キーワードが欠落しています。実際のコードベース（register/page.tsx:52行目）では `const onSubmit = async (data: RegisterFormData) =>` と定義されていますが、教材では `const onSubmit = (data: RegisterFormData) =>` となって | ❌ | technical_review |
| 28 | day06 | Step 1 で `CardDescription` を import していますが、Step 1 のコンポーネント内では使用していません。CardDescription は Step 8 で初めて使われます。初心者は「import したのに使ってない」と混乱する可能性があります。 | ❌ | technical_review |
| 29 | day06 | Step 3 で useForm の設定と仮の onSubmit を定義していますが、Step 7 で onSubmit を書き換えています。初心者にとって「仮の送信処理」→「後で書き換え」パターンは混乱しやすい。さらに Step 3 の onSubmit には async がないが、Step 7 でも async がない。実コードは async です。 | ❌ | technical_review |
| 30 | day06 | Step 7 の `onSubmit` に `async` がなく、実コードと不一致です。 | ❌ | po_decision |
| 31 | day06 | Step 1 で `CardDescription` を import しているのに未使用です。初心者に不要な混乱を与えます。 | ❌ | po_decision |
| 32 | day07 | Step 2のauth.tsコード引用で、実際のコード（40-45行目）に存在する `isActive` チェック（`if (!user.isActive) { throw new TRPCError({ code: 'FORBIDDEN', message: 'このアカウントは無効化されています' }); }`）が完全に省略されている。このチェックはユーザー存在確認とbcrypt.compare | ❌ | technical_review |
| 33 | day07 | Step 2の確認ポイントに「ログイン処理の4ステップ（検索→存在チェック→パスワード照合→有効チェック）が追えた」とあるが、実際のコードの順序は「検索→存在チェック→有効チェック(isActive)→パスワード照合」である。さらにドラフトのコードブロック自体がisActiveチェックを省略しているため、「4ステップ」という記述がドラフトコードとも実コードとも一致しない矛盾状態にある。 | ❌ | technical_review |
| 34 | day07 | Step 2 の auth.ts 抜粋に実装上重要な `isActive` チェックが欠落しており、実際のログインフロー理解を誤らせる。 | ❌ | po_decision |
| 35 | day07 | Step 2 の確認ポイントが『検索→存在チェック→パスワード照合→有効チェック』となっており、実装順と矛盾している。 | ❌ | po_decision |
| 36 | day08 | Step 5で`const handleLogout = async () => { logoutMutation.mutate(); };`とasync関数として定義していますが、実際のコード（app-layout.tsx:80）は`const handleLogout = () => { logoutMutation.mutate(); };`で非asyncです。`mutate()`は同期的に | ❌ | technical_review |
| 37 | day08 | Step 4のimport追加で`import { Badge } from '@/component/ui/badge';`を教えていますが、実際のapp-layout.tsxではBadgeを直接importしておらず、代わりに`import { UserRoleBadge } from '@/component/ui/user-badges';`を使用しています。さらに`import { US | ❌ | technical_review |
| 38 | day08 | Step 4とStep 5は「サイドバーにユーザー情報を追加する」「ログアウト確認ダイアログを追加する」と記述していますが、実際のコードベースにはこれらの機能が既に完成した状態で存在しています（app-layout.tsx:125-155）。学習者がこの教材通りにコードを追加しようとすると、既に同じコードが存在するため混乱します。 | ❌ | technical_review |
| 39 | day08 | 教材では `async` を付けているが、実コードでは不要であり、初学者に誤解を与える。 | ❌ | po_decision |
| 40 | day08 | 教材では `Badge` を import しているが、実コードで必要な `UserRoleBadge` と `USER_ROLE` の import が欠けている。 | ❌ | po_decision |
| 41 | day09 | Step 1のSuspense fallbackで独自のスピナーdivをAppLayoutで包んでいるが、実際のコードベースでは `<Suspense fallback={<PageLoadingSpinner />}>` のみ。PageLoadingSpinner内部に既にAppLayoutが含まれているため、教材のコードは冗長であり実コードと乖離する。 | ❌ | technical_review |
| 42 | day09 | Step 7で `useState<Record<string, unknown> \| undefined>(undefined)` としているが、実際のコードベースでは `useState<ProjectFormData \| undefined>(undefined)` であり、`ProjectFormData` を `@/component/project/project-dialog` から | ❌ | technical_review |
| 43 | day09 | 実際のコードベースにはアーカイブ表示切替の Switch コンポーネント（`showArchived` + `Switch`）があるが、教材ではStep 2で `showArchived` stateを定義しているのにUIに反映するステップがない。学習者は `showArchived` が何のためにあるか分からない。 | ❌ | technical_review |
| 44 | day09 | Step 7 の `editingProject` が `Record<string, unknown>` になっており、実コードの `ProjectFormData` と不一致で型安全性が低い。 | ❌ | po_decision |
| 45 | day09 | tree 形式のディレクトリ構造がなく、ファイルの位置関係が把握しづらい。 | ❌ | po_decision |
| 46 | day10 | Step 7で `api.auth.getCurrentUser.useQuery()` を呼んで `currentUser` を取得しているが、handleSubmit 内で一切使用していない。実際のコードベースでは `if (!currentUser?.id) { return; }` というガードが存在する。未使用の変数は読者を混乱させ、実際のコードとも乖離する。 | ❌ | technical_review |
| 47 | day10 | Step 7 で page.tsx に対して4つのコードブロック（import文、mutation定義、handleSubmit、JSX追加）を一気に追加している。品質ルール「1ファイル = 1ステップまで」には反しないが、1ステップ内の変更量が多すぎて7分では厳しい。また `ProjectDialog` の import と `ProjectFormData` の type import を分け | ❌ | technical_review |
| 48 | day10 | Step 7で `api.auth.getCurrentUser.useQuery()` を呼び出していますが、取得した `currentUser` がこのDay内のコードで一切使用されていません。初心者は「なぜこのコードが必要なのか」が分からず混乱します。 | ❌ | ux_review |
| 49 | day10 | `api.auth.getCurrentUser.useQuery()` で取得した `currentUser` が未使用で、教材上の意図が不明確。 | ❌ | po_decision |
| 50 | day11 | Step 3の `handleSubmit` で新規作成（else分岐）に `if (!currentUser?.id) { return; }` のガードが欠落している。実際のコードではこのガードが存在する（page.tsx:178-180）。教材からこれを省略すると、currentUserがundefinedの場合にcreateが呼ばれてしまう可能性がある。 | ❌ | technical_review |
| 51 | day11 | Step 6のarchiveルーターのコードで `prisma.project.update({ where: { id: input.id }, data: { isArchived: true } })` と直接Prismaを呼んでいるが、実際のコードでは `setArchiveStatus(ctx.session.userId, input.id, true)` というヘルパー関数に委譲して | ❌ | technical_review |
| 52 | day11 | 「新しく学ぶ概念」テーブルに「楽観的更新（Optimistic Update）」を含め「サーバーの応答を待たず先にUIを更新し、失敗したらロールバックする手法」と定義しているが、本文中でこの概念を実装も説明もしていない。実際のコードも `onSuccess` での `invalidate()` によるキャッシュ無効化を使っており、楽観的更新は実装されていない。 | ❌ | technical_review |
| 53 | day11 | 実際のコードには `deleteDialogOpen` と `deleteTargetId` の2つのstateが存在する（page.tsx:48-49）が、教材ではこれらのstate定義が一切説明されていない。Step 1で `editingProject` のstate差し替えは説明しているが、削除関連のstateは完全に抜けている。 | ❌ | technical_review |
| 54 | day11 | コードが ProjectFormData 型や api、utils を参照しているが、インポート文が一切示されていない。初心者は『ProjectFormDataはどこからインポートするの？』と迷う。 | ❌ | ux_review |
| 55 | day11 | `handleSubmit` の新規作成分岐に `currentUser?.id` ガードがなく、実コードより安全性が落ちている。 | ❌ | po_decision |
| 56 | day11 | archive ルーターの説明が Prisma 直接更新になっており、実コードの helper 委譲と権限チェックを落としている。 | ❌ | po_decision |
| 57 | day11 | 必要な型・API・コンポーネントの import が示されておらず、初心者が迷う。 | ❌ | po_decision |
| 58 | day11 | コード断片が前提依存で、初心者が『どこに足すのか』『何を import するのか』を判断しづらい。 | ❌ | po_decision |
| 59 | day12 | Step 3のロール選択のonValueChangeで`value as ProjectMemberRole`という型アサーション（asキャスト）を使用している。プロジェクトのTypeScript規約（typescript.instructions.md）で`as`は完全禁止。実際のコードでは`isProjectMemberRole(value)`型ガードを使用している（page.tsx:318行 | ❌ | technical_review |
| 60 | day12 | Step 4のnewMemberRoleの初期値リセットで文字列リテラル`'MEMBER'`を使用しているが、実際のコードでは`PROJECT_MEMBER_ROLE.MEMBER`定数を使用している（page.tsx:109行目）。同様にStep 2のOWNERチェックも文字列リテラル`'OWNER'`だが、実際は`PROJECT_MEMBER_ROLE.OWNER`。 | ❌ | technical_review |
| 61 | day12 | Step 2でロールBadge表示に`PROJECT_MEMBER_ROLE_LABELS[member.role] ?? member.role`と直接アクセスしているが、実際のコードでは`isProjectMemberRole(member.role) ? PROJECT_MEMBER_ROLE_LABELS[member.role] : member.role`と型ガードで安全にアクセスして | ❌ | technical_review |
| 62 | day12 | Step 3のstate宣言で`useState<ProjectMemberRole>('MEMBER')`としているが、実際のコードでは`useState<ProjectMemberRole>(PROJECT_MEMBER_ROLE.MEMBER)`。@prisma/clientからのimportも不正確（実際は@/lib/constant/roles）。 | ❌ | technical_review |
| 63 | day12 | Step 6の権限テーブルで「プロジェクト削除: OWNER=✅, ADMIN=❌」としているが、実際のroles.ts（42-56行目）では`ADMIN: { canDelete: true }`となっている。ADMINにもcanDeleteがtrueなので、教材の権限表と実際の権限設定が矛盾している。 | ❌ | technical_review |
| 64 | day12 | Step 3 で `value as ProjectMemberRole` という型アサーションを使用している。プロジェクトのTypeScript規約で `as` は `as const` 以外完全禁止。 | ❌ | ux_review |
| 65 | day12 | Step 2 で `PROJECT_MEMBER_ROLE_LABELS` を `@/lib/constant/roles` からインポートしているが、このファイルの中身が一切説明されていない。初心者は「このファイルはいつ作ったの？」と混乱する。 | ❌ | ux_review |
| 66 | day12 | 権限表で `ADMIN` のプロジェクト削除が ❌ になっているが、実コードの permissions と矛盾している。 | ❌ | po_decision |
| 67 | day12 | `'OWNER'` や `'MEMBER'` の文字列リテラルを直接使っており、実コードの定数運用とずれている。 | ❌ | po_decision |
| 68 | day12 | shadcn/ui の import パスが `@/component/ui/*` になっており、品質ルールの `@/components/ui/*` と不一致。実プロジェクト構成の説明もない。 | ❌ | po_decision |
| 69 | day13 | Step 5で `const handleEdit = () => {}` と `const handleDelete = () => {}` を定義しているが、実際のTaskCardPropsでは `onEdit: (id: string) => void` と `onDelete: (id: string) => void` で引数 `id` が必須。このまま渡すとTypeScriptの型エラ | ❌ | technical_review |
| 70 | day13 | Step 5のprops表で `assignee` の型を `object?` とし、暗黙的に `{ id: string; name: string }` を想定しているが、実際のTaskCardPropsでは `{ name: string \| null; email: string; avatar: string \| null; } \| null`。`id`フィールドは存在せず、`email | ❌ | technical_review |
| 71 | day13 | Step 5のprops表で `priority` を `TaskPriority` と記載しているが、型の後に `?` がないので必須扱い。これは実際のTaskCardPropsの `priority: TaskPriority`（必須）と一致するが、表の説明では「優先度（LOW, MEDIUM, HIGH, URGENT）」とある。実際のenumには `CRITICAL` もあるが `URGE | ❌ | technical_review |
| 72 | day13 | Step 7でタスク詳細ダイアログのstate・データ取得を実装しているが、実際のダイアログコンポーネント（TaskDetailDialog）のJSXレンダリングが一切ない。import文もない。実際のコードでは `TaskDetailDialog` コンポーネントをimportして配置している。 | ❌ | technical_review |
| 73 | day13 | Step 2のパラメータ表にoffsetが記載されていない。実際のtRPCルーターでは `offset: z.number().min(0).default(0)` が定義されている。ページネーション実装時に混乱する可能性がある。 | ❌ | technical_review |
| 74 | day13 | Step 5でTaskCardを`@/component/task/task-card`からimportしているが、このコンポーネントがいつ・どのDayで作成されたのか一切説明がない。初心者は「このファイルは存在するの？」と疑問に思う。 | ❌ | ux_review |
| 75 | day13 | `handleEdit` と `handleDelete` のシグネチャが TaskCardProps と一致していない。 | ❌ | po_decision |
| 76 | day13 | Step 5の props 表が実際の TaskCardProps と不一致で、`assignee` の構造説明が誤っている。 | ❌ | po_decision |
| 77 | day13 | Step 2のパラメータ表に `offset` が欠けており、API仕様の説明が不完全。 | ❌ | po_decision |
| 78 | day14 | Step 8のhandleSubmitで、実際のコード（page.tsx:143-145）にある `if (!session?.user?.id) { return; }` のセッションチェックが省略されている。また `const { data: session } = api.auth.getSession.useQuery()` も示されていない。セッション未確認での作成リクエストはセキュリテ | ❌ | technical_review |
| 79 | day14 | Step 8のコードで `projects` をTaskDialogに渡しているが、`const { data: projects } = api.project.getAll.useQuery()` の取得コードが示されていない。Day 13で実装済みの可能性はあるが、Step 8のコードだけを見た学習者は `projects` がどこから来るのか分からない。 | ❌ | technical_review |
| 80 | day14 | task-dialog.tsxの完成形コードが一度も表示されない。9つのステップで断片的にコードを追加するが、最終的な全体像を確認する手段がなく、初心者が間違った位置にコードを配置しても気づけない。 | ❌ | ux_review |
| 81 | day14 | Step 8で `api.search.getProjectMembers.useQuery()` が突然登場するが、このAPIがいつ作られたか、どのDay で実装したかの説明がない。初心者は『このAPIは自分のプロジェクトにあるのか？』と混乱する。 | ❌ | ux_review |
| 82 | day14 | Step 8 の送信処理でセッション確認が省略されており、実コードとの整合性がない。 | ❌ | po_decision |
| 83 | day14 | `api.search.getProjectMembers.useQuery()` が突然登場し、どこで実装した API か分からない。 | ❌ | po_decision |
| 84 | day14 | Step 8 の `page.tsx` 追加コードは `useState` などの前提 import や、どの位置に差し込むかの説明が不足している。 | ❌ | po_decision |
| 85 | day15 | Step 2のhandleEditで日付変換やTaskFormData変換をインラインで行っているが、実際のコードベースでは `taskToFormData` ユーティリティ関数（src/lib/task-form.ts）を使っている。実コード: `setEditingTask(taskToFormData(task))` の3行のみ。教材がインライン実装を教えると、既存のユーティリティ関数と矛盾 | ❌ | technical_review |
| 86 | day15 | Step 4のAPI比較表で `title` がupdateで「任意」と記載されている。実際のtaskUpdateSchema(task.ts:30)では `z.string().min(1).optional()` で確かにoptionalだが、handleSubmit(page.tsx:133)では常にtitleを渡している。初心者に「titleは任意」と伝えると、titleを省略してAPIを | ❌ | technical_review |
| 87 | day15 | Step 4 の else 分岐がコメントだけで、create 処理の実コードが欠落している。品質ルールの省略禁止にも抵触する。 | ❌ | po_decision |
| 88 | day15 | Step 2 の handleEdit が実コードと異なり、taskToFormData ユーティリティを使わずインライン変換している。 | ❌ | po_decision |
| 89 | day15 | Step 4 の API 比較表が初心者に誤解を与える。title の optional 性と実装上の常時送信が切り分けられていない。 | ❌ | po_decision |
| 90 | day16 | Step 4のcatchブロックで `catch (_error)` と書かれているが、実際のコードベースでは `catch (err)` を使い、`err instanceof Error ? err.message : 'タイマーの更新に失敗しました'` としている。教材のコードは単に `toast.error('タイマーの更新に失敗しました')` とだけ書いており、実際のエラーメッセージ処理 | ❌ | technical_review |
| 91 | day16 | Step 7のhandleSubmitのcatchブロックも同様に `catch (_error)` で、実コードの `catch (err)` + `err instanceof Error` パターンと異なる。 | ❌ | technical_review |
| 92 | day16 | Step 5のJSXで実際のコード（task-timer.tsx:84-117）にはタイマー動作中のLoading状態表示（Loader2 + animate-spin）が含まれているが、教材のコードではこの三項演算子による分岐が省略されている。実装時にisPending中のローディングアイコン表示がなくなる。 | ❌ | technical_review |
| 93 | day16 | Step 5のButton要素に `aria-label` と `data-testid` 属性が欠落している。実コードでは `aria-label={isTimerActive ? 'タイマー停止' : 'タイマー開始'}` と `data-testid` が付与されている。 | ❌ | technical_review |
| 94 | day16 | Step 1がAPI呼び出しコード（updateMutation.mutate）だけで、ステータスを変更するためのUI（ドロップダウンやボタン）の実装がありません。初心者はこのコードをどこに書き、何がトリガーになるのか分かりません。 | ❌ | ux_review |
| 95 | day16 | Step 1 が API 呼び出し断片だけで、どの UI から発火するのか不明。初心者は配置場所を判断できない。 | ❌ | po_decision |
| 96 | day16 | Step 4 と Step 7 の catch が `catch (_error)` になっており、実コードの `catch (err)` + `err instanceof Error` パターンと不一致。未使用変数のアンダースコア回避禁止にも抵触する。 | ❌ | po_decision |
| 97 | day16 | Step 5 の TaskTimer JSX から、実コードにある `Loader2` による isPending 表示が落ちている。 | ❌ | po_decision |
| 98 | day16 | Step 5 の Button に `aria-label` と `data-testid` がなく、実コードのアクセシビリティ・テスト属性が欠落している。 | ❌ | po_decision |
| 99 | day17 | handleEditが手動でTaskFormDataを構築しているが、実際のコードは `taskToFormData()` ユーティリティ関数（`@/lib/task-form`）を使用。教材Step 8のhandleEdit実装は約20行のスプレッド構文を書いているが、実コードは `setEditingTask(taskToFormData(task))` の1行。学習者が教材通りに書くと重複コ | ❌ | technical_review |
| 100 | day17 | STATUS_TABSの構築方法が実コードと異なる。教材ではラベルをハードコードしているが、実際のコードは `ACTIVE_STATUSES` 配列 + `TASK_STATUS_LABELS` マップから動的に生成。これにより実コードではCANCELLED/BLOCKEDを除外する意図が明確だが、教材版では4つだけ手書きした理由が不明。 | ❌ | technical_review |
| 101 | day17 | Tabs の `onValueChange` にtype guardがない。実際のコードは `(v) => { if (v === 'all' \|\| isTaskStatus(v)) setActiveTab(v) }` と型ガードを使用しているが、教材では `onValueChange={setActiveTab}` と直接渡している。TypeScript規約で型安全性が必須なプロジェクトで、` | ❌ | technical_review |
| 102 | day17 | useState の型が不正確。教材では `useState<string>('all')` としているが、実コードは `useState<TaskStatus \| 'all'>('all')`。string型では型安全性が失われ、任意の文字列がsetActiveTabに渡せてしまう。 | ❌ | technical_review |
| 103 | day17 | ローディング状態の処理が完全に欠落。実際のコードは `isCurrentUserLoading` と `isLoading` を使って `PageLoadingSpinner` を表示する。教材では `isLoading` を取得しているが使用していない。 | ❌ | technical_review |
| 104 | day17 | 実コードでは `TaskGroupSection` を独立したコンポーネントとして抽出している（interface定義 + 関数コンポーネント）が、教材ではインラインでJSXを書いている。コンポーネント抽出は重要なReactパターンであり、4つのグループで同じJSXを繰り返すのは冗長。 | ❌ | technical_review |
| 105 | day17 | 全9ステップが同じファイル（page.tsx）を段階的に構築するが、各コードブロックがファイル内のどこに配置されるか（import文の後、コンポーネント関数の中、return文の中等）の説明がない。初心者は断片的なコードをどう組み合わせるか分からない。 | ❌ | ux_review |
| 106 | day17 | ローディング状態の処理が欠落しており、実コードのUXパターンが学べない。 | ❌ | po_decision |
| 107 | day17 | 編集処理が手動で `TaskFormData` を組み立てており、既存ユーティリティ `taskToFormData()` を使っていない。 | ❌ | po_decision |
| 108 | day17 | ステータスタブの構築がハードコードで、実コードの定数管理方針が反映されていない。 | ❌ | po_decision |
| 109 | day18 | Step 2 の「taskDetail.comments の構造」テーブルで user.avatar の型を string? としているが、USER_SELECT は { id, name, email, avatar } を返し、Prisma の avatar フィールドは String?（null許容）である。また user.email フィールドが構造テーブルに記載されていないが、実際のコー | ❌ | technical_review |
| 110 | day18 | Step 4で `useState` を使用しているが、Reactからのimport文が示されていない。初心者はuseStateがどこから来るか分からない。 | ❌ | ux_review |
| 111 | day18 | Step 5で `utils` を使っているが、`const utils = api.useUtils();` の宣言がどこにも示されていない。初心者は utils が何か分からない。 | ❌ | ux_review |
| 112 | day18 | `useState` や `utils` の import・宣言が不足しており、初心者がそのまま写経できない。 | ❌ | po_decision |
| 113 | day19 | ドラフトでは confirm() によるブラウザネイティブ確認ダイアログを使用しているが、実際のコードベースでは DeleteConfirmDialog コンポーネント + deleteCommentDialogOpen / deleteCommentTargetId の state 管理パターンを使用している。コードベースの既存パターンと矛盾する。 | ❌ | technical_review |
| 114 | day19 | ドラフトでは utils.task.getById.invalidate({ id: selectedTask }) を使用しているが、TaskDetailDialog 内では props として受け取る taskId を使用する（utils.task.getById.invalidate({ id: taskId })）。selectedTask は page.tsx の state であり、T | ❌ | technical_review |
| 115 | day19 | 実際のコードベースでは updateCommentMutation.isPending による disabled 制御と「更新中...」テキスト表示があるが、ドラフトでは完全に省略されている。二重送信を防ぐ重要なUXパターンが教材から欠落している。 | ❌ | technical_review |
| 116 | day19 | ドラフトの handleSaveEdit では updateCommentMutation.mutate({ id: commentId, content: editingCommentContent }) としているが、実際のコードでは content: editingCommentContent.trim() と trim() を適用している。サーバー側で trim() されるとはいえ、クライ | ❌ | technical_review |
| 117 | day19 | Step 4 で <Textarea> コンポーネントを使用しているが、そのインポート文がどのステップにも存在しない。学習者はどこから Textarea をインポートすべきか分からない。 | ❌ | technical_review |
| 118 | day19 | Step 3の最初のコードブロック（importのみ）、Step 4の1番目・2番目のコードブロックの直後に確認ポイントがない。品質ルールでは「全コードブロック直後に確認ポイント」が必須。 | ❌ | ux_review |
| 119 | day19 | updateCommentMutation と deleteCommentMutation に onError ハンドラがない。API呼び出しが失敗した場合、ユーザーには何も表示されない。初心者は「押したのに何も起きない」状態に陥る。 | ❌ | ux_review |
| 120 | day19 | Textarea を使っているのに import 指示がない。 | ❌ | po_decision |
| 121 | day20 | Step 6 で `confirm('このタスクを削除してもよろしいですか？')` を使用しているが、実際の検索ページでは `DeleteConfirmDialog` コンポーネントを使用している。学習者がこの教材通りに実装するとブラウザネイティブダイアログになり、アプリ全体のUXと一貫しない。 | ❌ | technical_review |
| 122 | day20 | 冒頭の「やること / やらないこと」表で「プロジェクト結果表示」をやると宣言しているが、Step 6 ではタスク結果の表示コードしかない。`searchResults.projects` の表示コードが一切存在しない。 | ❌ | technical_review |
| 123 | day20 | TypeScript規約で完全禁止されている `as` アサーションが使われている：`(searchParams.get('status') as 'all' \| TaskStatus)`、`(searchParams.get('priority') as 'all' \| TaskPriority)`。教材でアンチパターンを教えることになる。 | ❌ | ux_review |
| 124 | day20 | 複数のコードブロックに日本語コメントがない。特にimport文のブロック、JSXのブロックにコメントが不足している。ルールでは全コードブロックに日本語コメントが必須。 | ❌ | ux_review |
| 125 | day21 | Step 2で `ArrowRight`, `CardHeader`, `CardTitle` をインポートしているが、Day 21の教材内でこれらは一切使用されない。未使用インポートはBiomeのlintエラーになり、学習者がそのままコピペするとビルドエラーまたはlint警告が出る。 | ❌ | technical_review |
| 126 | day21 | Step 5でタスク数の表示に `{tasks?.length \|\| 0}` を使用しているが、実際のコードでは `{tasks?.length ?? 0}` を使用している。`\|\|` は `0` も falsy として扱うため、タスクが0件の場合に意味的に異なる動作をする可能性がある（この場合は結果的に同じだが、パターンとして `??` が正しい）。教材の他の箇所（Step 4のreduce）で | ❌ | technical_review |
| 127 | day21 | Step 6「レスポンシブ対応」にコード変更が一切なく、Step 5で既に設定済みのグリッドクラスの確認だけ。ステップとして独立させる意味が薄く、「1ステップ = 3〜7分」の品質基準に対して実質的な作業内容がない。 | ❌ | technical_review |
| 128 | day21 | Step 2の1つ目のコードブロック（import文）、Step 4の1つ目のコードブロック（totalTimeSpent/averageTimePerTask）、Step 5の1〜3つ目のコードブロックに確認ポイントがありません。品質ルールでは「全コードブロック直後に確認ポイント」が必須です。 | ❌ | ux_review |
| 129 | day21 | Step 2の両コードブロック、Step 3のコードブロック内に日本語コメントがほぼありません。import文やJSX構造に対する日本語説明が不足しています。 | ❌ | ux_review |
| 130 | day21 | Step 2で ArrowRight, Link, CardHeader, CardTitle をインポートしていますが、Day 21のどのコードブロックでも使用されていません。初心者は「これはどこで使うの？」と混乱します。 | ❌ | ux_review |
| 131 | day21 | `ArrowRight`, `CardHeader`, `CardTitle` など、Day 21 で使わないインポートが含まれている。 | ❌ | po_decision |
| 132 | day21 | `tasks?.length \|\| 0` を使っており、同教材内の `?? 0` パターンとも不統一。 | ❌ | po_decision |
| 133 | day21 | 実コード準拠の重要箇所と品質ルール違反が同時に存在しており、部分修正では整合性が崩れやすい。現状は『直せば使える』ではなく『再構成が必要』な状態。 | ❌ | po_decision |
| 134 | day22 | 実コード（report/page.tsx:31）では `const CHART_FALLBACK_COLOR = '#9e9e9e'` を定義し、Cell の fill で使用しているが、教材では直接 `?? '#9e9e9e'` とハードコードしている。実コードと乖離しており、マジックナンバーのハードコードという悪い慣習を教えることになる。 | ❌ | technical_review |
| 135 | day22 | 教材の Day 21 振り返りで「期限超過」統計カードに言及しているが、実コード（report/page.tsx:125-153）の4枚のカードは「タスク数・完了率・合計作業時間・平均作業時間/タスク」であり「期限超過」カードは存在しない。 | ❌ | technical_review |
| 136 | day22 | フォールバック色をハードコードしており、実コードと設計方針がズレている。 | ❌ | po_decision |
| 137 | day22 | Day 21 の振り返り内容と Day 23 の予告が、実際の report/page.tsx の内容と一致していない。 | ❌ | po_decision |
| 138 | day22 | 全体ルールでは `@/components/ui/*` を必須としている一方、技術レビューでは実コードが `@/component/ui/*` とされており、教材方針と実装実態の整合確認が必要。 | ❌ | po_decision |
| 139 | day23 | Step 2: 教材のprojectStats戻り値に `id` プロパティがない。実コード（report/page.tsx:82行目）では `id: project.id` を含んでおり、Step 3のTableRow で `key={stat.name}` としているが、実コードでは `key={stat.id}` を使用。nameが重複した場合にReactのkey警告が出る。 | ❌ | technical_review |
| 140 | day23 | Step 5: 週次レポートページのインポートに `Loader2` が含まれているが、実コードでは使用されていない（PageLoadingSpinnerを使用）。また、`date-fns` と `ja` ロケールのインポートが教材に欠如している。実コードのインポートリストと大幅に乖離。 | ❌ | technical_review |
| 141 | day23 | Step 4: APIレスポンスの weeklyData.week の説明で「'Week 1' のような週ラベル」と記載しているが、実際のAPIコード（report.ts:61行目）では `${i + 1}週目` という日本語ラベルを返す。 | ❌ | technical_review |
| 142 | day23 | Step 4のAPIパラメータ説明で `userId` の型を `string` としているが、実コード（report.ts:14行目）では `z.string().cuid()` でCUID形式のバリデーションがかかっている。また、教材では触れていないが、他ユーザーのデータ閲覧には管理者権限チェック（FORBIDDEN）がある。教育的にはこの権限チェックの存在を言及すべき。 | ❌ | technical_review |
| 143 | day23 | Step 5のローディング処理で、`<AppLayout>` 内に `<div className='flex justify-center items-center min-h-[60vh]'>` でスピナーを表示しているが、実コードではAppLayoutの外で `<PageLoadingSpinner />` を返している。教材方式ではサイドバーが表示された状態でスピナーが出るが、実コードでは | ❌ | technical_review |
| 144 | day23 | Step 2のコードをpage.tsxの「どこに」追加するのか指示がない。既存のpage.tsxにはDay 21・22で追加したコードがあるはず。初心者は『このコードはファイルのどの位置に書くの？』と迷う。Step 3のimport追加も、既存importの後に追加するのか、置き換えるのか不明。 | ❌ | ux_review |
| 145 | day23 | Step 5でisLoadingの処理はあるがisErrorの処理がない。API呼び出しが失敗した場合、画面が真っ白になる。初心者がネットワーク問題やDB未起動で遭遇しやすいシナリオなのに対処法がない。 | ❌ | ux_review |
| 146 | day23 | Step 4のAPI説明が実装とずれている。weekラベルが英語表記、userId の CUID 制約や権限制約の説明がない。 | ❌ | po_decision |
| 147 | day24 | 教材のインポート文に `Shield, User` が含まれている（Step 2）が、実際のコードでは `Shield, User` アイコンはインポートしていない（UserRoleBadgeコンポーネント内部で使用するため、page.tsx側では不要）。教材通りにインポートするとBiomeが未使用importとしてエラーを出す。 | ❌ | technical_review |
| 148 | day24 | 教材にはBadgeのインポート（Step 2の2番目のブロック）があるが、実際のコードではpage.tsx内でBadgeを直接使用していない（UserRoleBadge/ActiveStatusBadge経由で使用）。未使用importになる。 | ❌ | technical_review |
| 149 | day24 | Step 1で `cat src/server/api/routers/user.ts \| head -30` を実行させているが、教材は「2つのAPIの役割を理解する」ステップなのに、実際のコード出力の説明がない。head -30 で何が見えるか、学習者には想像できない。また確認ポイントが2回重複している。 | ❌ | technical_review |
| 150 | day24 | 実際のコードには「ユーザーが見つかりませんでした」の空状態表示（134-138行目）があるが、教材ではこれに一切触れていない。学習者が完成コードとの差分に困惑する。 | ❌ | technical_review |
| 151 | day24 | 実際のコードにはページタイトル「ユーザー管理」の表示部分（64-66行目）があるが、教材のどのステップでもこの部分を実装していない。 | ❌ | technical_review |
| 152 | day24 | Step 1で `cat src/server/api/routers/user.ts \| head -30` というコマンドを使っています。パイプ（\|）やhead コマンドは初心者には馴染みがなく、「APIの確認」という目的に対して手段が高度すぎます。 | ❌ | ux_review |
| 153 | day24 | Step 2「ページの土台を作る（3分）」に6つのコードブロックがあり、import文、データ取得、useEffect、ローディング表示と内容が多すぎます。3分では到底終わりません。 | ❌ | ux_review |
| 154 | day24 | 実コードにあるページタイトル「ユーザー管理」と空状態表示が教材に含まれておらず、完成コードとの差分が学習者にとって不明瞭です。 | ❌ | po_decision |
| 155 | day24 | 教材の import に `Shield`、`User`、`Badge` が含まれていますが、実コード準拠に直すと page.tsx では未使用になります。 | ❌ | po_decision |
| 156 | day25 | プロフィールページのローディング表示が実際のコードと異なる。実際のコード(line 29)は `return <PageLoadingSpinner />;` を使用しているが、教材Step 2ではインラインで `<AppLayout><div className='container...'><div className='animate-spin...' /></div></AppLayout | ❌ | technical_review |
| 157 | day25 | Step 7のchange-passwordページのAlertTitle が `<AlertTitle>Error</AlertTitle>` となっているが、実際のコード(line 119)は `<AlertTitle>エラー</AlertTitle>` と日本語で記述されている。教材全体が日本語UIを前提としているため不整合。 | ❌ | technical_review |
| 158 | day25 | 実際のchange-password/page.tsx(lines 110-113)には、確認パスワード入力中にリアルタイムで不一致を表示する機能がある: `{formData.confirmPassword !== '' && formData.newPassword !== formData.confirmPassword && (<p className='text-sm text-dest | ❌ | technical_review |
| 159 | day25 | Step 10のインポートブロックに65文字を超える行が複数ある。例: `import { Alert, AlertDescription, AlertTitle } from '@/component/ui/alert';` は72文字。PDF変換時に行が切れる。 | ❌ | technical_review |
| 160 | day25 | 「新しく学ぶ概念」テーブルに `showPassword`（パスワード表示状態）と `Eye / EyeOff`（パスワード可視トグル）が含まれているが、実際のコードではこれらは PasswordInput コンポーネント内にカプセル化されており、ページレベルでは使用しない。学習者がページコンポーネント内でこれらを直接扱うと誤解する。 | ❌ | technical_review |
| 161 | day25 | Step 10の最初のコードブロック（インポート部分）に65文字超の行が複数ある。例：'import { Alert, AlertDescription, AlertTitle } from "@/component/ui/alert";'（約72文字）、'import { Card, CardContent, CardHeader, CardTitle } from "@/component/u | ❌ | ux_review |
| 162 | day25 | プロフィール関連のディレクトリ構造（src/app/profile/、src/app/profile/edit/、src/app/profile/change-password/）がtree形式で一度も示されていない。初心者はファイルをどこに作成すべきか分からない。 | ❌ | ux_review |
| 163 | day25 | プロフィールページのローディング表示が実コードの `PageLoadingSpinner` ではなく手書きスピナーになっている。 | ❌ | po_decision |
| 164 | day25 | change-password の確認パスワード不一致を、実コードにあるリアルタイム表示ではなく submit 時の toast のみで扱っている。 | ❌ | po_decision |
| 165 | day25 | AlertTitle が `Error` になっており、日本語UI・実コードの `エラー` と不一致。 | ❌ | po_decision |
| 166 | day25 | profile 配下のディレクトリ構造が tree 形式で示されておらず、ファイル配置が分かりにくい。 | ❌ | po_decision |
| 167 | day26 | Step 5のBiome lintコマンドが`npx biome check src/app/dashboard/page.tsx`となっているが、package.jsonでは`npm run lint`が`biome check .`に設定されている。npxでも動くが、教材として一貫性がない。また修正確認も`npx biome check`を使っており、Step 7では`npm run lint | ❌ | technical_review |
| 168 | day26 | Step 4のバグBで、演習用コードに`fetchTasks`という関数が登場するが、実際のtask-appではtRPC（`api.task.getAll.useQuery()`）を使用している。tRPCのuseQueryは内部的にReact Queryを使っており、useEffect+fetchパターンは使わない。初心者がこの演習を実際のコードに適用しようとした時に混乱する可能性がある。 | ❌ | technical_review |
| 169 | day26 | スクリーンショット位置指定が2箇所（しかも同じ画像 error-page.png の再利用）しかなく、品質ルールの「1日3箇所以上」を満たしていない。Step 6の📸テキスト参照は画像タグではなく、正式なスクリーンショット指定になっていない。デバッグ演習はビジュアル確認が特に重要なテーマであり、Console/Network/Elementsタブの実際の画面が見えないと初心者は何を見ればいいかわか | ❌ | ux_review |
| 170 | day26 | Step 1で『エラーが発生しました画面が表示される』と書いているが、開発モードではNext.jsのエラーオーバーレイが優先され、説明と実際の挙動がずれる。 | ❌ | po_decision |
| 171 | day26 | BiomeのnoConsoleルールの深刻度を『警告』と説明しているが、設定上はerrorであり、実行結果と教材説明が食い違う。 | ❌ | po_decision |
| 172 | day26 | Step 4の演習がuseEffect + fetchTasksで、実プロジェクトのtRPC useQueryパターンと乖離しているため、初心者が実コードとの関係を誤解しやすい。 | ❌ | po_decision |
| 173 | day27 | isProjectMemberRole, PROJECT_MEMBER_ROLE_LABELS, PROJECT_MEMBER_ROLE, getStatusBadgeVariant, getPriorityBadgeVariant, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, assertMemberPermission が使われていますが、これらがどこで | ❌ | ux_review |
| 174 | day27 | Step 1で `prisma/schema.prisma` と `src/server/api/routers/project.ts` の2ファイルを扱っている。 | ❌ | po_decision |
| 175 | day28 | Step 5 のコード例で `{/* Step 6, 7, 8 でボタンを追加 */}` というプレースホルダーが `<>...</>` の中にあるが、実際のコード（219-264行目）ではヘッダー構造が `<div className="flex flex-col gap-6">` で包まれた中に `<div className="flex items-center justify-betwee | ❌ | technical_review |
| 176 | day28 | Step 7 で「ページ最下部（AppLayout の外側）に DeleteConfirmDialog を配置します」と書いてあるが、実コード（361-380行目）では `DeleteConfirmDialog` は `</AppLayout>` の閉じタグの前（`</div>` の直後、AppLayout内部）に配置されている。実コードでは AppLayout の子要素の `<div class | ❌ | technical_review |
| 177 | day28 | Step 4.5 のコード例と実コード（199-206行目）の `selectAllState` 定義は論理的には同一だが、実コードでは改行位置やインデントが微妙に異なる。教材のコードでは条件式がやや整形されているものの問題はない。しかしより重要な点として、教材では「isAllSelected を削除して、以下に置き換える」と指示しているが、Step 4 で定義した `isAllSelected` | ❌ | technical_review |
| 178 | day28 | Step 7 の説明で DeleteConfirmDialog を「AppLayout の外側」としているが、実コードでは AppLayout 内部の末尾に配置されている。 | ❌ | po_decision |
| 179 | day28 | Step 5 のコード例が実コードの外側ラッパー構造を十分に示しておらず、配置場所の誤解を招く可能性がある。 | ❌ | po_decision |
| 180 | day28 | 原稿内で `@/component/ui/...` や `@/component/task/...` という import が使われているが、品質ルールでは `@/components/ui/*` が必須とされている。単なる表記ゆれでなく、学習者がそのまま写経すると import エラーになる可能性がある。 | ❌ | po_decision |
| 181 | day29 | Step 6の権限テーブルで「一般ユーザー + 他人のプロフィール → ボタン表示されない」と記述されているが、実際のgetById（user.ts:80）はctx.session.userId !== input.id && ctx.session.role !== USER_ROLE.ADMINの場合FORBIDDENを投げる。つまり一般ユーザーは他人の詳細ページ自体にアクセスできず、「ボタン | ❌ | technical_review |
| 182 | day29 | 冒頭のMermaid図で「管理者 or 本人？ →No→ 閲覧のみ」というパスが描かれているが、getByIdのサーバー側権限チェックにより、管理者でも本人でもないユーザーはそもそもデータを取得できない。「閲覧のみ」という状態は実際には発生しない。 | ❌ | technical_review |
| 183 | day29 | 「🤔 なぜこれを作るのか？」セクションで「このユーザーって誰？を確認したくなります」と一般的なユースケースを示しているが、getByIdは本人またはADMINのみアクセス可能。一般ユーザーが「他のユーザーの情報を確認する」ことはできない設計。教材の動機づけと実際の権限モデルが矛盾している。 | ❌ | technical_review |
| 184 | day29 | 複数のコードブロックで import パスが '@/component/...' になっているが、プロジェクト標準は '@/components/...' の可能性が高く、ドラフト全体で再確認が必要。レビューでは『実コードベースと一致』とあるため一律断定はしないが、教材公開前に最終照合が必要。 | ❌ | po_decision |
| 185 | day30 | Step 3 の Vercel デプロイ手順が Vercel CLI ではなく GUI ベースの説明になっており、「Vercel ダッシュボードにログイン → Settings → Environment Variables」という手動 UI 操作を要求している。これは Zero User Burden 原則に反する形ではないが、教材として CLI 手順も併記すべき。また、Vercel アカウント | ❌ | technical_review |
| 186 | day30 | ローカル DB 準備と本番デプロイの関係説明が弱く、学習者が『Docker の DB をそのまま Vercel で使う』と誤解しやすい。 | ❌ | po_decision |

### Minor（98件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | 「今日学ぶこと」の表でPrismaを「TypeScriptからデータベースを操作するツール」と説明し、例え話を「冷蔵庫の中身を整理する収納ケース」としているが、Step 10のPrisma説明では「TypeScriptからデータベースを操作するツール（ORM）」とORM表記が追加されている。初出時にORM表記がないため、Step 10で突然ORMが出てくる。 | ❌ | technical_review |
| 2 | day01 | Step 4の `cd ~/Desktop` はMac前提のパスだが、Windows（WSL2でない場合）やLinuxでは `~/Desktop` が存在しない場合がある。Step 1ではWindows PowerShell向けの手順も用意しているのに、Step 4ではMac前提のパスのみ。 | ❌ | technical_review |
| 3 | day01 | Step 9のコード解説表で `docker compose ps` の表示項目に `0.0.0.0:5432->5432/tcp` と記載しているが、実際のdocker-compose.ymlではポートが `${_DOCKER_COMPOSE_HOST_PORT_DB:-5432}:5432` と変数参照になっている。.envで_DOCKER_COMPOSE_HOST_PORT_DBが5432に | ❌ | technical_review |
| 4 | day01 | Step 8で `.env` ファイルの `JWT_SECRET` に `please-change` と書いてあるが、開発環境ではこのまま使ってよいのか変更が必要なのか初心者には判断できない。 | ❌ | ux_review |
| 5 | day01 | Step 3のDocker Desktopインストール手順が「公式サイトからダウンロードし、インストーラーを実行してください」の1文だけ。Docker Desktopは初回起動時にWSL2の設定（Windows）やシステム権限の許可（Mac）が必要で、初心者がここで詰まりやすい。 | ❌ | ux_review |
| 6 | day01 | Step 10の `npm run db:seed` の成功メッセージが「Seed completedのようなメッセージ」と曖昧。実際に何が表示されるか不確実だと、初心者は成功したのか不安になる。 | ❌ | ux_review |
| 7 | day02 | Step 1で「先頭部分を確認しましょう」と言いつつ、確認ポイントに「importでCardやBadgeを読み込んでいることが確認できた」とあるが、Step 2-3で新たにimportを追加する手順がない。実際のdashboard/page.tsxには既にCard, CardHeader, CardTitle, CardContentのimportが存在するため問題はないが、チュートリアルとして「 | ❌ | technical_review |
| 8 | day03 | Step 5の`git branch -M main`は、create-next-appで作成したプロジェクトではデフォルトブランチが既に`main`であるため冗長。エラーにはならないが、「なぜこのコマンドが必要なのか」が初心者に伝わらない。 | ❌ | technical_review |
| 9 | day04 | next.config.mjsにContent-Security-Policyヘッダーが設定されており、connect-src が 'self' のみ。Neonへの外部DB接続はサーバーサイドなので問題ないが、もし学習者が将来的に外部APIを叩く場合にCSPでブロックされる可能性がある。Day04の範囲では直接問題にならないが、デプロイ後に「なぜか外部APIが呼べない」問題の伏線となりうる。 | ❌ | technical_review |
| 10 | day04 | Step 3で接続文字列を「メモ帳にコピー」と案内しているが、パスワードを含む文字列をプレーンテキストで保存するリスクへの注意が薄い。また、Gitにコミットしないよう明示的に警告していない。 | ❌ | ux_review |
| 11 | day04 | 環境変数適用がビルド後のように見える図になっており、実際の順序とずれている。 | ❌ | po_decision |
| 12 | day05 | Step 1で`Button`, `Input`, `Label`をimportしているが、Step 1のJSX内ではいずれも使用していない。Biome/ESLintの未使用import警告が出るため、初心者が混乱する可能性がある。 | ❌ | technical_review |
| 13 | day05 | ドラフトのonSubmit関数はsync（`const onSubmit = (data: LoginFormData) => {`）だが、実際のコードベースではasync（`const onSubmit = async (data: LoginFormData) => {`）。mutate()は同期的なのでsyncでも動作するが、実コードとの不一致は教材の信頼性を損なう。 | ❌ | technical_review |
| 14 | day05 | 「やること / やらないこと」テーブルに「サーバー側の認証処理（Day 7）」と記載があるが、Day 7のタイトルは「ログイン体験を改善しよう」。サーバー側の認証処理がDay 7の内容と一致するか要確認。実際のauth.tsにはサーバー側の認証ロジックが既に存在しており、Day 5で呼び出しているため、「サーバー側の認証処理」は既に暗黙的にカバーされている。 | ❌ | technical_review |
| 15 | day05 | Step 1 で Button、Input、Label を import しているが未使用。 | ❌ | po_decision |
| 16 | day05 | `onSubmit` が sync だが、実コードは async。 | ❌ | po_decision |
| 17 | day06 | Step 8 の CardHeader 更新コードで `bg-secondary` を使用していますが、実際のコードベースでログイン画面は `bg-primary` を使用しています。登録画面の実コードは `bg-secondary` なので正しいのですが、Day 05 のログイン画面との違いに言及がなく、初心者が「なぜ色が違うのか？」と疑問に思う可能性があります。 | ❌ | technical_review |
| 18 | day06 | Step 7 の import に `useState` がありますが、実際には Step 7 ではなく Step 8（もしくはそれ以前）で error state を使います。また `useRouter` と `useState` は Step 7 で初めて追加するように見えますが、Step 3 では useForm だけが使われており、このギャップが分かりにくいです。 | ❌ | technical_review |
| 19 | day06 | Step 1 の最初のコードブロックに日本語コメントが1行目の `// クライアントコンポーネント宣言とimport` のみで、import 文自体にはコメントがありません。品質ルールでは「日本語コメント必須（コード内に日本語説明）」とされています。 | ❌ | technical_review |
| 20 | day06 | 次回予告で「JWT（ジェイ・ダブリュー・ティー）というトークンを使った認証の仕組み」と書かれていますが、このプロジェクトはNextAuth v4ベースのセッション認証を使用しており、JWTを直接使うかはNextAuthの設定次第です。Day 07 の内容が実際にJWTを扱うかどうか確認が必要です。 | ❌ | technical_review |
| 21 | day06 | Step 7の onSubmit 関数に async キーワードがありません。実際のソースコード（src/app/register/page.tsx:52）では `const onSubmit = async (data: RegisterFormData) => {` と定義されています。教材と実コードの不一致は、学習者が実際のコードを参照した際に混乱する原因になります。 | ❌ | ux_review |
| 22 | day06 | 8つのステップで部分的にコードを追加していきますが、最終的な完成ファイルの全体像が示されていません。初心者は「自分が書いたコードが正しいかどうか」を確認する手段がなく、特にimport文の順序や各セクションの配置位置で迷いやすいです。 | ❌ | ux_review |
| 23 | day06 | Step 7では3つの異なる操作（import追加、mutation定義追加、onSubmit書き換え）を1ステップで行っています。特に「onSubmit を更新します」は既存コードの置き換えであり、初心者が「どこを消してどこに新しいコードを入れるのか」がわかりにくいです。 | ❌ | ux_review |
| 24 | day06 | 次回予告で「JWT（ジェイ・ダブリュー・ティー）というトークンを使った認証の仕組みと、サーバー側の処理を理解します」とありますが、Day 07のタイトルが「ログイン体験を改善しよう」であれば内容が食い違う可能性があります（git statusにday07のファイル名が見える）。 | ❌ | ux_review |
| 25 | day06 | 次回予告の JWT 説明が Day 07 の実内容と一致しない可能性があります。 | ❌ | po_decision |
| 26 | day07 | Step 1でtRPCのエラーレスポンスを `{"error":{"message":"..."}}` と示しているが、実際のtRPC（superjsonトランスフォーマー使用）はより複雑な構造（配列ラップ、codeフィールド、dataフィールド等）で返す。学習者がDevToolsで実際のレスポンスを見たとき、ドラフトの説明と異なる構造に戸惑う可能性がある。 | ❌ | technical_review |
| 27 | day07 | Step 1のbashコードブロックの `# filepath: DevTools Networkタブで確認する内容` は実際のファイルパスではなく、品質チェックルール（全コードブロックにfilepath:コメント必須）の趣旨に合致しない。これはコードではなく観察手順のメモであり、コードブロックとして表現すべきか疑問。 | ✅ | technical_review |
| 28 | day07 | Step 5の改善コードで `toast.success('...' + '\n今日もタスクを進めましょう 💪', { duration: 4000 })` としているが、react-hot-toastはHTML描画のため `\n` が改行として表示されない可能性が高い（CSSの `white-space` 設定に依存）。学習者が期待する2行表示にならず、1行にテキストが繋がって見える可能性がある | ❌ | technical_review |
| 29 | day07 | Step 3・Step 4のチャレンジでセキュリティ関連コード（JWT有効期限、sameSite設定）を変更させますが、「元に戻すのを忘れずに！」だけでは不安を感じる初心者がいます。戻し忘れた場合の影響が不明確です。 | ❌ | ux_review |
| 30 | day07 | Step 1 の tRPC エラーレスポンス例が簡略化されすぎており、実際の DevTools 表示との差で混乱を招く可能性がある。 | ❌ | po_decision |
| 31 | day08 | Step 7とStep 8の```bash```ブロックは実際のシェルコマンドではなく、ブラウザ操作の説明コメントです。`# filepath: ブラウザ`や`# filepath: ブラウザ（DevToolsで操作）`は`filepath:`規約の趣旨と合致せず、品質チェックスクリプトで誤検知の可能性があります。 | ✅ | technical_review |
| 32 | day08 | 教材全体でロール名を「管理者/メンバー」と表現していますが、実際のコードベースでは`USER_ROLE`は`ADMIN`/`USER`であり、`UserRoleBadge`の表示も「管理者」/「ユーザー」です。「メンバー」という表現はコードベースに存在しません（`ProjectMemberRole`の`MEMBER`とは別概念）。 | ❌ | technical_review |
| 33 | day08 | 「JWT認証・bcryptパスワード検証・HttpOnly Cookie」をDay 7の振り返りとして列挙しているが、Day 8の内容と直接関係するのはセッション（Cookie）のみ。初心者にとって不要な用語の羅列は認知負荷を高める。 | ❌ | ux_review |
| 34 | day08 | 教材では『メンバー』と書いているが、実コードのロール表現は『ユーザー』である。 | ❌ | po_decision |
| 35 | day09 | シーケンス図で `GET /api/trpc/project.getAll` と書いているが、tRPCのhttpBatchLinkを使用している場合、実際のURLは `/api/trpc/project.getAll?batch=1&input=...` のような形式になる。初心者に誤解を与える可能性がある。 | ❌ | technical_review |
| 36 | day09 | Step 4のProjectCard propsテーブルで `onClick` の型を `function` と記載しているが、正確には `(id: string) => void` である。onEdit、onDeleteも同様。 | ❌ | technical_review |
| 37 | day10 | 「前回の振り返り」でDay 09の内容を述べているが、tRPCの `useQuery` の説明にとどまっている。Day 09で `api` の import や TRPCProvider のセットアップがどこまで完了しているかが不明確で、Day 10の前提条件が曖昧。 | ❌ | technical_review |
| 38 | day10 | handleFormSubmit 内の条件付きスプレッド `...(data.description && { description: data.description })` は、description が空文字列 '' の場合に false と評価されるため、空文字列を送信できない。実コードでもこのパターンだが、教材として説明があると良い。 | ❌ | technical_review |
| 39 | day10 | インポートパスが `@/component/...` になっているが、品質ルールでは `@/components/ui/*` を前提としており、ディレクトリ規約の整合性が不明。 | ❌ | po_decision |
| 40 | day12 | Step 6のサーバー側コード例がスケルトン（`// ...`）になっており、実際の権限チェックロジック（assertMemberPermission）が省略されている。コード完全性ルールに抵触する可能性がある。 | ❌ | technical_review |
| 41 | day13 | Step 1で `useSearchParams` をimportしているが、チュートリアル内で一度も使用・説明されていない。実際のコードではURLパラメータからtaskIdを取得する機能で使っているが、Day 13の範囲では不要。 | ❌ | technical_review |
| 42 | day13 | Step 4のフィルタリング後のスクリーンショットがStep冒頭のタスク一覧と同じパス（task-list.png）を参照している。フィルタリング前後の違いが視覚的にわからない。 | ❌ | ux_review |
| 43 | day14 | 実際のコードではSelectTriggerに `aria-label` 属性が付与されている（例: `aria-label="ステータスを選択"`）が、ドラフトのStep 5・6のコードでは省略されている。アクセシビリティの観点から実コードと乖離がある。 | ❌ | technical_review |
| 44 | day14 | Step 8のJSXで `projects={projects \|\| []}` `users={users \|\| []}` と論理OR演算子を使っているが、実際のコード（page.tsx:354-355）では `projects={projects ?? []}` `users={users ?? []}` とnullish coalescingを使っている。TypeScript教材として??の使 | ❌ | technical_review |
| 45 | day14 | `\|\|` を使ったフォールバックが、実コードの `??` と一致していない。 | ❌ | po_decision |
| 46 | day15 | Step 6のTaskDialogコンポーネントで `projects={projects \|\| []}` と記載しているが、実際のコード(page.tsx:354)では `projects={projects ?? []}` を使用。`\|\|` と `??` はnullish coalescingの動作が異なり（`\|\|` はfalsy全般、`??` はnull/undefinedのみ）、TypeS | ❌ | technical_review |
| 47 | day15 | Step 5のDeleteConfirmDialogのJSX配置位置が不明確。実際のコード(page.tsx:361-370)では `</div>` の外側（AppLayoutの直下）に配置されている。教材ではどのJSX階層に配置するか明示していない。 | ❌ | technical_review |
| 48 | day15 | Step 2のhandleEditで `const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined;` としているが、task.dueDateの型は実際には `Date \| null`（Prismaの返り値）。`new Date(task.dueDate)` で Date | ❌ | technical_review |
| 49 | day15 | Step 4のnull vs undefinedの説明「`null` を渡すと値をクリアできます。`undefined` は「変更しない」を意味します」は概念的には正しいが、実際のhandleSubmitではdescription, dueDate, estimatedHours, assigneeIdに対して明示的にnullを渡しており、undefinedを使い分けていない。Prismaのupd | ❌ | technical_review |
| 50 | day15 | Step 6のTaskCardのpropsに関する補足「タイマー関連のoptional props（isTimerActive, timerStartedAt...）もあります」が唐突で、今関係ない情報が混在して混乱する。 | ❌ | ux_review |
| 51 | day15 | TaskDialog への props が projects \|\| [] / users \|\| [] になっており、教材としては ?? の方が正確。 | ❌ | po_decision |
| 52 | day16 | Step 6のTimeLogDialogの実コード（time-log-dialog.tsx）では、Input要素に `type="text"`, `placeholder="0"`, `disabled={addTimeMutation.isPending}` が設定されており、Labelに `className="text-sm font-medium mb-2 block"` があり、各Inp | ❌ | technical_review |
| 53 | day16 | Step 6のTimeLogDialogで、実コードではキャンセルボタンにも `disabled={addTimeMutation.isPending}` が設定されているが、教材には含まれていない。 | ❌ | technical_review |
| 54 | day16 | Prismaスキーマでは `timeSpentMinutes` は `Float` 型だが、教材のprops表やコード内では `number` として扱っている。TypeScript上は問題ないが、「分数」と言いつつFloat型であることの説明が欠けている（小数点以下の時間記録が可能であることの示唆）。 | ❌ | technical_review |
| 55 | day16 | Mermaid図のステータス遷移にBLOCKEDからの遷移パスが2つあるが、実際のアプリケーションコード上でBLOCKEDへの遷移やBLOCKEDからの遷移が制限されているかの検証がない。図は概念的に正しいが、実装で実際に制限がかかっていない場合、全ステータス間の遷移が可能であることを明示すべき。 | ❌ | technical_review |
| 56 | day16 | Step 2でLoader2をインポートしていますが、その後のコードで一度も使用されていません。初心者は「これいつ使うの？」と困惑します。 | ❌ | ux_review |
| 57 | day16 | catchブロックで(_error)とアンダースコアプレフィックスを使っています。これはTypeScriptルールの「未使用変数のアンダースコア回避禁止」に反する書き方を教材で教えることになります。 | ❌ | ux_review |
| 58 | day16 | TimeLogDialog の Input 属性、Label の className、ヘルプテキスト、キャンセルボタン disabled などが実コードより簡略化されている。 | ❌ | po_decision |
| 59 | day17 | Step 8 で `as TaskStatus` 型アサーションが使われている（Step 4のuseQuery内 `activeTab as TaskStatus`）。プロジェクトのTypeScript規約で `as` は `as const` 以外完全禁止。実際のコードではこのアサーションは使われていない（activeTabの型が `TaskStatus \| 'all'` なので、undefin | ❌ | technical_review |
| 60 | day17 | Step 5のSelectのplaceholderが `All Projects`（英語）だが、実際のコードでは `すべてのプロジェクト`（日本語）。教材全体は日本語UIなので一貫性がない。 | ❌ | technical_review |
| 61 | day17 | Step 1のimportブロックとコンポーネントブロック、Step 3のuseQueryブロックに日本語コメントがない。品質ルールでは全コードブロックに日本語コメント必須。 | ❌ | ux_review |
| 62 | day18 | 実際の task-detail-dialog.tsx では format(new Date(comment.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja }) で日時表示しているが、教材では日時表示のコードが完全に省略されている。date-fns のインポートや format 関数の使い方を説明していない。 | ❌ | technical_review |
| 63 | day18 | 実際の実装ではコメントが0件の時「コメントはまだありません。」というプレースホルダーテキストを表示しているが、教材のコード例にはこの空状態表示がない。 | ❌ | technical_review |
| 64 | day19 | ドラフトでは className='h-7 w-7' としているが、実際のコードベースでは className='h-6 w-6' である。 | ❌ | technical_review |
| 65 | day19 | Step 1 で cat \| grep コマンドを使ってAPIを確認させているが、教育的にはファイルの該当部分を直接見せた方が理解しやすい。また grep 出力は初心者にとって読みにくい。 | ❌ | technical_review |
| 66 | day19 | Step 3 で import { Pencil, Trash2 } from 'lucide-react' を追加しているが、実際の task-detail-dialog.tsx では既にこのインポートが存在する（Day 18 で追加済みの可能性）。 | ❌ | technical_review |
| 67 | day19 | ボタンサイズが実コードと一致していない可能性がある。 | ❌ | po_decision |
| 68 | day20 | Step 1 のパラメータ表で `status` と `priority` の型を `string?` としているが、実際の Zod スキーマでは `'all' \| TaskStatus` と `'all' \| TaskPriority` でデフォルト値 `'all'` が設定されている。初心者向けの簡略化とも取れるが、後のコードで `'all' \| TaskStatus` 型を使うため矛盾する。 | ❌ | technical_review |
| 69 | day20 | 最後の Suspense ラッパーで `<Loader2 className="h-8 w-8 animate-spin text-primary" />` をインライン記述しているが、実コードでは `<PageLoadingSpinner />` コンポーネントを使用している。 | ❌ | technical_review |
| 70 | day20 | Step 1で『catコマンドでソースを確認する』となっているが、初心者にはcatコマンドの意味がわからない可能性がある。また、APIの理解をコード閲覧だけで済ませるのは初心者には難しい。 | ❌ | ux_review |
| 71 | day21 | Step 2でページの土台を2つのコードブロックに分けているが、学習者がこの2つをどう結合すべきかが不明確。1つ目がインポート文、2つ目が残りの実装だが、「続いて、APIクライアントのインポートを追加します」という説明だと、2つ目のブロックがインポートの追加なのかコンポーネント本体なのか混乱する可能性がある。 | ❌ | technical_review |
| 72 | day21 | Step 1は「ローカル集計の考え方」ですが、実際のコーディング作業がなく、npm run devを実行するだけです。確認ポイントも「ローカル集計の仕組みを理解した」という主観的なもので、初心者が達成を確認できません。 | ❌ | ux_review |
| 73 | day22 | Step 3 のステータス色一覧で「グレー」「ブルー」等の曖昧な表記を使っているが、実コードでは `#9e9e9e`, `#2196f3` 等の具体的なHEXカラーが定義されている。初心者が確認時に色が合っているか判断できない。 | ❌ | technical_review |
| 74 | day22 | 「Day 23 では、プロジェクト別の統計テーブルと週次レポート機能を実装します」とあるが、実コードの report/page.tsx には既にプロジェクト統計テーブルが含まれている（230-257行）。Day 22 の範囲に含めるか、Day 23 の内容を正確に記述する必要がある。 | ❌ | technical_review |
| 75 | day23 | Step 1の `npm run dev` コマンドとStep 4の `cat src/server/api/routers/report.ts \| head -50` が教材のステップ内容と噛み合っていない。Step 1は概念説明だけなのにdevサーバー起動を求め、Step 4はファイルの中身を見せるが学習者にはcatコマンドの結果が教材に書かれていないので意味が薄い。 | ❌ | technical_review |
| 76 | day23 | Step完了時の達成感を伝える表現がほぼない。Step 3でテーブルが表示された時や、Step 6で週次レポートが完成した時など、初心者が嬉しくなるポイントで「やったね！」「これでプロのダッシュボードっぽくなりました！」のような声かけがない。 | ❌ | ux_review |
| 77 | day23 | Step 4でcatコマンドでAPIファイルを表示するが、出力の中で何を見るべきか、どこに注目すべきかの指示がない。初心者は50行のコードを見ても何が重要かわからない。 | ❌ | ux_review |
| 78 | day24 | Step 2のローディング表示コードブロックで className が複数行にまたがっているが、Tailwindクラスの改行位置が不自然（`container mx-auto\n  max-w-6xl mt-8`）。実際のコードではPageLoadingSpinnerを使うので、この問題は根本的に解消される。 | ❌ | technical_review |
| 79 | day24 | Step 7「詳細・編集への遷移（3分）」は npm run dev を実行するだけで、実質的な実装作業がありません。Step 6で既にボタンにonClickを設定しているため、このStepは冗長です。 | ❌ | ux_review |
| 80 | day25 | Step 6「パスワード変更フォーム（5分）」に12個以上のコードブロックがあり、5分では到底完了できない量。PasswordInput を使う修正後でも、初心者がフォーム全体を理解・入力するには時間がかかる。 | ❌ | technical_review |
| 81 | day25 | 次回予告で「Day 26 では、エラー対策とデバッグ方法を学びます」とあるが、実際のカリキュラム目次との整合性を確認する必要がある。 | ❌ | technical_review |
| 82 | day25 | 免許証の例え（表面＝プロフィール表示、裏面＝パスワード変更）がやや無理がある。免許証の裏面は住所変更であってパスワード変更ではなく、初心者には直感的に結びつきにくい。 | ❌ | ux_review |
| 83 | day25 | 免許証の例えがプロフィール表示・パスワード変更の関係説明として不自然。 | ❌ | po_decision |
| 84 | day26 | Step 3のバグコードで`function TaskCard({ task })`とpropsに型が付いていない。TypeScript教材として、型なしの関数定義を示すのは規約違反（typescript.instructions.md）ではないが、初心者が真似する可能性がある。 | ❌ | technical_review |
| 85 | day26 | not-found.tsxの実際のテキストは「ページが見つかりません」だが、Step 1では「404 ページが見つかりません」と記載している。実際のnot-found.tsxには`404`という数字と`ページが見つかりません`が別要素で表示される。細かい点だが正確性の問題。 | ❌ | technical_review |
| 86 | day26 | Step 2のerror.tsxコードで `import { Button } from '@/component/ui/button'` とあるが、プロジェクトのCLAUDE.mdでは `@/components/ui/*`（複数形）と定義されている。実際のコードベースと一致しているか確認が必要。教材のインポートパスが実際のコードと異なると、初心者がコピペした時にエラーになる。 | ❌ | ux_review |
| 87 | day26 | Step 3のTaskCard演習コードに型注釈がなく、TypeScript教材として模倣時の品質が下がる。 | ❌ | po_decision |
| 88 | day26 | error.tsxの `@/component/ui/button` が実コードと一致していない可能性がある。 | ❌ | po_decision |
| 89 | day26 | not-found.tsxの表示説明が実UIと完全一致していない。 | ❌ | po_decision |
| 90 | day27 | Step 1 で提示されている Project モデルは `id`, `name`, `description`, `isArchived`, `createdAt`, `updatedAt` の6フィールドのみだが、実際のスキーマには `color`（デフォルト `#1976d2`）、`startDate`、`endDate`、`@map` アノテーション、Relations（`tasks`,  | ❌ | technical_review |
| 91 | day27 | project-detail-dialog.tsx の UI コンポーネントインポート（`Avatar`, `AvatarFallback`, `AvatarImage`, `Badge`, `Button`, `Dialog*` コンポーネント群、`Archive`, `ArchiveRestore`, `Trash2`, `UserPlus`）がチュートリアル内で一度も提示されない。実際のファ | ❌ | technical_review |
| 92 | day28 | Step 2 の `handleSelectAll` コードブロックでは改行を入れて3行で書いているが、実コード（177-179行目）は1行で `setSelectedTasks(checked ? new Set(tasks?.map((t) => t.id) ?? []) : new Set());` と書かれている。動作は同一だが、教材コードと実コードのフォーマットの違いを認識しておくべき。 | ❌ | technical_review |
| 93 | day28 | 教材では「全選択チェックボックス」を「フィルター行の先頭に配置」と Step 4 で記載しているが、実コード（267-275行目）では全選択チェックボックスはヘッダーの `<div className="flex items-center justify-between">` の下の別行 `<div className="flex flex-col sm:flex-row gap-4 items- | ❌ | technical_review |
| 94 | day28 | Step 1 で `bulkDelete` のコードブロックが省略されている。`bulkComplete` と `bulkUpdateStatus` は読むだけのコードブロックがあるが、`bulkDelete` だけ説明がない。実コードでは `bulkDelete` は `deleteMany` を使い、`assertMemberPermission` でプロジェクト単位の権限チェックをしている（ | ❌ | technical_review |
| 95 | day29 | formDataのavatarは user.avatar \|\| '' で初期化されるため、アバター未設定ユーザーではavatar=''となる。送信時にzodスキーマのz.string().url().optional().nullable()は空文字''をURL不正として拒否するため、アバターを変更せずに名前だけ変更しようとしてもバリデーションエラーになる可能性がある。 | ❌ | technical_review |
| 96 | day29 | Step 3のuseEffect(() => { if (error) { toast.error(...) } }, [error])はReact Strict Modeで二重実行される可能性がある。また、errorオブジェクトの参照が変わるたびにトースト表示される。これ自体は実コードベースと同一だが、教材として「Day 22で学んだパターン」と参照しつつ、潜在的な注意点に触れていない。 | ❌ | technical_review |
| 97 | day29 | avatar 未設定時に空文字を送ると zod の url バリデーションに失敗する可能性がある。 | ❌ | po_decision |
| 98 | day30 | 「やること / やらないこと」表で「Docker で DB を準備」がやることに含まれているが、本番環境（Vercel デプロイ）では Docker の PostgreSQL は使えない。本番用のマネージド DB（Vercel Postgres, Supabase 等）のセットアップ手順がないため、実際にはデプロイしても DB 接続できない。 | ❌ | technical_review |


## 教育/UX品質（308件）

### Critical（60件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 4のgit clone URLに `<あなたのユーザー名>` というプレースホルダーがあるが、フォーク手順やGitHubアカウント作成の説明が一切ない。完全初心者はここで100%止まる。URLをどう取得するか、フォークとは何か、そもそもGitHubアカウントが必要なのかが不明。 | ❌ | ux_review |
| 2 | day02 | Step 7で`totalTasks`と`completedTasks`を使っていますが、これらの変数がどこから来るのか説明がありません。初心者はこの変数が未定義でエラーになり、何をすればよいかわかりません。 | ❌ | ux_review |
| 3 | day02 | Step 7でtotalTasksとcompletedTasksを使っているが、学習者にその出所が説明されていないため未定義変数に見える。 | ❌ | po_decision |
| 4 | day03 | Step 6-2で`echo "" >> README.md`等のシェルコマンドを使ってファイルを編集しているが、`echo`コマンドや`>>`（リダイレクト演算子）の説明が一切ない。初心者はこれらのコマンドの意味がわからず、Day 03のテーマ（Git）から逸脱した混乱を招く。 | ❌ | ux_review |
| 5 | day03 | Git リポジトリである前提の説明がなく、Day 01 未実施者や別手順で作成した学習者が `fatal: not a git repository` に遭遇する可能性がある。 | ❌ | po_decision |
| 6 | day03 | Step 6-2 で `echo` と `>>` を無説明で使っており、Git 学習から逸れたシェル知識を要求している。 | ❌ | po_decision |
| 7 | day04 | Step 5で JWT_SECRET に「32文字以上のランダムな文字列」と書かれているが、生成方法がStep内に記載されていない。初心者は「ランダムな文字列」の作り方を知らないため、ここで手が完全に止まる。生成コマンド（openssl rand -base64 32）はつまずきポイント表にだけ書かれており、本文では触れていない。 | ❌ | ux_review |
| 8 | day04 | Step 7の確認が、初期ユーザーや初期データの存在を暗黙前提にしており、学習者がログインで詰まる可能性が高い。 | ❌ | po_decision |
| 9 | day04 | JWT_SECRETの生成方法がStep本文に無く、初心者がその場で手を止める。 | ❌ | po_decision |
| 10 | day05 | Step 6 の `CardContent` がプレースホルダーコメントのみで、初心者が実装を完了できない。 | ❌ | po_decision |
| 11 | day08 | Step 4で「サイドバーの</nav>の後に」「サイドバーの</div>（flex-1の直後）に追加します」と書かれているが、初心者はapp-layout.tsxの中でどこがその位置か特定できない。200行以上のファイルで『</div>の直後』と言われても、</div>は大量にある。 | ❌ | ux_review |
| 12 | day08 | 『</nav>の後』『</div>の直後』では初心者が位置を特定できない。長いTSXファイルでは致命的に分かりにくい。 | ❌ | po_decision |
| 13 | day09 | Step 6 で `<div className="grid gap-6 ...">` と `{/* カード表示 */}` を使用している。`...` によるクラス名省略と `{/* カード表示 */}` によるコード省略は両方とも禁止パターン。 | ❌ | ux_review |
| 14 | day09 | Step 4 で `ProjectCard` に `isArchived={project.isArchived}` を渡しておらず、アーカイブ表示が正しく反映されない。 | ❌ | po_decision |
| 15 | day10 | Step 7で `dialogOpen` / `setDialogOpen` を使用しているが、`const [dialogOpen, setDialogOpen] = useState(false);` の宣言がどこにも記載されていない。初心者は未定義変数でエラーになり、手順を完遂できない。 | ❌ | technical_review |
| 16 | day10 | dialogOpenステートの宣言が完全に欠落しています。Step 7で `setDialogOpen(false)` や `dialogOpen` を使用していますが、`const [dialogOpen, setDialogOpen] = useState(false)` がどこにも記載されていません。初心者はこの変数がどこから来るのか分からず、完全にブロックされます。 | ❌ | ux_review |
| 17 | day10 | 「新規プロジェクト」ボタンのコードが一切存在しません。Step 8で「新規プロジェクトボタンをクリック」と指示していますが、このボタンを作るステップがありません。初心者はクリックするボタンが画面に存在せず、動作確認ができません。 | ❌ | ux_review |
| 18 | day10 | ダイアログを開く『新規プロジェクト』ボタンが実装されておらず、Step 8 の動作確認と教材内容が一致していない。 | ❌ | po_decision |
| 19 | day11 | 新しく学ぶ概念が6個あり、上限の3個を大幅に超過している。初心者にとって1日で6つの新概念は認知負荷が高すぎる。 | ❌ | ux_review |
| 20 | day11 | 新概念が6個あり、初心者向けの1日分として認知負荷が高い。 | ❌ | po_decision |
| 21 | day12 | Steps 1-5 の全コードが src/app/project/page.tsx の断片として提示されるが、各断片がファイル内のどの位置（コンポーネント関数内のどこ、JSXのどの部分）に配置されるか説明がない。初心者はコードの組み立て順序がわからず詰まる。 | ❌ | ux_review |
| 22 | day12 | 各コード断片の配置場所が不明で、初心者がどこに貼るべきか判断できない。 | ❌ | po_decision |
| 23 | day13 | Step 3のゴールに「プロジェクトとステータスの選択UIを作ります」とあるが、ステータスフィルターのSelect UIが一切実装されていない。filterStatus のstateは定義されるが、対応するUIコンポーネントがない。初心者は「ステータスフィルターはどこ？」と混乱する。 | ❌ | ux_review |
| 24 | day13 | Step 4の説明がコードと一致しておらず、スプレッド演算子と `&&` を使うと誤説明している。 | ❌ | po_decision |
| 25 | day13 | Step 3のゴールに対して、ステータスフィルターUIが未実装。 | ❌ | po_decision |
| 26 | day13 | Step 7でタスク詳細ダイアログの表示部分が欠落しており、学習者が完成形を作れない。 | ❌ | po_decision |
| 27 | day14 | handleFormSubmit内の条件付きスプレッド構文 `...(data.description && { description: data.description })` は初心者に未説明のまま使用されている。このパターンはES2018の高度な構文であり、完全初心者には理解不能。 | ❌ | ux_review |
| 28 | day14 | Step 4〜7でJSXの開きタグ・閉じタグが複数ステップにまたがっており、初心者がコードを組み立てる際にどこに何を配置すべきか分からなくなる。特にStep 7の `</div>` がStep 4の `<div className='grid gap-4 py-4'>` を閉じているが、その対応関係が不明。 | ❌ | ux_review |
| 29 | day14 | `handleFormSubmit` の条件付きスプレッド構文が未説明で、初心者には理解しづらい。 | ❌ | po_decision |
| 30 | day14 | Step 4〜7 で JSX の開閉タグが複数ステップにまたがり、初心者が配置位置を見失いやすい。 | ❌ | po_decision |
| 31 | day15 | Step 1 の useForm values で status/priority の初期値が文字列リテラルになっており、enum 定数ベースの実装と不整合。 | ❌ | po_decision |
| 32 | day16 | TimeLogDialog が useState 個別管理で実装されており、必須ルールの react-hook-form + zod に違反している。 | ❌ | po_decision |
| 33 | day17 | Step 7で期限切れ（overdue）グループのレンダリングコードしか示されていない。「今日が期限」「今後の予定」「期限なし」の3グループのJSXコードが完全に欠落している。初心者はこれらのグループをどう表示すればよいか分からない。 | ❌ | ux_review |
| 34 | day17 | Step 7で期限切れグループしか書かれておらず、今日・今後・期限なしの表示コードが欠落している。 | ❌ | po_decision |
| 35 | day17 | `activeTab as TaskStatus` が使われており、プロジェクト規約違反を教材が助長している。 | ❌ | po_decision |
| 36 | day18 | 教材はコメント機能を「新規に実装する」という前提だが、task-detail-dialog.tsx にはコメント投稿（createCommentMutation）・編集（updateCommentMutation）・削除（deleteCommentMutation）・UI（Avatar、Textarea、編集モード切替）が既に完成している。学習者がこの教材通りに作業すると、既存コードと重複・衝突す | ❌ | technical_review |
| 37 | day18 | Step 4 で TaskPageContent 内に useState('commentContent') を追加する指示があるが、TaskPageContent（page.tsx）はタスク一覧ページのコンポーネントであり、コメント状態を持つべきではない。コメント状態は TaskDetailDialog 内部で管理されるべき設計になっている。教材がこのアーキテクチャを無視している。 | ❌ | technical_review |
| 38 | day18 | `selectedTask` を使う説明になっているが、実コンポーネントでは `taskId` を使うため、そのままではコンパイルエラーになる。 | ❌ | po_decision |
| 39 | day18 | Step 3 の JSX が断片化され、開きタグと閉じタグが別ブロックに分かれているため、初心者が配置できない。 | ❌ | po_decision |
| 40 | day19 | Step 4のコードブロック分割が三項演算子の途中で切れている。2番目のブロックが`<Button size="sm"` で終わり、3番目のブロックで`<Button size="sm" variant="outline"`から再開する。初心者はどこにどのコードを貼ればいいか全くわからない。 | ❌ | ux_review |
| 41 | day19 | 削除確認に confirm() を使っているが、コードベースは DeleteConfirmDialog を使う設計であり、教材が既存パターンを壊している。 | ❌ | po_decision |
| 42 | day19 | Step 4 のコードブロックが三項演算子の途中で分断されており、初心者が貼り付け位置と完成形を理解できない。 | ❌ | po_decision |
| 43 | day20 | ステータスSelect、優先度Select、プロジェクトSelectのJSXコードが一切提示されていない。初心者がこのチュートリアルだけで検索フォームを完成させることは不可能。 | ❌ | ux_review |
| 44 | day20 | Step 3でkeywordのonKeyDownからhandleSearchを呼んでいるが、handleSearchはStep 4まで定義されない。この順序で書くと実行時エラーになり、初心者は原因がわからず詰まる。 | ❌ | ux_review |
| 45 | day21 | Step 2〜5は全て report/page.tsx を編集しますが、各コードブロックが断片的で、完成形のファイル構造が示されていません。Step 3の「ReportPage内に追加」、Step 4の計算ロジック、Step 5のJSXフラグメントは、return文やコンポーネント内のどの位置に挿入すべきか初心者には判断できません。 | ❌ | ux_review |
| 46 | day21 | Step 2〜5 がすべて同一ファイルの断片編集なのに、挿入位置と完成形が不明で、初心者が `report/page.tsx` を組み立てにくい。 | ❌ | po_decision |
| 47 | day22 | Step 2〜6で既存の report/page.tsx のどの位置にコードを追加すべきか一切説明がない。Day 21で作成済みのファイルに追記する形なので、『統計カードの下に以下を追加』のように挿入位置を明示しないと初心者は迷子になる。 | ❌ | ux_review |
| 48 | day22 | 既存の report/page.tsx のどこにコードを追加・移動するかが示されておらず、初心者が迷う。 | ❌ | po_decision |
| 49 | day23 | Step 2の3つのコードブロックは1つのuseMemo関数の断片。1つ目のブロックは閉じ括弧なしで終わり、2つ目も途中、3つ目で閉じる。初心者がブロックごとにファイルを保存すると構文エラーになるが、その説明がない。「このコードは3つのブロックに分けて説明しますが、すべて1つのuseMemoの中に書きます」のような前置きが必須。 | ❌ | ux_review |
| 50 | day23 | Step 2の3ブロック、Step 3の4ブロック、Step 5/6の断片が単独では成立せず、保存時に構文エラーや配置迷子を招く。 | ❌ | po_decision |
| 51 | day24 | return 文の骨格が欠落しており、初心者が各断片を `src/app/user/page.tsx` のどこに配置するか判断できません。 | ❌ | po_decision |
| 52 | day24 | Step 2 が同一ファイルの断片を多数並べる構成で、学習者が組み立て順を見失います。 | ❌ | po_decision |
| 53 | day25 | Step 10が15個以上の小さなコードブロックに分割されており、初心者がファイル全体のどこに各断片を配置すべきか分からない。各ブロックは3〜15行程度で、JSXの開きタグと閉じタグが別ブロックに分かれている箇所もある。7分のステップとしては断片が多すぎ、コピペで組み立てる際にミスが多発する。 | ❌ | ux_review |
| 54 | day26 | タイトル「バグを退治しよう」とゴール「3つのバグを仕込んで自力で修正する」と宣言しているが、Bug A（Optional Chaining）とBug B（useEffect依存配列）は「演習用コード（読んで理解する）」と明記されており、実際にコードを書いて壊して直す体験ができない。初心者にとって「自分で壊して直す」体験が最も記憶に残る学習方法であり、読むだけでは「バグを退治した」実感が得られない。 | ❌ | ux_review |
| 55 | day26 | タイトルとゴールでは3つのバグを自力で修正すると約束しているのに、実際に手を動かすのはBug C中心で、Bug A/Bは読むだけになっている。 | ❌ | po_decision |
| 56 | day27 | Step 7で `handleDetailClose`、`handleRemoveMember`、`utils`、`setMemberDialogOpen` などが未定義のまま使われており、学習者が実装を完了できない。 | ❌ | po_decision |
| 57 | day29 | update mutationが一般ユーザーの自己プロフィール編集で常にFORBIDDENエラーになる。formDataは常にroleとisActiveを含むため、updateUser.mutate({ id: userId, ...formData })はrole・isActiveをundefinedではなく実値として送信する。サーバー側（user.ts:194-200）は自己更新時にdata. | ❌ | technical_review |
| 58 | day29 | 教材どおりの update mutation では、一般ユーザーの自己プロフィール編集が常に FORBIDDEN になる。formData に role と isActive が含まれているため、名前だけ変更しても禁止フィールドを送ってしまう。 | ❌ | po_decision |
| 59 | day29 | フォーム実装が useState ベースで、絶対ルールの react-hook-form + zod に違反している。Day 25 までの学習内容とも不整合。 | ❌ | po_decision |
| 60 | day30 | package.json の build スクリプトが途中改行されている。JSON は改行を許容しないため、コピペすると parse エラーになる。 | ❌ | ux_review |

### Major（136件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 1のタイトルは「miseをインストールする」だが、ステップ内に「Node.jsとは」「Node.jsのインストール」というセクションが含まれている。Node.jsのセットアップはStep 6「Node.jsをセットアップする」で行うのに、Step 1で先にNode.jsの説明をしているため、内容が分散して混乱を招く。Step一覧表でもStep 1の成功状態は `mise --versio | ❌ | technical_review |
| 2 | day02 | Step 4で`welcomeText`と`dynamicText`を定義していますが、Step 3のCardコンポーネントのJSXでこれらの変数を使う手順がありません。変数を作っただけで画面に反映されないため、学習効果が薄くなります。 | ❌ | ux_review |
| 3 | day02 | 4箇所のスクリーンショットが全て同じ`./screenshots/dashboard.png`を参照しています。Step 2（テキスト追加後）、Step 3（Card化後）、Step 7（統計追加後）はそれぞれ画面が異なるはずで、同じ画像では初心者が「自分の画面と合っているか」確認できません。 | ❌ | ux_review |
| 4 | day02 | 異なる進捗段階なのに同じdashboard.pngを使い回しており、学習者が自分の画面との差分確認をできない。 | ❌ | po_decision |
| 5 | day02 | dashboard/page.tsxを何度も変更するのに、最終的な完成状態が示されていない。初心者は途中でファイル全体像を見失いやすい。 | ❌ | po_decision |
| 6 | day03 | Step 3のコミットメッセージが`Initial commit: setup task-app`だが、create-next-appが既にinitial commitを作成済み。学習者のリポジトリには既にコミットが存在するため、これは2回目以降のコミットになる。「Initial commit」という名前は事実と矛盾し、学習者に誤解を与える。 | ❌ | technical_review |
| 7 | day03 | Step 2のコードブロックがbash形式で表示されているが、実際にはブラウザでの操作手順をコメントで書いているだけ。初心者がターミナルにこれを入力しようとする可能性がある。 | ❌ | ux_review |
| 8 | day03 | ターミナルコマンドに`$`記号が付いているが、「$は入力しないでください」という注意書きがない。初心者は`$ git config`と$記号ごと入力してエラーになる可能性が高い。 | ❌ | ux_review |
| 9 | day03 | `Initial commit: setup task-app` というコミットメッセージが、create-next-app による既存コミットの可能性と整合しない。 | ❌ | po_decision |
| 10 | day03 | Step 4-2 で macOS・Windows・Linux のコマンドが1つのコードブロックに混在し、初心者が全部実行する危険がある。Linux の `store` には平文保存リスクもある。 | ❌ | po_decision |
| 11 | day03 | Step 2 の bash コードブロックは実行コマンドではなくブラウザ操作メモであり、初心者がターミナル入力対象と誤解しうる。 | ❌ | po_decision |
| 12 | day03 | コマンド先頭の `$` を入力しない説明がなく、初心者がそのまま入力してエラーになる恐れがある。 | ❌ | po_decision |
| 13 | day03 | つまずきポイント表に `fatal: not a git repository` がなく、今回の前提不足と直結する代表的エラーを拾えていない。 | ❌ | po_decision |
| 14 | day03 | Step 6 は状態確認、ファイル編集、差分確認、履歴確認、再コミット、再プッシュまで含み、1ステップとして重い。 | ❌ | po_decision |
| 15 | day04 | JWT_SECRETの生成方法がStep 5本文中に記載されていない。`<32文字以上のランダムな文字列>`とだけ書かれており、初心者はどうやって生成すべきかわからない。つまずきポイント表でのみ`openssl rand -base64 32`が登場するが、これは本来Step 5で先に教えるべき内容。 | ❌ | technical_review |
| 16 | day04 | 初回デプロイで失敗した場合のログ確認導線が弱く、初心者が復旧できない。 | ❌ | po_decision |
| 17 | day04 | エラー対処で `next.config.js` と書かれているが、実プロジェクトは `next.config.mjs` を使っている。 | ❌ | po_decision |
| 18 | day04 | ブラウザ操作をbashコードブロックで示している箇所が複数あり、初心者が『実行するコマンド』と誤認しやすい。 | ❌ | po_decision |
| 19 | day05 | Step 7の2番目のコードブロックに65文字超の行が複数存在する。(1) `if (url.startsWith('http://') \|\| url.startsWith('https://')) return false;` (約71文字) (2) `const rawCallbackUrl = searchParams?.get('callbackUrl') \|\| '/dashboard'; | ❌ | technical_review |
| 20 | day05 | react-hook-form、zod、@hookform/resolvers、react-hot-toastの4パッケージが使われているが、インストール済みかどうかの説明がない。初心者は『このライブラリはどこから来たの？』と疑問に思う。 | ❌ | ux_review |
| 21 | day05 | Step 7 に 65 文字超の行が複数あり、PDF変換時に崩れる。 | ❌ | po_decision |
| 22 | day05 | Step 7 に新概念が集中しすぎており、初心者向けの 7 分ステップとして重い。 | ❌ | po_decision |
| 23 | day05 | `react-hot-toast` が未説明のまま登場している。 | ❌ | po_decision |
| 24 | day05 | 使用ライブラリがインストール済みか不明で、初心者が環境差分で詰まる可能性がある。 | ❌ | po_decision |
| 25 | day06 | 3箇所のスクリーンショット指定が全て同一ファイル（./screenshots/register.png）を参照しています。学習者にとって、各ステップの進捗を視覚的に確認できることが重要ですが、同じ画像を3回見せても学習効果がありません。特にStep 6の時点（ボタン未追加）とStep 8（完成版）は明らかに異なる画面のはずです。 | ❌ | ux_review |
| 26 | day06 | 3箇所のスクリーンショットがすべて `./screenshots/register.png` で、進捗確認の役割を果たしていません。 | ❌ | po_decision |
| 27 | day06 | Step 3 の『Day 05 と同じパターン』『全く同じ構造』は、禁止ワードルールに抵触するリスクが高く、説明としても具体性が不足しています。 | ❌ | po_decision |
| 28 | day06 | Step 7 は置き換え作業が中心なのに、どの既存コードを消して何に差し替えるかが十分に明示されていません。初心者は追従しづらい構成です。 | ❌ | po_decision |
| 29 | day07 | スクリーンショット（画像タグ）が2箇所のみ（login.png, dashboard.png）で、品質基準の最低3箇所を満たしていません。 | ❌ | ux_review |
| 30 | day07 | 画像が2箇所のみで、品質基準の3箇所以上を満たしていない。 | ❌ | po_decision |
| 31 | day08 | 3箇所のスクリーンショット参照が全て ./screenshots/sidebar.png を指している。Step 5のログアウト確認ダイアログの画面は sidebar.png ではなくダイアログが表示された状態の別スクリーンショットであるべき。 | ❌ | ux_review |
| 32 | day08 | Step 7とStep 8でブラウザ操作の手順をbashコードブロックとして記述している。初心者は「これをターミナルに入力するのか？」と混乱する可能性が高い。 | ❌ | ux_review |
| 33 | day08 | ブラウザ操作手順を `bash` コードブロックで示しており、実行コマンドと誤認される。 | ❌ | po_decision |
| 34 | day09 | Step 8でuseEffectの依存配列に `[projectIdParam]` のみを指定しているが、実際にはこのuseEffectでsetSelectedProjectとsetDetailOpenを呼んでいる。教材としてuseEffectの依存配列について正しい理解を促すべき。また、detailOpenをtrueにしても対応するダイアログコンポーネント（ProjectDetailDialog | ❌ | technical_review |
| 35 | day09 | Step 2 の表で `error` を返り値として紹介しているが、エラー状態の表示処理が一切実装されていない。Step 3 でローディングだけ対処してエラーを無視するのは、初心者に『エラーハンドリングは不要』という誤った印象を与える。 | ❌ | ux_review |
| 36 | day09 | 全9ステップが同一ファイル（page.tsx）を段階的に編集するが、「ProjectPageContent内に追加」「returnの前に追加」等の指示だけでは、初心者はコードをどの行に挿入すべきか判断できない。特にStep 2〜8は既存コードのどこに差し込むかが不明瞭。 | ❌ | ux_review |
| 37 | day09 | スクリーンショットが全て同じ `project-list.png` を参照している（3箇所）。ローディング状態、空の状態、レスポンシブ表示など、異なる状態のスクリーンショットがないと、学習者は各ステップの期待結果をイメージできない。 | ❌ | ux_review |
| 38 | day09 | `useQuery` の返り値として `error` を説明しているのに、エラー表示の実装がない。 | ❌ | po_decision |
| 39 | day09 | 各 Step が断片コード中心で、どこに挿入するかが初心者に分かりにくい。 | ❌ | po_decision |
| 40 | day09 | `showArchived` state を導入しているのに UI がなく、学習者に未使用コードとして見える。 | ❌ | po_decision |
| 41 | day09 | Step を積み上げても最終的な `page.tsx` の完成形が見えず、学習者が完成状態を確認しにくい。 | ❌ | po_decision |
| 42 | day10 | Step 1〜6で project-dialog.tsx を6ステップに分割して構築していますが、全コードブロックがファイル内のどの位置に入るか、最終的な完成形がどうなるかが示されていません。初心者は断片的なコードを正しい順序で組み立てられません。 | ❌ | ux_review |
| 43 | day10 | Step 4の handleFormSubmit 内で使われている `...(data.id !== undefined && { id: data.id })` パターンは、Day 10の初心者には非常に高度です。条件付きスプレッドの説明が一切ありません。 | ❌ | ux_review |
| 44 | day10 | Step 1〜6 が断片的で、`project-dialog.tsx` の最終的な組み上がりが見えない。初心者が正しい位置に貼り付けにくい。 | ❌ | po_decision |
| 45 | day10 | `...(data.id !== undefined && { id: data.id })` などの条件付きスプレッドが初心者には難しく、説明不足。 | ❌ | po_decision |
| 46 | day10 | Step 7 に page.tsx の変更が集中しすぎており、初心者にとって追従しづらい。 | ❌ | po_decision |
| 47 | day11 | 合計時間が約35分で、ガイドラインの60〜90分を大幅に下回っている。内容が薄い印象を与え、学習者が『これだけ？』と感じる可能性がある。 | ❌ | ux_review |
| 48 | day11 | 合計35分で、ガイドラインの60〜90分に届いていない。 | ❌ | po_decision |
| 49 | day12 | 4箇所全てのスクリーンショットが同じ画像（project-add-member.png）を参照している。段階的な成果が見えず、初心者の達成感が薄い。 | ❌ | ux_review |
| 50 | day12 | `value as ProjectMemberRole` の型アサーションを使っており、プロジェクト規約に反する。 | ❌ | po_decision |
| 51 | day12 | メンバー追加フォームが `useState` 個別管理で説明されており、必須ルールの `react-hook-form + zod` に反している。 | ❌ | po_decision |
| 52 | day12 | Step 1〜5 が実質的に同一ファイルへの連続変更で、教材ルールの『1ステップ1ファイルまで』に抵触している。 | ❌ | po_decision |
| 53 | day12 | 全ステップで同じ画像を使っており、進捗の可視化と達成感が弱い。 | ❌ | po_decision |
| 54 | day12 | 動作確認手順が抽象的で、誰で何を確認するかが不明確。 | ❌ | po_decision |
| 55 | day13 | Step 3のタイトルは「プロジェクトとステータスの選択UIを作ります」だが、コード例にはプロジェクトのSelectコンポーネントしかなく、ステータスフィルターのUI実装が完全に欠落している。filterStatusのstateは定義しているが、対応するSelectコンポーネントのJSXがない。 | ❌ | technical_review |
| 56 | day13 | Step 3のコードが3つのブロックに分割され、3つ目が閉じタグだけ（</Select></div></div>）になっている。初心者はこの断片をファイルのどこに配置すべきか判断できず、全体像が掴めない。 | ❌ | ux_review |
| 57 | day13 | Step 2で`tasksLoading`を取得しているが、ローディング中のUI表示が実装されていない。初心者がデータ取得中に何も表示されない状態を見て「壊れた？」と不安になる可能性がある。 | ❌ | ux_review |
| 58 | day13 | 優先度の説明に `URGENT` が含まれているが、実 enum は `CRITICAL` の可能性が高い。 | ❌ | po_decision |
| 59 | day13 | Step 6に `<TaskCard key={task.id} ... />` という禁止プレースホルダーが残っている。 | ❌ | po_decision |
| 60 | day13 | `tasksLoading` を取得しているのに、ローディング中UIがない。 | ❌ | po_decision |
| 61 | day13 | 教材全体として『初心者がコピペで進められること』を満たしておらず、Step 3・6・7で完全コードの原則が崩れている。 | ❌ | po_decision |
| 62 | day14 | Step 7の期限・見積時間コードブロックの末尾で、閉じ`</div>`が1つ足りない。Step 5で `<div className="grid grid-cols-2 gap-4">` を開いており、Step 7末尾で `grid-cols-2` と `grid gap-4 py-4`（外側グリッド）の2つの`</div>`が必要だが、ドラフトには1つしかない。学習者がこのままコピペすると構文 | ❌ | technical_review |
| 63 | day14 | Step 3のコードブロックが `values` オブジェクトの途中で切れており、閉じ括弧が次のブロックに分離している。初心者は「このコードはこのまま貼り付けていいのか、それとも続きがあるのか」が分からない。 | ❌ | ux_review |
| 64 | day14 | Step 7 の JSX に閉じ `</div>` が不足しており、そのままでは構文エラーになる。 | ❌ | po_decision |
| 65 | day14 | Step 8 で `projects` を TaskDialog に渡しているが、取得コードや前提説明がない。 | ❌ | po_decision |
| 66 | day14 | `task-dialog.tsx` の完成形が一度も示されず、全体像を確認できない。 | ❌ | po_decision |
| 67 | day14 | Step 3 のコードブロックが `values` オブジェクトの途中で切れており、貼り付け単位が不明確。 | ❌ | po_decision |
| 68 | day14 | `src/component/...` と `src/components/...` の表記ゆれがあり、実プロジェクト構成とズレている可能性が高い。 | ❌ | po_decision |
| 69 | day15 | Step 5の説明で「`confirm()` ではなく `DeleteConfirmDialog` コンポーネントを使います」とあるが、window.confirm()とカスタムダイアログの違いについて言及するなら、なぜwindow.confirm()を使わないのか（UIの一貫性、カスタマイズ性、アクセシビリティ）を簡潔に説明すべき。現状は代替手段に触れているだけで、「なぜ」の説明がない。 | ❌ | technical_review |
| 70 | day15 | Step 2〜6が全てsrc/app/task/page.tsxを編集するが、各コードスニペットの挿入位置（既存コードのどの部分の後に追加するか）が不明確。初心者は「このコードはファイルのどこに書くの？」と混乱する。 | ❌ | ux_review |
| 71 | day15 | selectedTask（Step 3）、TaskFormData型（Step 2）、projects・usersの変数（Step 6）が説明なく登場する。Day 14で定義済みでも、初心者は前日の実装を正確に覚えていない。 | ❌ | ux_review |
| 72 | day15 | Step 2〜6 が同じ page.tsx を編集するのに、各コードの挿入位置が不明確で初心者が迷う。 | ❌ | po_decision |
| 73 | day15 | コードブロックの分割が『前半/続き』依存になっており、単独でコピペ実行可能という完全性ルールと相性が悪い。 | ❌ | po_decision |
| 74 | day15 | selectedTask、TaskFormData、projects、users など前日由来の変数が説明なしで登場する。 | ❌ | po_decision |
| 75 | day16 | 3箇所全てが同じ画像（task-timer.png）・同じalt文（手動時間記録ダイアログ）です。ステータス変更後の画面、タイマー動作中の画面、手動記録ダイアログの画面をそれぞれ異なるスクリーンショットで示すべきです。 | ❌ | ux_review |
| 76 | day16 | 同一画像を3回使っており、ステータス変更・タイマー動作中・手動記録ダイアログの違いが伝わらない。 | ❌ | po_decision |
| 77 | day17 | Step 8が6つのコードブロックを含み、mutations定義・handleEdit（2分割）・handleDelete・handleSubmit・TaskDialog配置と非常に重い。「5分」の見積もりは非現実的で、初心者は圧倒される。 | ❌ | ux_review |
| 78 | day17 | Step 8が重すぎて、初心者向けの3〜7分粒度を超えている。 | ❌ | po_decision |
| 79 | day17 | 断片コードの配置場所が分かりにくく、初心者が `page.tsx` を組み立てにくい。 | ❌ | po_decision |
| 80 | day18 | Step 6「投稿後のキャッシュ更新」は Step 5 の createCommentMutation の onSuccess 内で既に実装済みの invalidate をそのまま繰り返しているだけ。独立したステップとして分ける意味がない。 | ❌ | technical_review |
| 81 | day18 | Step 2は既存コードを見せるだけで、新しいコードを書かない。初心者は「何を実装すればいいの？」と戸惑う。タイトルが「コメントを取得」だが実際には何も実装していない。 | ❌ | ux_review |
| 82 | day18 | Step 6のinvalidateコードはStep 5のonSuccess内に既に含まれている。同じコードを独立ステップとして再掲するのは冗長で、初心者が「二度書くのか？」と混乱する。 | ❌ | ux_review |
| 83 | day18 | Step 2 は実装作業がなく、Step 6 は Step 5 の重複で、学習導線が弱い。 | ❌ | po_decision |
| 84 | day18 | 構造表が `user.email` を欠いており、`user.avatar` の型も実装とずれている。 | ❌ | po_decision |
| 85 | day19 | task-comment-edit.png が3箇所で使い回されている（冒頭・Step 3・Step 4）。それぞれのステップで見える画面は異なるはずなのに同じ画像では視覚的な確認にならない。 | ❌ | ux_review |
| 86 | day19 | Step 1で `cat ... \| grep -A5 "update\\|delete"` コマンドを使っているが、grep のパイプ、-A5フラグ、正規表現のエスケープは初心者には理解できない。しかもその後にパラメータ表を手動で記載しているので、grepコマンド自体が不要。 | ❌ | ux_review |
| 87 | day19 | session?.user?.id を使っているのに、session をどこで取得するか説明がない。 | ❌ | po_decision |
| 88 | day19 | utils.task.getById.invalidate({ id: selectedTask }) は TaskDetailDialog 内では不適切で、参照できない可能性が高い。 | ❌ | po_decision |
| 89 | day19 | isPending を使った disabled 制御と文言切替がなく、二重送信や連打を防げない。 | ❌ | po_decision |
| 90 | day19 | mutation 失敗時の onError がなく、ユーザーに失敗が伝わらない。 | ❌ | po_decision |
| 91 | day19 | 更新時に editingCommentContent を trim() せず送っており、クライアント側の入力整形が不足している。 | ❌ | po_decision |
| 92 | day19 | Step 1 の grep コマンドは初心者に負荷が高く、学習価値より混乱が大きい。 | ❌ | po_decision |
| 93 | day19 | 同じ画像を複数箇所で使い回しており、各ステップの状態確認に使えない。 | ❌ | po_decision |
| 94 | day20 | Step 6 に「これらはDay 16で実装します」とあるが、Day 20 は Day 16 より後なので未来形は不正確。学習者は既に Day 16 を完了しているはず。 | ❌ | technical_review |
| 95 | day20 | スコープ表で『プロジェクトCardで表示』を宣言しているが、プロジェクト検索結果の表示コードが一切ない。searchResults.projectsの表示部分が欠落している。 | ❌ | ux_review |
| 96 | day20 | ローディング中の表示と検索結果0件時の表示コードがない。isLoadingは取得しているが使用されていない。初心者は検索中に何も表示されず混乱する。 | ❌ | ux_review |
| 97 | day20 | 禁止ワード『同じ』が使用されている：『Day 12 で学んだパターンと同じです』。品質チェックスクリプトでFAILになる。 | ❌ | ux_review |
| 98 | day20 | コードブロックが分割されているが、ファイル内のどの位置に書くかの説明が不足。例えばStep 6で4つのブロックがあるが、return文の中のどこに配置するか不明。初心者は組み立て方がわからない。 | ❌ | ux_review |
| 99 | day21 | Step 5の4つのコードブロックはJSXフラグメントですが、return文の中のどこに配置すべきか、親要素のdivとの関係が示されていません。最初のブロックは開きタグ<div className="grid...">で始まり、最後のブロックで</div>を閉じますが、初心者はこの4つのブロックを1つのまとまりとして理解するのが困難です。 | ❌ | ux_review |
| 100 | day21 | Step 1 が実質的な作業を伴わず、`npm run dev` のみで終わっている。Step 6 も実装がなく独立ステップとして弱い。 | ❌ | po_decision |
| 101 | day22 | Step 4 でJSXが2つのコードブロックに分割されているが、2つ目のブロックが1つ目のブロックの続き（Pie 内部の children）であることが初心者に伝わりにくい。「続けて」という接続詞だけでは、どこに挿入すればよいかわからない。Step 5 も同様の問題がある。 | ❌ | technical_review |
| 102 | day22 | 予備知識テーブルに BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid を掲載しているが、Day 22 で実際に使うのは PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend のみ。使わないコンポーネントを多数掲載すると初心者を混乱させる。 | ❌ | technical_review |
| 103 | day22 | 「やらないこと」に「棒グラフ」「折れ線グラフ」が入っているが、予備知識テーブルで BarChart, LineChart を詳しく説明している。やらないと宣言したものの詳細説明は混乱を招く。 | ❌ | technical_review |
| 104 | day22 | Step 4とStep 5でJSXが2つのコードブロックに分割されているが、これらをどう結合すればファイルとして成立するかの説明がない。初心者は断片コードをコピペしても正しく組み立てられない可能性が高い。 | ❌ | ux_review |
| 105 | day22 | Step 6の実装コードが `{/* ステータス円グラフ */}` `{/* 優先度円グラフ */}` というJSXコメントのみ。Step 4-5で作ったCardをこのdivで囲む必要があるが、『Step 4-5のCardをこのdiv内に移動する』という指示がない。初心者はコメントだけの空divを追加してしまう。 | ❌ | ux_review |
| 106 | day22 | スクリーンショットが4箇所とも同じ ./screenshots/report.png を参照している。段階的にグラフが増える様子を見せるべきところ、全て完成画面では中間段階の確認ができない。 | ❌ | ux_review |
| 107 | day22 | Step 4 と Step 5 の JSX が断片化されており、単独でコピペできない。 | ❌ | po_decision |
| 108 | day22 | グリッド div を追加するだけに見え、既存の Card をその中へ移動する必要が伝わらない。 | ❌ | po_decision |
| 109 | day23 | Step 5のコードで `export default function WeeklyReportPage()` の関数定義が始まるが、return文の全体構造（AppLayoutで囲む、ページタイトル、Selectとの配置関係）が示されていない。教材のコードブロックは断片的で、学習者がどこに何を配置すればいいか不明確。関数のreturn文の骨格が欠如。 | ❌ | technical_review |
| 110 | day23 | Step 3は4つのコードブロックに分かれているが、2つ目のブロック内に{/* 次のブロックでヘッダー定義 */}というコメントがある。初心者にとって、4つの断片をどう組み合わせるかが非常にわかりにくい。特にTableHeaderの中のTableRowの中にTableHeadを入れる、という入れ子構造が断片だけでは理解困難。 | ❌ | ux_review |
| 111 | day23 | projectStats に id がなく、Step 3で `key={stat.name}` を使っている。名前重複時に React key 問題が起きる。 | ❌ | po_decision |
| 112 | day23 | 各ステップで『どのファイルのどこに追加・置換するか』が不明確。既存コードがある前提の教材として不親切。 | ❌ | po_decision |
| 113 | day23 | Step 5で WeeklyReportPage の return 全体骨格が示されておらず、Select やカードをどこに置くか分からない。 | ❌ | po_decision |
| 114 | day23 | コードブロックは25行以内でも、単独で実行不能な断片提示になっており、『単独でコピペ実行可能』ルールを満たしていない。 | ❌ | po_decision |
| 115 | day23 | スクリーンショット指定の形式が混在しているうえ、学習確認に有効な場面への配置が弱い。 | ❌ | po_decision |
| 116 | day24 | スクリーンショットが4箇所で全て同じ画像（user-list.png）を参照しています。Step 3の権限エラー画面、Step 5のアバター・バッジ追加後の画面など、各段階の視覚的な変化が見えないため、学習者は自分の画面が正しいか確認できません。 | ❌ | ux_review |
| 117 | day24 | Step 1 の `cat ... \| head -30` は目的に対して手段が難しく、未学習概念を露出させます。 | ❌ | po_decision |
| 118 | day24 | 同じスクリーンショットを複数ステップで使い回しており、進捗確認に使えません。 | ❌ | po_decision |
| 119 | day24 | Step 7 が実装を伴わず、学習価値が低い独立ステップになっています。 | ❌ | po_decision |
| 120 | day25 | Step 3（プロフィール情報の表示）が「5分」と記載されているが、8個以上のJSXコードブロックを含み、それぞれがCardの一部分を構成している。初心者がreturn文の中でこれらをどう組み合わせるか不明。完成形のJSX構造が示されておらず、断片を正しい順序で配置する方法が説明されていない。 | ❌ | ux_review |
| 121 | day25 | Step 10 のコード断片が多すぎ、初心者がファイル全体像と配置位置を把握しにくい。 | ❌ | po_decision |
| 122 | day27 | つまずきポイント表の「ダイアログが開かない」の原因が「`DialogTrigger`で`asChild`を忘れている」、解決策が「`<DialogTrigger asChild>`を追加する」となっているが、本チュートリアルの実装では `DialogTrigger` を一切使用していない。ダイアログの開閉は `open={!!projectDetail}` で制御するプログラマティックパターンを採 | ❌ | technical_review |
| 123 | day27 | つまずきポイントの `DialogTrigger asChild` が本文実装と矛盾している。本文では `DialogTrigger` を使っていない。 | ❌ | po_decision |
| 124 | day27 | Step 3では `open={!!projectDetail}` を採用している一方、Step 7では `detailOpen` と `selectedProject` を別管理しており、教材として状態管理方針がぶれている。 | ❌ | po_decision |
| 125 | day27 | `assertMemberPermission`、`isProjectMemberRole`、`PROJECT_MEMBER_ROLE_LABELS`、`TASK_STATUS_LABELS` などの定義元が不明で、初心者が混乱する。 | ❌ | po_decision |
| 126 | day29 | Step 3〜6が同一ファイル（src/app/user/[id]/page.tsx）を段階的に修正するが、「このコードをどこに追加するか」の指示が曖昧な箇所がある。特にStep 4の「return文を書き換えます」やStep 6の「Separatorと閉じタグの間に追加」は、初心者がファイル内の正確な位置を把握するのが難しい。 | ❌ | ux_review |
| 127 | day29 | 一般ユーザーが他人のプロフィールを見るケースを『ボタン非表示』や『閲覧のみ』として説明しているが、実際は getById で FORBIDDEN になりページ自体に入れない。 | ❌ | po_decision |
| 128 | day29 | 『このユーザーって誰？を確認したくなる』という一般閲覧ユースケースを提示しているが、実装上は一般ユーザーは他人の詳細を見られない。 | ❌ | po_decision |
| 129 | day29 | 同一ファイルを段階的に編集する説明で、どこに追加・置換するかが曖昧な箇所がある。 | ❌ | po_decision |
| 130 | day30 | Step 7 と Step 5 で同じスクリーンショット（./screenshots/dashboard.png）が3回使用されている。Step 7 の「完成したアプリの全画面」も dashboard.png を参照しており、適切なスクリーンショットではない。 | ❌ | technical_review |
| 131 | day30 | dashboard.png が Step 4 と Step 7 で合計3回使われている。異なる画面を見せるべき場面で同じ画像を使っても学習効果がない。 | ❌ | ux_review |
| 132 | day30 | Step 3 で Git push（ターミナル）、Vercel ダッシュボード操作（UI）、package.json 確認（ファイル）の3つを同時に扱っている。 | ❌ | ux_review |
| 133 | day30 | 卒業セクションの『卒業チェックリスト』『技術スタック表』『次のステップ表』が Steps 5-7 の内容とほぼ重複しており、同じ情報を2回読まされる。 | ❌ | ux_review |
| 134 | day30 | Step 3 に Git 操作、Vercel GUI 操作、package.json 確認が混在しており、学習負荷が高い。 | ❌ | po_decision |
| 135 | day30 | 同じ screenshot（dashboard.png）が複数ステップで使い回され、文脈に合っていない。 | ❌ | po_decision |
| 136 | day30 | Steps 5-7 と卒業セクションが内容重複しており、最終日の締めとして冗長。 | ❌ | po_decision |

### Minor（112件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | Step 5の `code` コマンドが見つからない場合のトラブルシューティングが `Cmd+Shift+P` のみでMac限定。Windowsの場合（`Ctrl+Shift+P`）の記載がない。 | ❌ | ux_review |
| 2 | day01 | Step 12のログイン情報テーブルの後に、テストアカウントの補足情報が改行区切りの引用ブロックで書かれているが、65文字制限対応のためか不自然な改行が入っている。 | ❌ | ux_review |
| 3 | day02 | Step 9のコードブロックでTASK_PRIORITY_LABELSを表示しているが、型注釈の Record<TaskPriority, string> で参照している TaskPriority 型がこのコードブロック内で定義されていない。初心者は「TaskPriorityはどこから来たの？」と疑問に思う可能性がある。 | ❌ | technical_review |
| 4 | day02 | Step 2→3→4→5→6→7とdashboard/page.tsxを繰り返し変更しますが、各ステップ完了後のファイル全体像が示されていません。初心者は「今ファイルがどうなっているべきか」を見失いやすいです。 | ❌ | ux_review |
| 5 | day02 | Step 9のRecord<TaskPriority, string>でTaskPriorityの定義元説明が不足している。 | ❌ | po_decision |
| 6 | day03 | Step 6は「git status」「git diff」「git log」「2回目のcommit+push」の4つの活動を含んでおり、10分の見積もりに対して内容が多い。1ステップ=1活動の原則からやや逸脱。 | ❌ | ux_review |
| 7 | day03 | 冒頭の「なぜこれを作るのか？」セクションで、GitHubの魅力として「バックアップ」と「チーム開発」を挙げているが、初心者が個人で学習している段階では「チーム開発」はピンと来にくい。 | ❌ | ux_review |
| 8 | day03 | Step 4でPAT(classic)を推奨しているが、GitHub公式はFine-grained PATを推奨する方向に移行している。classic tokenは将来的に非推奨になる可能性がある。 | ❌ | ux_review |
| 9 | day03 | Step 7 の見出しだけ絵文字付きで、他ステップと表記ルールが揃っていない。 | ❌ | po_decision |
| 10 | day04 | Step 7で`$ open https://...`コマンドを使用しているが、`open`コマンドはmacOS専用。Linux（`xdg-open`）やWindows（`start`）では動作しない。 | ❌ | technical_review |
| 11 | day04 | Step 4でCI/CD（継続的インテグレーション/継続的デリバリー）と説明しているが、VercelのGitHub連携はCD（継続的デリバリー/デプロイ）のみ。CI（テスト自動実行等）はVercel単体では行わない。初心者に不正確な理解を与える。 | ❌ | technical_review |
| 12 | day04 | Step 4で「CI/CD（継続的インテグレーション/継続的デリバリー）」という用語が唐突に登場するが、括弧内の日本語訳だけで例え話や具体的な説明がない。初心者にとって「継続的インテグレーション」は訳語を読んでも意味がわからない。 | ❌ | ux_review |
| 13 | day04 | 次回予告が「Day 5ではログイン画面のUIを作ります」と書かれているが、Day 04との繋がり（今日デプロイしたアプリに、これからUI を作っていく）が薄い。 | ❌ | ux_review |
| 14 | day04 | `open` コマンドはmacOS依存で、WindowsやLinuxではそのまま使えない。 | ❌ | po_decision |
| 15 | day04 | Neonの接続文字列の扱いに関する注意が弱く、平文保存やGitへの誤コミットのリスク説明が不足している。 | ❌ | po_decision |
| 16 | day05 | Step 3で『LoginFormコンポーネント内の先頭に追加』、Step 7でも『LoginFormコンポーネント内の先頭に追加』と記載。Step 7時点ではStep 3のuseFormが既に先頭にあるため、『先頭』がどこを指すのか初心者には分からない。 | ❌ | ux_review |
| 17 | day05 | スクリーンショットが login.png（3回）と login-error.png（1回）の2種類のみ。Step 1完了時点の素のh1タグ表示や、Step 3完了時点のフォーム途中状態など、中間ステップの画面が確認できると学習者の安心感が増す。 | ❌ | ux_review |
| 18 | day05 | 『コンポーネント内の先頭に追加』という指示が複数回出てきて位置が曖昧。 | ❌ | po_decision |
| 19 | day05 | tree 形式のファイル位置説明がなく、初心者が対象ファイルの場所を把握しにくい。 | ❌ | po_decision |
| 20 | day05 | 『サーバー側の認証処理（Day 7）』の記述が Day 7 の実内容とずれている可能性がある。 | ❌ | po_decision |
| 21 | day06 | 最終的な完成コード全体が提示されておらず、学習者が自分のコードを照合しにくいです。 | ❌ | po_decision |
| 22 | day07 | Step 6でjwt.ioにJWTトークンを貼り付ける手順を説明しているが、本番環境のJWTを外部サイトに貼り付けてはいけないという注意書きがない。開発環境での学習用途なので実害はないが、習慣として「本番トークンは絶対に外部サイトに貼らない」旨を一言添えるべき。 | ❌ | technical_review |
| 23 | day07 | Step 3のチャレンジでsetExpirationTime('7d')を'1d'に変更する際、JWTのexp（1日）とCookieのmaxAge（7日間）の不整合が生じることに触れていない。Cookieは7日残るがJWTは1日で期限切れになるため、2日目以降にCookieが残っているのにセッション無効という状態が起きうる。学習としてはこの矛盾を説明する価値がある。 | ❌ | technical_review |
| 24 | day07 | Step 5で `callbackUrl` が突然登場しますが、この変数が何を指すか（ログイン後のリダイレクト先URL）の説明がありません。初心者は「これは何？」と立ち止まります。 | ❌ | ux_review |
| 25 | day07 | Step 5のトースト改善で `\n`（改行文字）が使われていますが、プログラミング初心者には `\n` が改行を意味することが自明ではありません。 | ❌ | ux_review |
| 26 | day07 | Step 5 の `\n` は react-hot-toast で期待どおり改行表示されない可能性がある。 | ❌ | po_decision |
| 27 | day07 | Step 5 で `callbackUrl` が突然出てきて意味説明がない。 | ❌ | po_decision |
| 28 | day07 | Step 6 で jwt.io にトークンを貼る手順があるが、本番トークンを外部サイトに貼ってはいけない注意がない。 | ❌ | po_decision |
| 29 | day07 | Step 3 の `1d` 変更で JWT と Cookie の期限不整合が起きる点、Step 4 の sameSite 緩和でセキュリティが弱まる点の説明が不足している。 | ❌ | po_decision |
| 30 | day08 | Step 4とStep 5の両方が`./screenshots/sidebar.png`を参照しています。Step 5のログアウト確認ダイアログは別の状態（ダイアログが開いた状態）のスクリーンショットが適切ですが、同じ画像を指しています。 | ❌ | technical_review |
| 31 | day08 | Step 3は「ファイルの存在確認（ls）」と「コンポーネント一覧の確認」だけで、実際に手を動かす作業がほぼない。4分のステップとしては薄い。 | ❌ | ux_review |
| 32 | day08 | Step 4（ユーザー情報追加）とStep 5（ログアウトボタン追加）は同じファイルを修正し、かつStep 5のコードはStep 4で追加したdivの中に入る。初心者にとって「Step 4で追加したコードのどこにStep 5を入れるか」が分かりにくい。 | ❌ | ux_review |
| 33 | day08 | サイドバー完成画面とログアウトダイアログ画面で同じ画像を参照している。 | ❌ | po_decision |
| 34 | day08 | AlertDialogの存在確認だけでは4分の学習価値として弱い。読むだけでも理解が深まる設計にしたい。 | ❌ | po_decision |
| 35 | day08 | JWT、bcrypt、HttpOnly Cookie を並べているが、Day 08で直接つながるのはセッション確認とログアウト導線である。 | ❌ | po_decision |
| 36 | day09 | 「📋 今日のまとめ」セクションにアーカイブ表示の切替や、未来のDay（10-12）で実装する機能の整理がない。Step 4, 7, 8で「Day XX で本実装」と書いているが、まとめで一覧化されていない。 | ❌ | technical_review |
| 37 | day09 | Step 7 で `Record<string, unknown>` という型を説明なく使用している。初心者には馴染みのない型であり、なぜこの型を使うのか、後で何に置き換わるのかが不明瞭。 | ❌ | ux_review |
| 38 | day09 | Step 8 の `useEffect` は初心者にとって難易度が高い概念だが、なぜ `useEffect` が必要なのか（URLパラメータの変化を監視する理由）の説明が薄い。 | ❌ | ux_review |
| 39 | day09 | Step 9 の動作確認が手順リストのみで、コマンドやブラウザでの具体的な操作手順（DevToolsでの確認方法等）が不足している。 | ❌ | ux_review |
| 40 | day10 | Step 1の冒頭の例え話で「AppLayout は建物の共通設備でしたが」と過去のDayの概念を参照していますが、Day 9でAppLayoutを扱ったかどうかの文脈がないため、初めてこの例え話に触れる読者には唐突に感じます。 | ❌ | ux_review |
| 41 | day10 | Step 3のコードブロックでコンポーネント関数の開始（`export function ProjectDialog({...}) {`）が始まりますが、閉じ括弧がStep 6まで登場しません。初心者はどこで関数が終わるのか把握しにくいです。 | ❌ | ux_review |
| 42 | day10 | 全体的にトーンは良好ですが、Step 4以降は説明が技術的になり、励ましや進捗の実感を与える言葉が減ります。 | ❌ | ux_review |
| 43 | day10 | Step 2 のフィールド表に `endDate` が欠けており、スキーマ説明が不完全。 | ❌ | po_decision |
| 44 | day10 | 今日のゴールと Step 5 で同じスクリーンショットを使っており、学習進行に対する視覚情報が適切でない。 | ❌ | po_decision |
| 45 | day10 | Day 09 で何が準備済みかが曖昧で、Day 10 の前提が読み取りにくい。 | ❌ | po_decision |
| 46 | day11 | 「今日学んだ用語」テーブルに「キャッシュ無効化（invalidate）」が含まれていないが、これはこのDayで頻出する重要概念。一方「楽観的更新」は概念テーブルにあるのに用語テーブルには記載がなく不整合。 | ❌ | technical_review |
| 47 | day11 | Step 7の動作確認セクションにスクリーンショット指定がない。最終動作確認はスクリーンショットで示すべき場面。 | ❌ | technical_review |
| 48 | day11 | window.confirm()はブラウザネイティブのダイアログで、shadcn/uiのデザインと統一感がない。教材としてshadcn/uiを教えているのにネイティブダイアログを使うのは一貫性に欠ける。 | ❌ | ux_review |
| 49 | day11 | Step 1の `...(startDate && { startDate })` は初心者には難解なパターン。💡の説明は1文だけで、なぜこの書き方が必要なのか（undefinedをオブジェクトに含めたくない理由）が不足。 | ❌ | ux_review |
| 50 | day11 | 頻出する `invalidate` が用語表にない一方、未実装の概念が前面に出ていて整合性が悪い。 | ❌ | po_decision |
| 51 | day12 | Step 2 でコードブロックが5つに分割されているが、一つのJSX構造を細かく切りすぎていて全体像が掴みにくい。閉じタグの対応関係も見えにくい。 | ❌ | ux_review |
| 52 | day13 | Step 5のhandleEdit/handleDeleteに「Day 15 で本実装に差し替え」「Step 7 で本実装に差し替え」とコメントがあるが、初心者にとって『空の関数を仮で置く』パターンは馴染みがなく、不安を感じやすい。 | ❌ | ux_review |
| 53 | day13 | Step 3のコードブロックが閉じタグだけの断片になっており、単独で理解・利用できない。 | ❌ | po_decision |
| 54 | day14 | スクリーンショットが4箇所あるが、3箇所が同じ画像（task-create-dialog.png）を参照している。初心者は各ステップで画面がどう変化するかを見たいが、同じ画像では進捗感が得られない。 | ❌ | ux_review |
| 55 | day14 | 全体的にやや淡々としており、初心者が達成感を感じるポイント（例: 初めてダイアログが開いた瞬間、タスクが作成できた瞬間）での盛り上がりが不足している。 | ❌ | ux_review |
| 56 | day14 | Step 4のタイトルは「タイトル・説明の入力欄を作る」だが、実際にはhandleClose、handleFormSubmit、Dialog構造、タイトル入力、説明入力の5つの要素を含んでおり、1ステップとしては過密。 | ❌ | ux_review |
| 57 | day14 | SelectTrigger の `aria-label` が省略されている。 | ❌ | po_decision |
| 58 | day15 | Step 5のhandleDeleteとDeleteConfirmDialogのコードブロックの間に「続いて、JSXに〜を配置します」とあるが、JSXのどの位置に配置するかが不明。return文内のどこに入れるのかが分からない。 | ❌ | ux_review |
| 59 | day15 | Step 1は既存コードの解説のみで新しいコードを書かない。初心者は「手を動かしたい」のに読むだけのステップが最初に来ると、モチベーションが下がりやすい。 | ❌ | ux_review |
| 60 | day15 | DeleteConfirmDialog を使う理由が弱く、window.confirm() を使わない設計意図が伝わらない。 | ❌ | po_decision |
| 61 | day15 | Step 1 が読むだけで終わるため、導入としては悪くないが、手を動かす期待とのズレがある。 | ❌ | po_decision |
| 62 | day16 | Step 1は `updateMutation.mutate()` の呼び出しを断片的に示しているだけで、どのファイルのどの位置に記述するかが不明確。「Day 15 で定義済み」とあるが、完全なコンテキスト（どのイベントハンドラーから呼ぶか、StatusBadgeのクリックハンドラー等）が示されていない。 | ❌ | technical_review |
| 63 | day16 | 同じスクリーンショット `./screenshots/task-timer.png` が3回使われている（冒頭、Step 3後、Step 6後）。Step 3はタイマーカウントアップのステップなので、タイマー動作中の画面が適切。Step 6は手動時間記録ダイアログなので別のスクリーンショットが望ましい。 | ❌ | technical_review |
| 64 | day16 | TaskTimerコンポーネントがStep 2〜5の4ステップにまたがって構築されますが、最終的な完成形が一箇所にまとまっていないため、初心者が全体像を把握しにくいです。 | ❌ | ux_review |
| 65 | day16 | TaskTimer と TimeLogDialog が複数ステップに分散しており、初心者が最終構成を把握しにくい。 | ❌ | po_decision |
| 66 | day17 | 3箇所のスクリーンショットが全て同じ画像（my-task.png）を参照している。構築途中の画面変化が分からず、学習者は自分の進捗が正しいか確認できない。 | ❌ | ux_review |
| 67 | day18 | Step 7の動作確認が番号付きリストだけで、達成感を演出する工夫がない。初心者が完成を実感しにくい。 | ❌ | ux_review |
| 68 | day18 | 実装にある日時表示や空コメント時のプレースホルダーが教材に含まれていない。 | ❌ | po_decision |
| 69 | day19 | 「Day 15 の編集モードと同じパターンです」「Day 18 と同じく」など「同じ」が3回使われている。品質チェックスクリプトで「おなじ」が検出される可能性がある。 | ❌ | ux_review |
| 70 | day19 | Step 2で「TaskPageContent内に追加」とコメントがあるが、コンポーネント内のどの位置（他のstateの近く？return文の前？）に追加すべきか不明。初心者は正確な挿入位置がわからないと不安になる。 | ❌ | ux_review |
| 71 | day19 | 冒頭の「なぜこれを作るのか？」セクションが「誤字の修正や情報の更新に必要な機能です」の1文だけで薄い。編集・削除機能の実用的な価値をもう少し伝えるとモチベーションが上がる。 | ❌ | ux_review |
| 72 | day19 | 『なぜこれを作るのか』が薄く、実務での価値が伝わりにくい。 | ❌ | po_decision |
| 73 | day20 | Step 4 の useEffect で URL パラメータから state を同期しているが、useState の初期値として既に `searchParams.get()` を使用している。この useEffect はブラウザの戻る/進む操作時に必要だが、教材でその理由が説明されていない。また依存配列に `searchParams` のみで setter 関数を含めていないのは ESLint 警 | ❌ | technical_review |
| 74 | day20 | 4箇所のスクリーンショットのうち3箇所が同じ画像（search-results.png）。視覚的な変化がなく、進捗感が薄い。 | ❌ | ux_review |
| 75 | day21 | Step 6は「レスポンシブ対応」ですが、レスポンシブのクラス（grid-cols-1, sm:grid-cols-2, lg:grid-cols-4）はStep 5で既に実装済みです。Step 6は実質的に確認作業のみで、新しいコードの追加がありません。 | ❌ | ux_review |
| 76 | day21 | Step 6の補足説明で「Day 09 のプロジェクト一覧やDay 13 のタスク一覧と同じレスポンシブグリッドパターンです」と「同じ」を使用しています。 | ❌ | ux_review |
| 77 | day21 | report.png が3箇所（今日のゴール、Step 5完了後、Step 7）で参照されていますが、全て同一画像です。異なる状態（ローディング中、モバイル表示等）のスクリーンショットがあるとより分かりやすくなります。 | ❌ | ux_review |
| 78 | day21 | 同一スクリーンショットの重複使用で、ローディング状態やモバイル表示など学習上重要な状態差分が伝わりにくい。 | ❌ | po_decision |
| 79 | day22 | 予備知識テーブルにBarChart, LineChart, XAxis, YAxis, CartesianGrid等、今日使わないコンポーネントが多数含まれている。初心者は『これも全部使うの？』と混乱する可能性がある。 | ❌ | ux_review |
| 80 | day22 | 中間確認用の画面差分がなく、段階的な達成感と確認性が弱い。 | ❌ | po_decision |
| 81 | day22 | 今日使わない Recharts コンポーネントが多く、学習焦点がぼやけている。 | ❌ | po_decision |
| 82 | day23 | 「Day 22で学んだfilter」と書いてあるが、filterはDay 22で初めて学んだわけではなく、JavaScriptの基本メソッドとして以前から使われているはず。誤解を招く表現。 | ❌ | ux_review |
| 83 | day24 | 同じスクリーンショット `./screenshots/user-list.png` がStep 3、Step 5、Step 8で3回使い回されている。各ステップでの進捗が視覚的に区別できない。 | ❌ | technical_review |
| 84 | day24 | コードが細かく分割されすぎて、各断片の間の関係（特にJSXの入れ子構造）が見えにくくなっています。Step 4のテーブルコードが3つのブロックに分かれており、TableHeader → TableBody → TableCell の関係が分かりにくいです。 | ❌ | ux_review |
| 85 | day25 | Step 3とStep 4で同じスクリーンショット `./screenshots/profile.png` が3回参照されている。Step 4のナビゲーションボタン部分は別のスクリーンショット（ボタンが見える状態）があるとより教育的。 | ❌ | technical_review |
| 86 | day25 | 全11ステップを通じて、学習者を励ます表現がほとんどない。ステップ間の接続が機械的で、達成感を感じるポイントがない。 | ❌ | ux_review |
| 87 | day26 | Step 2は「コードを読む」だけの受動的なステップで、4分間読むだけの体験は初心者にとって退屈になりやすい。error.tsxのコード解説は有益だが、読むだけでは集中力が切れる。 | ❌ | ux_review |
| 88 | day26 | Step 5ではnpx biome check、Step 7ではnpm run lintを使っており、初心者向け教材としてコマンドの使い分け説明が不足している。 | ❌ | po_decision |
| 89 | day26 | Step 6とStep 7の間に所属不明のbashコードブロックがあり、読み手が実行対象か参考情報か判断しづらい。 | ❌ | po_decision |
| 90 | day26 | Step 5の『returnの直前に追加』は初心者には貼り付け位置が曖昧で、どのスコープ内かが伝わりにくい。 | ❌ | po_decision |
| 91 | day27 | 「新しく学ぶ概念」テーブルに `&&` 演算子レンダリングが記載されているが、チュートリアル本文中で `&&` レンダリングを新概念として明示的に教える箇所がない。Step 3 と Step 4 で `{projectDetail && (...)}` のパターンが使われているが、「これが `&&` レンダリングです」という導入説明がない。 | ❌ | technical_review |
| 92 | day27 | 複数のコード行が65文字を超えている。例: Step 4 の `className="flex items-center justify-between p-2 rounded-lg border bg-card"` は78文字、Step 5 の `className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-muted | ❌ | technical_review |
| 93 | day27 | いくつかのコードブロック内の行が65文字を超えています。例：className="flex items-center justify-between p-2 rounded-lg border bg-card"（約68文字）、className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-muted/50 transiti | ❌ | ux_review |
| 94 | day27 | Step 4 が5つのコードブロックに分割されており、1ステップとしては情報量が多く、初心者が途中で迷子になる可能性があります。特にアバターのフォールバックロジック、名前表示、バッジ、削除ボタンが連続で出てくるため、全体像が見えにくくなっています。 | ❌ | ux_review |
| 95 | day27 | project-detail-dialog.tsx の完成形（全コードを組み合わせた状態）が示されていません。Step 2〜6で段階的に構築していますが、最終的にどのような1つのファイルになるのかが不明確です。初心者はコードブロックをどの順序で組み合わせるか迷います。 | ❌ | ux_review |
| 96 | day27 | 提示スキーマが実ファイルと大きく異なり、Step 3で使う `color` も見えていないため混乱の余地がある。 | ❌ | po_decision |
| 97 | day27 | 65文字を超える行が複数あり、PDF変換時に切れる可能性が高い。 | ❌ | po_decision |
| 98 | day27 | 段階的にコードを追加しているが、最終的なファイル構成が見えにくい。 | ❌ | po_decision |
| 99 | day28 | Step 4.5 という小数点のステップ番号は初心者にとってやや不自然。学習者が「次は Step 5 だ」と思ったときに 4.5 が挟まると混乱する可能性がある。 | ❌ | ux_review |
| 100 | day28 | Step 3 で突然 TaskCard・handleEdit・handleDelete・handleTaskClick・handleCreate が登場するが、これらが過去のDayで作成済みであることへの言及がない。初心者は「この関数はどこで定義したの？」と不安になる可能性がある。 | ❌ | ux_review |
| 101 | day28 | Step 5 のコードに {/* Step 6, 7, 8 でボタンを追加 */} というプレースホルダーがある。初心者はこの時点で「何を書けばいいの？」と戸惑う可能性がある。 | ❌ | ux_review |
| 102 | day28 | Step 3 が 8 分で、ルールの 3〜7 分を超過している。 | ❌ | po_decision |
| 103 | day28 | Step 3 で TaskCard や既存 handler 群が突然登場し、過去 Day の実装済み要素であることが明示されていない。 | ❌ | po_decision |
| 104 | day28 | Step 1 で bulkComplete と bulkUpdateStatus は扱う一方、bulkDelete の読むだけ説明が欠けている。 | ❌ | po_decision |
| 105 | day28 | Step 4.5 という番号は初心者にやや不自然で、進行感を乱す可能性がある。 | ❌ | po_decision |
| 106 | day29 | Step 7「Step 3 と同じパターンで」、Step 8「Day 22 で学んだ useEffect パターンと同じく」が品質チェッカーの「同じように」「同じ方法で」検出に引っかかる可能性がある。コード自体は省略せず全文記載されているため実害は少ないが、チェッカー対策が必要。 | ❌ | ux_review |
| 107 | day29 | Step 8の handleChange 関数で使われる computed property name（[name]: value）は JavaScript の高度な構文だが、「変数の値をキー名として使う」と1文で済ませている。Day 29まで来た初心者でも、この構文は初見の可能性が高い。 | ❌ | ux_review |
| 108 | day29 | Day 29完了セクションの「今日学んだこと」テーブルは網羅的だが、9行あり情報量が多い。Day 29まで頑張ってきた学習者への労いや達成感の演出がやや薄い。 | ❌ | ux_review |
| 109 | day30 | Step 1 で JWT_SECRET の説明に「JWT トークンの署名に使う秘密鍵」と書いているが、jose ライブラリで HMAC 署名に使う共有秘密鍵であることをより正確に説明すべき。また openssl rand -base64 32 の出力は44文字（32バイトのBase64エンコード）であり、「ランダム32文字以上」という説明と若干ずれる。 | ❌ | technical_review |
| 110 | day30 | CI/CD の概念が表で『自動配送システム』と一言だけ紹介されているが、初心者には不十分。初出の新概念には括弧書き＋例え話が必須ルール。 | ❌ | ux_review |
| 111 | day30 | Step 4 のコードブロック内に『echo "公開URLで動作確認してください"』とあり、実質的にユーザーへの作業依頼になっている。ただし最終日のデプロイ確認は手動が必要な場面なので致命的ではない。 | ❌ | ux_review |
| 112 | day30 | JWT_SECRET の説明が『32文字以上』となっており、openssl rand -base64 32 の意味とズレている。 | ❌ | po_decision |


## インフラ/APIエラー（1件）

### Critical（1件）

| # | Day | 指摘内容 | 自動修正 | ソース |
|---|-----|---------|---------|--------|
| 1 | day01 | APITimeoutError: Request timed out. | ✅ | po_decision |
