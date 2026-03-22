# Day 03: GitHubに保存しよう

## 🔙 前回の振り返り

Day 02 ではダッシュボードにウェルカムバナーを追加しながら、`const`・`let` による変数宣言と `string`・`number`・`boolean` の型の基本を学びました。コードを編集してアプリに反映できるようになったので、今日はそのコードを GitHub に保存する方法を学びます。

---

## 🎯 今日のゴール

あなたが書いたコードをGitHubに保存できるようになります。GitHubに保存することで、コードのバックアップを取ったり、他の人と共有したりできます。

> 📸 GitHub のリポジトリページ（`https://github.com/<ユーザー名>/task-app`）を開き、コードがアップロードされていることをブラウザで確認してください。

### 前提

Day 01で教材リポジトリを `git clone` 済みで、Day 02でウェルカムバナーを追加済みです。Day 03ではその変更を「自分のGitHub」に保存します。

## 🤔 なぜこれを作るのか？

コードを書いていると、「間違えて削除してしまった」「前の状態に戻したい」という場面に出会います。GitHubに保存しておけば、いつでも過去の状態に戻せます。さらに、チームで開発する際にも、GitHubが中心的な役割を果たします。

> 💡 **例え話**: GitHubは、Googleドライブのようなものです。コードをクラウドに保存しておけば、パソコンが壊れてもデータは残り、安心して開発を進められます。

### 📐 Git操作の流れ

```mermaid
flowchart LR
    A[ファイルを編集] --> B[git add<br/>変更を選択]
    B --> C[git commit<br/>変更を記録]
    C --> D[git push<br/>GitHubに送信]
    D --> E[(GitHub<br/>クラウド保存)]
```

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | Gitの初期設定 | 5分 |
| Step 2 | リポジトリを作成 | 5分 |
| Step 3 | 変更をコミット | 10分 |
| Step 4 | GitHub認証を設定する | 10分 |
| Step 5 | GitHubにプッシュ | 5分 |
| Step 6 | Gitの便利コマンドを体験 | 10分 |
| Step 7 | .gitignore を理解しよう | 5分 |

**合計時間**: 約50分

---

### Step 1: Gitの初期設定（5分）

🎯 **ゴール**: Gitに自分の名前とメールアドレスを設定します。

🔰 **初心者向け解説**: Gitは、誰がいつコードを変更したのかを記録します。そのために、あなたの名前とメールアドレスを最初に設定する必要があります。設定は一度だけ行えば、それ以降は自動的に記録されます。

💻 **実装**:

```bash
# filepath: ターミナル
git config --global user.name "<あなたの名前>"
git config --global user.email "<あなたのメールアドレス>"

# 設定内容を確認
git config --list
```

🔍 **コード解説**:

| コマンド | 意味 | 例え |
|--------|------|------|
| `git config --global user.name` | Gitに名前を設定 | 作品に著者名を書く |
| `git config --global user.email` | Gitにメールアドレスを設定 | 著者の連絡先を添える |
| `--global` | 全プロジェクトで共通の設定 | 全ての作品に同じ署名を使う |

✅ **確認ポイント**:

1. `git config --list`で設定を確認
2. `user.name`と`user.email`が表示される
3. これでGitの初期設定が完了です

> 📸 ターミナルで `git config --list` を実行し、`user.name` と `user.email` が正しく表示されていることを確認してください。

📝 **学んだこと**: `git config`コマンドで、Gitに自分の情報を登録できるようになりました。

---

### Step 2: リポジトリを作成（5分）

🎯 **ゴール**: GitHubに新しいリポジトリを作成します。

🔰 **初心者向け解説**: リポジトリは、コードを保存する「プロジェクトフォルダ」のようなものです。GitHubのWebサイトから、新しいリポジトリを作成できます。リポジトリ名は、プロジェクトの内容がわかりやすい名前にしましょう。

📝 **手順**:

