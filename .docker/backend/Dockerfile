FROM node:24.11.1-slim

WORKDIR /app

# OS settings
ENV PATH /app/node_modules/.bin:$PATH

# OS lib
# ps... used for hot-reloading development
# curl... potentially used for self-healthchecking on ECS
RUN apt-get update -qq \
  && apt-get install -qy  \
  curl \
  procps \
  --no-install-recommends

# node_module packages
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# app code
COPY . .

# named volume 初回作成時にイメージの /app/node_modules がコピーされる。
# ここがroot所有のままだと、実行ユーザー(node)がPrisma Client再生成時に unlink できずEACCESになる。
RUN chown -R node:node /app/node_modules

USER node

CMD [ "npm", "run", "dev"]
