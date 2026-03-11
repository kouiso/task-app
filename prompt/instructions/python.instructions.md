---
applyTo: "**/*.py"
---

# Python規約 (edu-creator)

**ルール違反は即時タスク失敗。例外一切認めず。**

## 型安全性 (Type Safety)

### 型ヒントの完全必須化
- **全ての関数・メソッド**: 引数と戻り値に型ヒントを記述すること。
- **変数**: 複雑な型や意図が不明確な場合は型ヒントを記述すること。
- **`Any`型の禁止**:
  - 原則として `Any` は使用禁止。
  - どうしても必要な場合はコメントで理由を明記するか、`TypeVar` / `Generic` を使用して解決する。

```python
# ✅ Good
def calculate_total(items: list[dict[str, int]]) -> int:
    return sum(item['price'] for item in items)

# ❌ Bad
def calculate_total(items):
    return sum(item['price'] for item in items)
```

### Pydanticの活用
- データ構造の定義には `dict` ではなく `Pydantic` モデルを使用し、実行時の型バリデーションを行うことを強く推奨する。

## コードスタイル & フォーマット

### Black & isort 準拠
- コードは `black` スタイルでフォーマットする。
- インポート順序は `isort` (標準ライブラリ -> サードパーティ -> ローカル) に従う。

### Docstring (Google Style)
- 公開関数・クラスには必ず Docstring を記述する。
- 形式は **Google Style** を採用する。

```python
def fetch_data(url: str, retry: int = 3) -> dict:
    """Fetches data from the specified URL.

    Args:
        url: The URL to fetch data from.
        retry: Number of retry attempts.

    Returns:
        A dictionary containing the response data.

    Raises:
        ConnectionError: If connection fails.
    """
    ...
```

## テスト (Testing)

### Pytest & TDD
- テストフレームワークは `pytest` を使用する。
- 実装はTDD (Test-Driven Development) で行うこと。
- テストファイル名は `test_*.py` とする。

### テスト品質
- **カバレッジ**: 80%以上を目指す。
- **フィクスチャ活用**: `conftest.py` と `pytest.fixture` を活用し、テストコードの重複を避ける。
- **モック**: `unittest.mock` または `pytest-mock` を使用して外部依存を分離する。

## エラーハンドリング & ログ

### 明示的な例外処理
- `try-except Exception:` (全例外キャッチ) は禁止。具体的な例外クラスを指定する。
- エラーを握りつぶさない。ログ出力または再送出 (`raise`) を行う。

### ロギング
- `print()` は使用禁止。必ず `logger` モジュールを使用する。
- `edu-creator` のロガー設定に従い、適切なレベル (`INFO`, `DEBUG`, `ERROR`) で出力する。

## パフォーマンス & リソース管理

### コンテキストマネージャ
- ファイル操作やネットワーク接続など、リソースを扱う場合は必ず `with` 構文 (Context Manager) を使用する。

```python
# ✅ Good
with open('data.txt', 'r') as f:
    content = f.read()

# ❌ Bad
f = open('data.txt', 'r')
content = f.read()
f.close()
```
