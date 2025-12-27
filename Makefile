.PHONY: zip-export zip-list zip-clean

# プレゼント配布用ZIP作成
zip-export:
	mkdir -p dist
	zip -r dist/task-app.zip . \
		-x@.gitignore \
		-x "node_modules/*" \
		-x ".git/*" \
		-x ".github/*" \
		-x ".claude/*" \
		-x "CLAUDE.md" \
		-x ".gemini/*" \
		-x ".devcontainer/*" \
		-x ".docker/schemaspy/*" \
		-x ".husky/*" \
		-x ".huskyrc" \
		-x ".vscode/*" \
		-x ".next/*" \
		-x "dist/*" \
		-x "e2e/*" \
		-x "playwright.config.ts" \
		-x "lint-staged.config.js" \
		-x "material/*" \
		-x "prompt/*" \
		-x "playwright-report/*" \
		-x "test-results/*" \
		-x "Makefile" \
		-x "renovate.json"
	zip -u dist/task-app.zip .env.example
	@echo ""
	@echo "============================================"
	@echo "dist/task-app.zip を作成しました"
	@echo "============================================"

# ZIP内容の確認
zip-list:
	@if [ -f dist/task-app.zip ]; then \
		unzip -l dist/task-app.zip; \
	else \
		echo "dist/task-app.zip が見つかりません"; \
		echo "make zip-export を実行してください"; \
	fi

# ZIP削除
zip-clean:
	rm -f dist/task-app.zip
	@echo "dist/task-app.zip を削除しました"
