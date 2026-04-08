FROM node:25.6.1-slim

WORKDIR /app

# OS settings
ENV PATH /app/node_modules/.bin:$PATH

# Prismaが必要とするOpenSSLをインストール
RUN apt-get update -qq \
  && apt-get install -qy --no-install-recommends \
  openssl \
  && rm -rf /var/lib/apt/lists/*

# node_module packages
COPY package*.json ./
COPY prisma ./prisma/

RUN PUPPETEER_SKIP_DOWNLOAD=true npm ci

# app code
COPY . .

# named volume 初回作成時にイメージの /app/node_modules がコピーされる。
# ここがroot所有のままだと、実行ユーザー(node)がPrisma Client再生成時に unlink できずEACCESになる。
RUN chown -R node:node /app/node_modules

USER node

CMD [ "npm", "run", "dev"]
