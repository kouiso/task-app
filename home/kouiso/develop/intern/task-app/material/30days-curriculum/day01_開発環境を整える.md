=== REVIEW RESULT ===
STATUS: NEEDS REVISION

CHECKLIST:
✅ Japanese です・ます style: PASS  
✅ Metaphors correct: FAIL  
✅ No jargon: FAIL  
✅ Real code: FAIL  
✅ Structure correct: PASS  
✅ Length appropriate: FAIL  

ISSUES (if any):
1. メタファーが「1概念=1メタファー」になっていません（中盤以降）。
   - 例：「開発環境＝キッチン」までは良いですが、Node.jsを「コンロ」、npm scriptsを「メニュー表」、DBを「冷蔵庫」、Docker Composeを「家電レンタル」と、概念ごとに比喩が増えすぎて混乱しやすいです。
   - 修正案：この章はタイトル通り「キッチン準備」に寄せ、比喩を“キッチン”に統一し、各要素はキッチン内の同一世界観で説明してください（例：Node.js=コンロ、DB=冷蔵庫、Docker=家電を箱で運ぶ、Compose=家電の配置図、などに整理し、増やしすぎない）。

2. 技術用語の初出説明が不足しています（「No jargon」違反）。
   - 「npm scripts」という用語が初出で、説明が「npm」「script」だけになっています。「npm scripts（エヌピーエム・スクリプト：package.jsonに登録した“よく使うコマンドのショートカット”）」のように、用語としてまとめて説明が必要です。
   - 「Next.js」「Prisma」「Vitest」などがコード内に出ますが、本文で初出説明がありません。
     - Next.js（ネクストジェイエス：ReactでWebアプリを作るための枠組み）
     - Prisma（プリズマ：データベース操作を楽にする道具）
     - Vitest（ヴァイテスト：自動テストを動かす道具）
   - 「依存関係」も初心者には難しいため、依存関係（いぞんかんけい：アプリが動くために必要な部品の集まり）などの補足があると安全です。

3. コード例がリポジトリ実物と一致していません（「Real code」違反）。
   - docker-compose.yml の healthcheck が不一致です。
     - 実物:  
       `test: ["CMD-SHELL", "pg_isready -U user"]`  
       `interval: 5s` / `timeout: 5s` / `retries: 5`
     - チュートリアル内:  
       `test: pg_isready -U user -d taskapp`（形式も内容も違う）  
       `interval: 10s`（実物と違う）
   - 修正案：docker-compose.yml の該当箇所を“そのまま”貼り、説明もそれに合わせてください（配列形式の `test: ["CMD-SHELL", "..."]` を初心者向けに噛み砕く）。

4. 文字数が要件（3,000〜5,000文字）に届いていない可能性が高いです（「Length appropriate」違反）。
   - 現状は見た目で約1,800〜2,500文字程度に見えます（厳密計測は未実施ですが不足傾向）。
   - 修正案：初心者が迷うポイント（インストール前提、Nodeの確認、Docker起動確認、よくあるエラー）をもう少し丁寧に追記し、3,000文字以上にしてください。ただし冗長にはせず、1文40文字目安を維持してください。

5. 検証手順が「初心者がそのまま実行できる」粒度にあと一歩です。
   - `docker compose up -d db` の前提として「Docker Desktopが起動している」などの一言があると安心です。
   - `npm install` の意味（部品を揃える）を比喩で補うと離脱が減ります。

FINAL NOTES:
- 全体の流れ（Problem→Metaphor→Code→Verify→Summary）は良いです。初心者の不安に寄り添う文も適切です。  
- ただし「コードは実物と完全一致」が絶対条件です。特に docker-compose.yml の healthcheck は必ず修正してください。  
- 次の改稿では、(1) docker-compose のコード一致、(2) 用語の初出説明追加、(3) 比喩の整理、(4) 3,000〜5,000文字に調整、の4点を必須対応でお願いします。