1. ブラウザで`https://github.com`にアクセス
2. 右上の「+」ボタンをクリック
3. 「New repository」を選択
4. リポジトリ名に`task-app`と入力
5. 「Public」を選択（公開リポジトリ）
6. 「Create repository」をクリック

🔍 **設定項目**:

| 項目 | 設定値 | 意味 |
|------|--------|------|
| Repository name | `task-app` | リポジトリの名前 |
| Public/Private | Public | 誰でも見られる |
| Initialize this repository | チェックしない | チェックするとREADME.md等を含む初期コミットがリモートに作られ、ローカルの既存履歴と異なる履歴（unrelated histories）になるためpushが拒否される |


✅ **確認ポイント**:

1. GitHubに新しいリポジトリが作成される
2. リポジトリのURLが表示される（`https://github.com/<あなたのユーザー名>/task-app`）
3. 「Initialize this repository」にチェックを入れていないこと

> 📸 GitHub のリポジトリページが表示され、`https://github.com/<ユーザー名>/task-app` の URL が確認できることをブラウザで確認してください。

📝 **学んだこと**: GitHubのWebサイトから、新しいリポジトリを作成できるようになりました。

---

### Step 3: 変更をコミット（10分）

🎯 **ゴール**: ローカルの変更をGitに記録します。

🔰 **初心者向け解説**: コミットは、「この時点のコードを保存する」という操作です。ゲームのセーブポイントのようなもので、いつでもこの時点に戻れます。コミットメッセージには、何を変更したのかを簡潔に書きます。

まず、Day 02で変更したファイルを確認します。

💻 **実装**:

```bash
# filepath: ターミナル（task-appフォルダ内で実行）
# 変更されたファイルを確認する
git status
```

✅ **確認ポイント**:
- Day 02で変更した `src/app/dashboard/page.tsx` が表示される

変更を確認できたら、ステージング（コミット前の準備場所に追加）してコミット（記録）します。

```bash
# filepath: ターミナル（task-appフォルダ内で実行）
# 変更をステージングエリアに追加してコミット
git add .
git commit -m "feat: ウェルカムバナーを追加"
```

🔍 **コード解説**:

| コマンド | 意味 | 例え |
|--------|------|------|
| `git add .` | 全ての変更をステージングエリア（コミット前の準備場所）に追加。`.`は「このフォルダの全ファイル」の意味 | 引っ越しリストに荷物を書き込む |
| `git commit -m "メッセージ"` | 変更を記録する | セーブボタンを押す |

> ⚠️ `git add .` は全ファイルをまとめて追加しますが、`.gitignore` で除外されたファイル（`.env`など）は含まれません。このプロジェクトでは安全です。

✅ **確認ポイント**:

1. `git status`で状態を確認
2. `nothing to commit, working tree clean`と表示される
3. これで変更がコミットされました

> 📸 ターミナルで `git status` を実行し、`nothing to commit, working tree clean` と表示されていることを確認してください。

💡 **コミット履歴を確認するコマンド**:

```bash
# filepath: ターミナル
git log --oneline
```

1 行に 1 コミットが表示されます。コミットが増えていく様子を確認できます。

📝 **学んだこと**: `git add`と`git commit`で、変更をGitに記録できるようになりました。

---

### Step 4: GitHub認証を設定する（10分）

🎯 **ゴール**: GitHubにコードをアップロードするための認証を設定します。

🔰 **初心者向け解説**: GitHubにプッシュするには、「自分が本当にこのアカウントの持ち主だ」とGitHubに証明する必要があります。パスワードだけでは認証できないため、**Personal Access Token（PAT）**という「特別なパスワード」を作成します。

> 💡 **例え話**: 会社のビルに入るとき、社員証（ID＋パスワード）に加えてセキュリティカードが必要なのと同じです。PATがそのセキュリティカードに当たります。

#### 4-1. Personal Access Tokenを作成する

> 💡 このステップを乗り越えれば、次のStep 5でいよいよコードがGitHubに公開されます。あと少しです！

