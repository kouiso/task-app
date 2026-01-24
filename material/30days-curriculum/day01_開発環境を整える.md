# 開発環境を整える 〜プログラミングの「キッチン」を準備しよう〜

🤔 はじめに

「インストールしたはずなのに、なぜか動かない…」

プログラミングを始めたばかりの頃、このような経験はありませんか？ Node.js（ノードジェイエス）のバージョンが違っていたり、データベース（データベース）の設定がうまくいかなかったり、覚えるコマンド（コマンド）が多すぎて混乱したり…。

この章では、スムーズにプログラミング（料理）ができるように、信頼できる「開発環境（かいはつかんきょう）＝キッチン」を準備します。誰でも同じようにアプリを起動できるようにすることを目指します。

💡 解決策

開発環境は、料理をするための「キッチン」のようなものです。

- アプリのコード（ソースコード）＝ 食材
- Node.jsやDocker（ドッカー）などのツール ＝ コンロや包丁
- データベース ＝ 冷蔵庫（食材を安全に保管）
- コマンド ＝ レシピ

Node.js（ノードジェイエス：JavaScriptを実行するための環境）は、「コンロ」です。コンロがなければ、食材を加熱できません。Node.jsのバージョンが重要なのは、コンロの種類によって火力が違うからです。`package.json` ファイルの `engines.node` で必要なコンロ（Node.jsのバージョン）を指定します。

npm scripts（エヌピーエムスクリプト）は、「レシピカード」です。複雑な手順を覚える代わりに、名前の付いたレシピ（`dev`, `build`, `start`など）を実行します。

Docker Compose（ドッカーコンポーズ）は、「キッチンセット」です。データベースとバックエンド（バックエンド：ユーザーが見えない裏側のサーバーやデータベース）をまとめて起動し、必要な接続も自動で行います。

環境変数（かんきょうへんすう）は、「コンテナ（アプリを動かすための箱）に貼られたラベル」です。同じ食材でも、ラベルが違えば使い方が変わります（例：`DATABASE_URL`）。

volumes（ボリューム）は、「収納棚」です。コンテナを捨てても、データは安全に保管されます。

Task runner（タスクランナー）は、「キッチン準備のチェックリスト」です。手順を忘れることを防ぎ、キッチンを修理するために再実行できます。

👨‍💻 実際のコード

3.1 package.jsonの「レシピカード」を読もう

まずは、`package.json` ファイルを見てみましょう。このファイルには、プロジェクト（開発対象のアプリ）に必要な情報や、実行できるコマンド（レシピ）が書かれています。

```json
  "engines": {
    "node": "24.x"
  },
  "script": {
    "dev": "next dev",
    "build": "prisma generate && prisma db push --accept-data-loss && next build",
    "start": "next start",
    "lint": "biome check ."
  },
```

- 2行目の `engines.node: "24.x"` は、このプロジェクトがNode.jsの24系バージョンを必要としていることを意味します。つまり、「このキッチンでは24.xという型のコンロを使ってください」という指示です。
- 5行目の `"dev": "next dev"` は、`dev` というレシピカードには `next dev` というコマンドが書かれていることを意味します。`next dev` は、開発（development）モードでNext.js（ネクストジェイエス：Reactをベースとしたフレームワーク）を起動するためのコマンドです。開発中は、コードを修正するとすぐに画面に反映されるので、味見をしながら料理をするように開発を進められます。
- 6行目の `"build": "prisma generate && prisma db push --accept-data-loss && next build"` は、`build` というレシピカードには、複数のコマンドが書かれていることを意味します。`build` は、アプリを公開（本番環境）するために必要な準備をするためのコマンドです。 Prisma（プリズマ：データベースを扱いやすくするツール）を使ってデータベースを生成し、データを投入し、Next.jsでアプリをビルドします。これは、お客様に出す料理を盛り付ける準備をするようなものです。
- 7行目の `"start": "next start"` は、`start` というレシピカードには `next start` というコマンドが書かれていることを意味します。`next start` は、ビルドされたアプリを起動するためのコマンドです。これは、盛り付けられた料理をお客様に提供するようなものです。
- 8行目の `"lint": "biome check ."` は、`lint` というレシピカードには `biome check .` というコマンドが書かれていることを意味します。`lint` は、コードの品質をチェックするためのコマンドです。

