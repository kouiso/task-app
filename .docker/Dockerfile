FROM node:20.12.2-slim

WORKDIR /app

# OS settings
ENV PATH /app/node_modules/.bin:$PATH

# OS lib 
RUN apt-get update -qq \
  && apt-get install -qy  \
  curl \ 
  procps \
  --no-install-recommends

# node_module packages
COPY package*.json ./
RUN npm install

# app code
COPY . .

USER node

CMD [ "npm", "run", "dev"]