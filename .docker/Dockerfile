FROM node:25.6.1-slim

WORKDIR /app

ARG ENV
# OS settings
ENV PATH /app/node_modules/.bin:$PATH

# Prismaが必要とするOpenSSLをインストール
RUN apt-get update -qq \
  && apt-get install -qy --no-install-recommends \
  openssl \
  && rm -rf /var/lib/apt/lists/*

# node_module packages
COPY . .
RUN npm ci

USER node

CMD [ "npm", "run", "dev"]
