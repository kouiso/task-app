#!/usr/bin/env bash
apt-get update && apt-get install -y curl git && git config --global --add safe.directory /app

git config --global user.name "${GIT_NAME}"
git config --global user.email "${GIT_EMAIL}"