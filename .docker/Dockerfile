FROM node:22.11.0-slim

WORKDIR /app

ARG ENV
# OS settings
ENV PATH /app/node_modules/.bin:$PATH

# OS lib
RUN apt-get update -qq \
  && apt-get install -qy  \
  curl \
  procps \
  --no-install-recommends

# node_module packages
COPY . .
RUN npm ci

USER node

CMD [ "npm", "run", "dev"]