📝 **手順（Fine-grained token推奨）**:

1. ブラウザで `https://github.com/settings/tokens?type=beta` にアクセス
2. 「Generate new token」をクリック
3. 以下の項目を入力：

| 項目 | 設定値 | 説明 |
|------|--------|------|
| Token name | `task-app-token` | トークンの用途メモ |
| Expiration | `90 days` | 有効期限 |
| Repository access | `Only select repositories` → `task-app` | このリポジトリのみ |
| Permissions > Contents | `Read and write` | コードの読み書き |

4. 「Generate token」をクリック
5. **表示されたトークンをパスワードマネージャーなどの安全な場所に保存する**

> ⚠️ **重要**: トークンは**一度しか表示されません**。ページを閉じると二度と見られないので、必ずコピーしてください。保存先にはパスワードマネージャー（1Password、Bitwarden等）の利用を推奨します。メモ帳での平文保存は避けてください。やむを得ず一時的にメモ帳に保存する場合は、使い終わったら必ず削除してください。

#### 4-2. 認証情報を保存する（毎回入力しなくて済むように）

```bash
# filepath: ターミナル
# 認証情報をキャッシュに保存する設定
# （macOSの場合）
git config --global credential.helper osxkeychain

# （Windowsの場合）
git config --global credential.helper manager

# （Linuxの場合）
git config --global credential.helper store
```

🔍 **コード解説**:

| コマンド | 意味 | 例え |
|--------|------|------|
| `credential.helper` | 認証情報の保存方法を設定 | パスワードマネージャーを選ぶ |
| `osxkeychain` | macOSのキーチェーンに保存 | macの鍵束に保存 |
| `manager` | Windowsの資格情報マネージャーに保存 | Windowsの金庫に保存 |
| `store` | Linuxでファイルに保存 | ファイルに書き出す（⚠️ 平文保存。共有PCでは使わないこと） |

> 💡 この設定により、次のStep 5でプッシュするときにユーザー名とトークンを入力すると、2回目以降は自動で認証されます。

✅ **確認ポイント**:

1. Personal Access Tokenが作成できた
2. トークンをコピーして安全な場所に保存した
3. `credential.helper`の設定ができた

> 📸 GitHub の Settings > Developer settings > Personal access tokens ページでトークンが作成されていることを確認してください。

📝 **学んだこと**: GitHubへのプッシュには認証が必要で、Personal Access Token（PAT）を使って安全に認証できるようになりました。

---

### Step 5: GitHubにプッシュ（5分）

🎯 **ゴール**: ローカルのコミットをGitHubにアップロードします。

🔰 **初心者向け解説**: プッシュは、ローカル（あなたのパソコン）のコミットをGitHub（クラウド）にアップロードする操作です。プッシュすることで、他の人もあなたのコードを見られるようになります。

Day 01 で `git clone` したプロジェクトには、既に `origin` リモートが設定されています。まず、リモートURLを自分のリポジトリに変更します。

💻 **実装**:

```bash
# filepath: ターミナル（task-appフォルダ内で実行）
# リモートURLを自分のリポジトリに変更
git remote set-url origin https://github.com/<あなたのユーザー名>/task-app.git
```

✅ **確認ポイント**:
- エラーが出ずにコマンドが完了する

```bash
# filepath: ターミナル（task-appフォルダ内で実行）
# URLが変更されたことを確認する
git remote -v
```

✅ **確認ポイント**:
- `origin` の URL が自分のリポジトリになっている

> 💡 **origin**（オリジン）はGitHubのリポジトリを指す「ニックネーム」です。clone した教材リポジトリの URL を、自分のリポジトリに変更しました。

> 💡 **知っておきたいこと**: `git clone` でコピーしたリポジトリには、教材リポジトリの全コミット履歴が含まれています。push すると、この履歴もすべて自分のリポジトリにアップロードされます。これは「フォーク」に近い操作です。自分が追加したコミットだけでなく、元の履歴もすべて含まれることを覚えておいてください。

```bash
# filepath: ターミナル（task-appフォルダ内で実行）
# GitHubにアップロードする
git push -u origin main
```

> 💡 初回プッシュ時に「Username」と「Password」を聞かれたら、**Username**にはGitHubのユーザー名、**Password**にはStep 4で作成した**Personal Access Token**を入力してください（GitHubのパスワードではありません）。

🔍 **コード解説**:

| コマンド | 意味 | 例え |
|--------|------|------|
| `git remote set-url origin [URL]` | リモートURLを変更 | クラウドの保存先を自分用に変える |
| `git push -u origin main` | GitHubにアップロード。**main**（メイン）はコードの本流となるブランチ名 | クラウドに保存 |

✅ **確認ポイント**:

1. ターミナルに`Branch 'main' set up to track remote branch 'main' from 'origin'`と表示される
2. GitHubのリポジトリページをリロードすると、コードが表示される
3. これでGitHubにプッシュが完了です

> 📸 GitHub のリポジトリページ（`https://github.com/<ユーザー名>/task-app`）をリロードし、ソースコードの一覧が表示されていることをブラウザで確認してください。

📝 **学んだこと**: `git push`コマンドで、ローカルのコミットをGitHubにアップロードできるようになりました。

---

### Step 6: Gitの便利コマンドを体験（10分）

🎯 **ゴール**: `git log`、`git diff`、`git status`を使って、Gitの状態を確認する方法を学びます。

🔰 **初心者向け解説**: Gitはコードの履歴を管理するツールです。

「今どんな状態か」「前とどこが変わったか」「これまでの記録は」を確認するコマンドがあります。

これらを覚えておくと、安心して開発を進められます。

#### 6-1. `git status`で現在の状態を確認

```bash
# filepath: ターミナル
git status
```

🔍 **出力の読み方**:

| 出力メッセージ | 意味 |
|--------------|------|
| `nothing to commit, working tree clean` | 変更なし。すべて保存済み |
| `Changes not staged for commit` | 変更があるがまだ`git add`していない |
| `Untracked files` | Gitが追跡していない新しいファイルがある |

#### 6-2. ファイルを変更して差分を確認

試しに小さな変更を加えて、`git diff`で差分を確認してみましょう。

```bash
# filepath: ターミナル
# README.mdの末尾に1行追加する
echo "" >> README.md
echo "## 学習記録" >> README.md
echo "- Day 01: 環境構築完了" >> README.md
echo "- Day 02: ダッシュボードにバナー追加" >> README.md
echo "- Day 03: GitHubに保存" >> README.md
```

```bash
# filepath: ターミナル
# 変更の差分を確認する
git diff
```

> 💡 `git diff`は、**まだ`git add`していない変更**を表示します。`+`で始まる行が「追加された行」、`-`で始まる行が「削除された行」です。

#### 6-3. `git log`でコミット履歴を確認

```bash
# filepath: ターミナル
# コミット履歴を見やすく表示
git log --oneline
```

🔍 **出力の読み方**:

| 表示 | 意味 |
|------|------|
| `abc1234` | コミットID（短縮版） |
| `Initial commit: setup task-app` | コミットメッセージ |

#### 6-4. 変更をコミットしてプッシュ

```bash
# filepath: ターミナル
git add README.md
git commit -m "docs: 学習記録セクションを追加"
git push
```

> 💡 2回目以降のプッシュは `git push` だけでOKです。`-u origin main`は初回のみ必要です。

✅ **確認ポイント**:

1. `git status`で変更の有無を確認できた
2. `git diff`で変更箇所が表示された
3. `git log --oneline`でコミット履歴が表示された
4. 2回目のプッシュが成功した

> 📸 `git log --oneline` を実行して、2つのコミットが表示されていることを確認してください。

📝 **学んだこと**: `git status`で現在の状態、`git diff`で変更内容、`git log`で履歴を確認できるようになりました。

---