このリポジトリ（プロジェクトのコードが保管されている場所）では、`"scripts"` ではなく `"script"` というキー（項目名）を使っていることに注意してください。もし `npm run dev` が動かない場合は、`package.json` の `"script"` を `"scripts"` に修正する必要があるかもしれません（ただし、まずは動作確認をしてください）。

3.2 docker-compose.ymlの「キッチンキット」を理解しよう

次に、`docker-compose.yml` ファイルを見てみましょう。このファイルには、データベースやバックエンドなどの必要なものがまとめて定義されています。

```yaml
  db:
    image: postgres:16-alpine
    container_name: taskapp-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: taskapp
    ports:
      - "${_DOCKER_COMPOSE_HOST_PORT_DB:-5432}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: .docker/backend/Dockerfile
    container_name: taskapp-backend
    ports:
      - "${_DOCKER_COMPOSE_HOST_PORT_BACKEND:-3000}:3000"
      - "${_DOCKER_COMPOSE_HOST_PORT_BACKEND_DEBUG:-9229}:9229"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/taskapp?schema=public
    depends_on:
      db:
        condition: service_healthy
    command: npm run dev
```

- `db` サービス（冷蔵庫）:
  - 2行目の `image: postgres:16-alpine` は、PostgreSQL（ポストグレスキューエル：オープンソースのデータベース）の16-alpineバージョンを使うことを意味します。
  - 4-6行目の `environment` は、データベースのユーザー名、パスワード、データベース名を定義しています。これらは、冷蔵庫に貼られたラベルのようなものです。
  - 8行目の `ports: "${_DOCKER_COMPOSE_HOST_PORT_DB:-5432}:5432"` は、データベースにアクセスするための「ドア番号」を指定しています。`${_DOCKER_COMPOSE_HOST_PORT_DB:-5432}` が設定されていなければ、5432番ポート（ポート：アプリが外界と通信するための「出入口」）を使います。
  - 10行目の `volumes: postgres-data:/var/lib/postgresql/data` は、データベースのデータを保存する場所を指定しています。これは、冷蔵庫の中の収納棚のようなものです。コンテナを削除しても、データは `postgres-data` というボリューム（データの保存場所）に保存されます。
  - 12-15行目の `healthcheck` は、データベースが正常に起動しているかどうかを確認するためのものです。`pg_isready -U user` コマンドを使って、データベースに接続できるかどうかをチェックします。これは、冷蔵庫がちゃんと冷えているかを確認するようなものです。

- `backend` サービス（コンロ）:
  - 18-19行目の `build` は、バックエンドのコードをビルド（コンパイル）するための設定です。`context: .` は、現在のディレクトリ（フォルダ）をビルドの起点とすることを意味します。`dockerfile: .docker/backend/Dockerfile` は、`.docker/backend/Dockerfile` というファイルを使ってビルドすることを意味します。
  - 21-22行目の `ports` は、バックエンドにアクセスするためのドア番号を指定しています。3000番ポートは、Webブラウザ（ウェブブラウザ）からアクセスするためのポートです。9229番ポートは、デバッグ（プログラムの誤りを修正すること）するためのポートです。
  - 23行目の `env_file: - .env` は、`.env` ファイルから環境変数を読み込むことを意味します。
  - 25行目の `environment: DATABASE_URL: postgresql://user:password@db:5432/taskapp?schema=public` は、データベースの接続先URL（アドレス）を指定しています。`DATABASE_URL` は、バックエンドが冷蔵庫（データベース）の場所を知るための「住所ラベル」です。
  - 27-28行目の `depends_on` は、バックエンドがデータベースに依存していることを意味します。`condition: service_healthy` は、データベースが正常に起動してからバックエンドを起動することを意味します。「冷蔵庫が冷えてから料理を始める」というイメージです。
  - 29行目の `command: npm run dev` は、バックエンドを起動するためのコマンドを指定しています。`npm run dev` は、`package.json` に定義された `dev` スクリプトを実行するためのコマンドです。

Docker（ドッカー：アプリを箱詰めして動かす仕組み）を使うことで、開発環境をどのマシン（パソコン）でも同じように再現できます。

3.3 Taskfileを「ワンボタンチェックリスト」として使おう

