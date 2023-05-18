FROM node:latest
# 作業ディレクトリを変更
WORKDIR /app
# Voltaのインストール
RUN curl https://get.volta.sh | bash
# 環境変数PATHにVoltaのパスを追加
ENV PATH="/root/.volta:$PATH"
# アプリケーションコード全体をコピー
COPY . .
# 依存パッケージインストール
RUN yarn install
# 3000ポートを公開
EXPOSE 3000
# コンテナ実行時に組み込みサーバを起動
CMD [ "yarn", "dev:ssr" ]
