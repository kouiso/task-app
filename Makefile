.PHONY: zip-export zip-list

zip-export:
	mkdir -p dist
	zip -r dist/task-app.zip . \
		-x@.gitignore \
		-x ".git/*" \
		-x ".github/*" \
		-x ".claude/*" \
		-x ".devcontainer/*" \
		-x ".env" \
		-x ".env.production" \
		-x "prompt/*" \
		-x "CLAUDE.md" \
		-x "material/*" \
		-x ".husky/*" \
		-x ".huskyrc" \
		-x "lint-staged.config.js" \
		-x "e2e/*" \
		-x "playwright.config.ts" \
		-x ".dockerignore" \
		-x "dist/*" \
		-x "Makefile"
	@echo "✅ dist/task-app.zip を作成しました"

zip-list:
	unzip -l dist/task-app.zip 2>/dev/null || echo "task-app.zip が見つかりません"