最後に、`taskfile.yaml` ファイルを見てみましょう。このファイルには、複数のコマンドをまとめて実行するためのタスク（作業）が定義されています。

```yaml
version: "3"

dotenv:
  - .env

tasks:
  default:
    cmds:
      - task -l

  # ----- 初期化関連コマンド
  init:
    desc: "環境初期化(何度でも実行可能 - 環境を壊してしまった場合、本コマンドの再実行で修復可能)"
    cmds:
      # 依存のインストール
      - cmd: brew install jq
        platforms: [linux, darwin]
      - cmd: scoop install jq
```

Task runner（タスクランナー：複数のコマンドをまとめて実行するツール）は、「マクロボタン」のようなものです。複数のコマンドを安全に実行できます。

Taskfileを使うことで、以下のメリットがあります。

- コマンドの打ち間違いを減らせる
- 決まった順番でコマンドを実行できる
- 環境が壊れても、再実行することで修復できる

✅ 動かしてみよう

4.1 前提チェック

まず、必要なものがインストールされているか確認しましょう。

1. Node.jsのバージョンを確認します。

   ```
   $ node -v
   v24.11.1
   ```

   `v24.11.1` のように表示されれば成功です。もし `v20.xx.xx` のように表示された場合は、Node.jsのバージョンを24系に切り替える必要があります。

2. npm（エヌピーエム：Node.jsのパッケージ管理ツール）のバージョンを確認します。

   ```
   $ npm -v
   10.2.4
   ```

   `10.2.4` のように表示されれば成功です。

3. Dockerのバージョンを確認します。

   ```
   $ docker --version
   Docker version 26.1.0, build daa60c5
   ```

   `Docker version 26.1.0, build daa60c5` のように表示されれば成功です。

4.2 Step-by-step verification

1. データベースコンテナ（コンテナ：アプリを動かすための隔離された環境）を起動します。

   ```
   $ docker compose up -d db
   ```

2. データベースが正常に起動しているか確認します。

   ```
   $ docker compose ps

   NAME                IMAGE               COMMAND                  SERVICE             CREATED             STATUS              PORTS
   taskapp-postgres    postgres:16-alpine   "docker-entrypoint.s…"   db                  2 minutes ago       healthy             5432/tcp
   ```

   `STATUS` が `healthy` と表示されれば成功です。【スクリーンショット】Docker Desktopで「taskapp-postgres」コンテナが「healthy」状態になっていることを確認

3. バックエンドを起動します。

   ```
   $ docker compose up --build backend
   ```

   バックエンドのログ（記録）に `localhost:3000 ready` と表示されれば成功です。【スクリーンショット】ターミナルで `docker compose up` 実行中ログで、backend が `localhost:3000 ready` となっている部分

4. Webブラウザで `http://localhost:3000` にアクセスして、アプリが表示されることを確認します。【スクリーンショット】Webブラウザで `http://localhost:3000` にアクセスしてアプリが表示されている画面

5. （オプション）Taskfileを使って「ワンボタン」で起動します。

   ```
   $ task init
   $ task up-backend
   ```

4.3 Visual confirmation checklist

- 【スクリーンショット】Docker Desktopで「taskapp-postgres」と「taskapp-backend」の2つのコンテナが「Running」状態になっていることを確認
- 【スクリーンショット】ターミナルで `node -v` を実行した結果、v24.xx.x のように表示されている画面
- 【スクリーンショット】ターミナルで `docker compose up` 実行中ログで、db が「healthy」と表示され、backend が `localhost:3000 ready` となっている部分

4.4 Troubleshooting tips

- もしポート（ポート：アプリが外界と通信するための「出入口」）が既に使用されている場合は、以下のコマンドでプロセス（実行中のプログラム）を特定して停止します。

  ```
  $ lsof -i :3000
  $ kill -9 <プロセスID>
  ```

- もしNode.jsのバージョンが違う場合は、`nvm` などのツールを使ってバージョンを切り替えます。

- もしDockerが起動していない場合は、Docker Desktopを起動してください。

🎯 まとめ

安定した開発環境は、きちんと準備されたキッチンです。ツール、冷蔵庫、レシピが揃えば、落ち着いて再現性のあるコーディング（料理）ができます。