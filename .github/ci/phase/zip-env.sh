#!/usr/bin/env bash
if [ -f .env.example ]; then
  cp .env.example .env
  echo "✅ .env file created from .env.example"
else
  echo "❌ .env.example not found"
  exit 1
fi
