#!/usr/bin/env bash

# create .devcontainer/.env
cat <<-EOF > .devcontainer/.env
GIT_NAME=$(git config --get user.name)
GIT_EMAIL=$(git config --get user.email)
EOF

# .envがrootにない且つ.env.exampleが存在する場合は、.envを.env.exampleからコピーする
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi
