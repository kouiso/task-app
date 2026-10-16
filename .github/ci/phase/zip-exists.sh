#!/usr/bin/env bash
if [ ! -f dist/task-app.zip ]; then
  echo "❌ ZIP file not created"
  exit 1
fi
echo "✅ ZIP file created successfully"
ls -lh dist/task-app.zip