### Step 7: .gitignoreを理解しよう（5分）

🎯 **ゴール**: Gitに追跡させないファイルの設定を理解します。

🔰 **初心者向け解説**: プロジェクトには、Gitに保存すべきでないファイルがあります。パスワードが書かれた設定ファイルや、サイズの大きいライブラリフォルダなどです。`.gitignore`は、Gitに「このファイルは追跡しないで」と伝えるための設定ファイルです。

> 💡 **例え話**: `.gitignore`は「引っ越しで持っていかないものリスト」です。家具（node_modules）は引っ越し先で買い直せるし、日記（.env）は他人に見せたくない。だからリストに書いて「これは運ばないで」と伝えます。

💻 **実装**:

```bash
# filepath: ターミナル
# .gitignore の中身を確認してみましょう
cat .gitignore
```

🔍 **コード解説**:

出力の中から、主要な除外パターンを確認しましょう。

| パターン | 対象 | 理由 |
|---------|------|------|
| `node_modules/` | npm パッケージ | サイズ大、`npm install`で復元可能 |
| `*.env*` | 環境変数ファイル全般 | パスワード等の秘密情報 |
| `!.env.example` | `.env.example` は除外しない | テンプレートとしてGitで管理する |
| `.next/` | ビルド成果物 | `npm run build`で再生成 |

> 💡 **`*.env*` と `!.env.example` の組み合わせ**: `*.env*` で全ての `.env` 系ファイルを除外しつつ、`!.env.example`（`!`は「除外の除外」）でテンプレートだけはGitに残しています。秘密の値は追跡せず、テンプレートは共有する設計です。

次に「追跡する」ものと「追跡しない」ものの判断基準を理解しましょう。

| 判断 | 追跡する | 追跡しない |
|------|---------|-----------|
| ソースコード | ✅ | |
| 設定ファイル | ✅ | |
| パッケージ | | ✅ |
| ビルド成果物 | | ✅ |
| 秘密情報 | | ✅ |

✅ **確認ポイント**:

1. `.gitignore`ファイルの役割を理解した
2. `node_modules/`や`.env`が除外される理由がわかった
3. 「追跡する / しない」の判断基準を理解した

> 📸 ターミナルで `cat .gitignore` を実行し、除外パターンが表示されていることを確認してください。

📝 **学んだこと**: `.gitignore`を使って、Gitに追跡させないファイルを設定できることを理解しました。

---

## 📋 今日のまとめ

- [ ] `git config`でGitの初期設定ができた
- [ ] GitHubで新しいリポジトリを作成できた
- [ ] `git add`と`git commit`で変更を記録できた
- [ ] Personal Access Tokenを作成して認証を設定できた
- [ ] `git push`でGitHubにアップロードできた
- [ ] `git status`、`git diff`、`git log`で状態を確認できた
- [ ] GitHubのリポジトリページでコードを確認できた

## ⚠️ つまずきポイント

| エラー/問題 | 原因 | 解決方法 |
|------------|------|---------|
| `git push`で`Authentication failed` | Personal Access Tokenが間違っている | Step 4に戻ってトークンを再作成し、正しくコピーする |
| `git push`で`Permission denied` | SSH鍵を使おうとしているがHTTPSで設定した | `git remote set-url origin https://github.com/<ユーザー名>/task-app.git`でHTTPSに変更する |
| `fatal: remote origin already exists` | リモートが既に登録されている | `git remote rm origin`で削除してから再登録する |
| `Password`にGitHubのパスワードを入力してしまった | GitHubはパスワード認証を廃止済み | 「Password」にはStep 4で作成した**Personal Access Token**を入力する |
| `git diff`で何も表示されない | 変更がないか、既に`git add`済み | `git diff --cached`でステージング済みの差分を確認する |

## 🔜 次回予告

Day 4では、今日GitHubに保存したアプリを、インターネット上に公開する方法を学びます。Vercelというサービスを使えば、無料でアプリを公開できます。
