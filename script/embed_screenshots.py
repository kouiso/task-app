#!/usr/bin/env python3
"""
スクリーンショット埋め込みスクリプト
教材の 📸 スクリーンショット: プレースホルダーに実際の画像リンクを追加する
"""
import re
import sys
from pathlib import Path

CURRICULUM_DIR = Path(__file__).parent.parent / "material" / "30days-curriculum"
SCREENSHOTS_DIR = CURRICULUM_DIR / "screenshots"

# 各dayファイルの各スクリーンショット説明文に対応する画像ファイルのマッピング
# キー: 説明文の部分文字列 (ユニークな部分を選ぶ)
# 値: screenshots/ 配下のファイル名
DESCRIPTION_TO_FILE = {
    # day01
    "ブラウザにログイン画面（メールアドレスとパスワードの入力欄）が表示されている状態": "login.png",

    # day02
    "ダッシュボード画面にウェルカムバナーが表示されている完成イメージ": "dashboard.png",
    "ダッシュボードのタイトル下に「こんにちは！開発者さん」": "dashboard.png",
    "ウェルカムメッセージがCardコンポーネントで囲まれ": "dashboard.png",
    "VS Codeで赤い波線とエラーメッセージが表示されている画面": "dashboard.png",
    "バナーに「タスク完了率: XX% — メッセージ」": "dashboard.png",

    # day04
    "Vercelにデプロイされたアプリのログイン画面がブラウザに表示されている状態": "login.png",

    # day05
    "完成したログイン画面（メールアドレスとパスワードの入力欄がCardで囲まれた状態）": "login.png",
    "メールアドレス欄の下にバリデーションエラーメッセージが赤字で表示": "login-error.png",
    "Card コンポーネントで囲まれたログインフォームが画面中央に表示": "login.png",
    "登録リンク付きの完成したログイン画面全体": "login.png",

    # day06
    "名前とメールアドレスの入力欄が表示された状態": "register.png",
    "名前・メール・パスワード・パスワード確認の4つの入力欄が揃ったフォーム": "register.png",
    "デザインが整った登録画面の完成形": "register.png",

    # day07
    "DevToolsのNetworkタブを開いた状態": "dashboard.png",
    "DevToolsのApplication → Cookiesで`session`Cookieを選択した状態": "dashboard.png",
    "Cookie削除後に`/login`にリダイレクトされた画面": "login.png",

    # day08
    "Cookie削除後にリダイレクトされたログイン画面": "login.png",
    "サイドバーのユーザー情報ウィジェット": "sidebar.png",
    "ログアウト確認ダイアログ": "sidebar.png",
    "モバイル表示のSheet（スライドメニュー）": "sidebar.png",

    # day09
    "「プロジェクト」タイトルだけが表示された初期画面": "project-list.png",
    "ローディングスピナーの表示": "project-list.png",
    "プロジェクトカードの表示": "project-list.png",
    "空状態の表示": "project-list.png",
    "完成したプロジェクト一覧画面": "project-list.png",

    # day10
    "プロジェクト作成ダイアログ": "project-create-dialog.png",
    "フォーム入力中のダイアログ": "project-create-dialog.png",
    "作成後に一覧に追加されたプロジェクト": "project-list.png",
    "完成した作成フロー": "project-create-dialog.png",

    # day11
    "編集モードの ProjectDialog が表示されている画面": "project-create-dialog.png",
    "編集後に一覧が更新された画面": "project-list.png",
    "削除確認ダイアログが表示されている画面": "project-delete-confirm.png",
    "編集ダイアログに既存のプロジェクト名が表示されている画面": "project-create-dialog.png",
    "アーカイブ表示を切り替えた後の一覧画面": "project-list.png",

    # day12
    "メンバー管理画面（プロジェクト詳細ダイアログ内）": "project-detail-members.png",
    "プロジェクト詳細ダイアログが表示されている画面": "project-detail-dialog.png",
    "メンバー追加ダイアログでユーザーとロールを選択した状態": "project-add-member.png",
    "メンバー削除の確認ダイアログが表示されている画面": "project-delete-confirm.png",
    "メンバーが追加され一覧に表示されている画面": "project-detail-members.png",

    # day13
    "タスク一覧画面（カードがグリッドで並んでいる）": "task-list.png",
    "フィルターUIが2つ並んで表示されている画面": "task-list.png",
    "フィルタリング後のタスク一覧": "task-list.png",
    "タスク詳細ダイアログが表示されている画面": "task-detail-dialog.png",

    # day14
    "タスク作成ダイアログの完成画面": "task-create-dialog.png",
    "タイトルと説明の入力欄が表示されている画面": "task-create-dialog.png",
    "プロジェクト・担当者のSelect欄が表示されている画面": "task-create-dialog.png",
    "タスク作成後に一覧画面に新しいタスクが表示されている": "task-list.png",

    # day15
    "タスク編集ダイアログの画面": "task-detail-dialog.png",
    "編集モードのタスクダイアログ（既存データが入っている）": "task-detail-dialog.png",
    "削除確認ダイアログの画面": "project-delete-confirm.png",
    "編集後のタスク一覧画面": "task-list.png",

    # day16
    "ステータス変更のドロップダウンの画面": "task-detail-dialog.png",
    "タイマー動作中の画面": "task-timer.png",
    "手動時間記録ダイアログの画面": "task-timer.png",
    "タイマー停止後の累計時間表示": "task-timer.png",

    # day17
    "マイタスクページの完成画面": "my-task.png",
    "ステータスTabsが表示されている画面": "my-task.png",
    "グループ別タスク表示（期限切れ・今日・今後・期限なし）": "my-task.png",
    "動作確認完了後のマイタスクページ": "my-task.png",

    # day18
    "コメント付きのタスク詳細ダイアログ": "task-detail-dialog.png",
    "コメント一覧がタスク詳細に表示されている画面": "task-detail-dialog.png",
    "テキストエリアと投稿ボタンが表示されている画面": "task-detail-dialog.png",
    "コメント投稿後にリストが更新された画面": "task-detail-dialog.png",

    # day19
    "コメント編集モードの画面": "task-comment-edit.png",
    "本人コメントに編集・削除ボタンが表示されている": "task-detail-dialog.png",
    "編集モードでテキストエリアが表示されている": "task-comment-edit.png",
    "タスク詳細ダイアログのコメントセクション完成画面": "task-detail-dialog.png",

    # day20
    "検索画面とフィルタリングされた結果": "search-results.png",
    "フィルターフォームの全体像": "search.png",
    "検索結果がカード形式で表示されている画面": "search-results.png",
    "検索結果一覧の完成画面": "search-results.png",

    # day21
    "レポートページに4枚の統計カードが並んだ完成イメージです": "report.png",
    "データ読み込み中にスピナーが画面中央に表示されることを確認してください": "report.png",
    "4枚の統計カードがグリッドで並んで表示されることを確認してください": "report.png",
    "モバイル幅（1列）とPC幅（4列）でカードの並びが変わることを確認してください": "report.png",

    # day22
    "レポートページにステータス別・優先度別の円グラフが並んだ完成イメージです": "report.png",
    "ステータス別の円グラフが色分けされて表示されることを確認してください": "report.png",
    "ステータスと優先度の2つの円グラフが表示されることを確認してください": "report.png",
    "統計カード4枚の下に円グラフ2つがグリッド配置された完成画面を確認してください": "report.png",

    # day23
    "プロジェクト統計テーブルの表示を確認してください": "report-weekly.png",
    "プロジェクト統計テーブル完成の表示を確認してください": "report-weekly.png",
    "ローディング中にスピナーが表示されることを確認してください": "report-weekly.png",
    "週次レポート完成の表示を確認してください": "report-weekly.png",
    "レポートページ全体の表示を確認してください": "report-weekly.png",

    # day24
    "ユーザー管理ページ全体の表示を確認してください": "user-list.png",
    "ユーザー管理ページ（管理者がアクセスした画面）の表示を確認してください": "user-list.png",
    "アバターとバッジの表示を確認してください": "user-list.png",
    "完成したユーザー管理ページの表示を確認してください": "user-list.png",

    # day25
    "プロフィールページ全体の表示を確認してください": "profile.png",
    "プロフィール情報表示の表示を確認してください": "profile.png",
    "ナビゲーションボタンの表示を確認してください": "profile.png",
    "パスワード変更フォームの表示を確認してください": "change-password.png",
    "パスワード変更成功の表示を確認してください": "change-password.png",
    "プロフィール編集フォームの表示を確認してください": "profile-edit.png",

    # day26
    "エラーページ画面の表示を確認してください": "error-page.png",
    "error.tsxのエラーページ画面の表示を確認してください": "error-page.png",
    "Biome lint のエラー出力画面を確認してください": "error-page.png",
    "DevTools Consoleタブの表示を確認してください": "dashboard.png",
    "DevTools Networkタブの表示を確認してください": "dashboard.png",
    "DevTools Elementsタブの表示を確認してください": "dashboard.png",

    # day27
    "プロジェクト詳細ダイアログの完成形の表示を確認してください": "project-detail-dialog.png",
    "メンバー一覧の表示確認の表示を確認してください": "project-detail-members.png",
    "タスク一覧の表示確認の表示を確認してください": "project-detail-tasks.png",
    "完成したダイアログの動作確認の表示を確認してください": "project-detail-dialog.png",

    # day28
    "タスク一括操作の完成画面の表示を確認してください": "bulk-operations-complete.png",
    "チェックボックス付きタスクカードの表示を確認してください": "task-row-with-checkbox.png",
    "全選択チェックボックス（3 状態）の表示を確認してください": "select-all-checkbox.png",
    "一括操作ボタンがヘッダーに表示される様子の表示を確認してください": "bulk-operation-header.png",
    "完成した一括操作機能の表示を確認してください": "bulk-task-operations.png",

    # day29
    "ユーザー詳細ページの完成イメージの表示を確認してください": "user-detail-page.png",
    "ユーザー詳細ページの骨組みの表示を確認してください": "user-detail-skeleton.png",
    "プロジェクト一覧とタスクテーブルの表示を確認してください": "user-detail-projects-tasks.png",
    "編集フォームの完成イメージの表示を確認してください": "user-edit-form.png",

    # day30
    "`docker compose ps` で `taskapp-postgres` が `running (healthy)` の画面": "dashboard.png",
    "Vercel ダッシュボードの「Deployments」タブでビルドが完了した画面": "login.png",
    "本番環境のログイン画面": "login.png",
    "本番環境のダッシュボード画面": "dashboard.png",
}


def get_screenshot_file(description: str):
    """説明文から対応するスクリーンショットファイル名を返す"""
    for key, filename in DESCRIPTION_TO_FILE.items():
        if key in description:
            return filename
    return None


def process_file(filepath: Path, dry_run: bool = False) -> int:
    """ファイルを処理してスクリーンショットリンクを埋め込む。変更数を返す"""
    content = filepath.read_text(encoding="utf-8")
    lines = content.split("\n")
    new_lines = []
    changes = 0
    i = 0

    while i < len(lines):
        line = lines[i]
        # 通常行とblockquote行の両方に対応
        # パターン: "📸 スクリーンショット: ..." または "> 📸 スクリーンショット: ..."
        screenshot_match = re.match(r'^(>?\s*)📸 スクリーンショット: (.+)$', line)

        if screenshot_match:
            prefix = screenshot_match.group(1)  # "> " or ""
            description = screenshot_match.group(2)
            new_lines.append(line)

            # 次の行（空行のはず）を確認
            if i + 1 < len(lines) and lines[i + 1].strip() == "":
                new_lines.append(lines[i + 1])  # 空行

                # その次の行が既にimage linkか確認
                next_content_line = lines[i + 2] if i + 2 < len(lines) else ""
                if re.match(r'^>?\s*!\[', next_content_line):
                    # 既にimage linkがある → そのまま
                    i += 1  # 空行をスキップ済みなので次の行へ
                else:
                    # image linkがない → 挿入
                    screenshot_file = get_screenshot_file(description)
                    if screenshot_file:
                        img_line = f"{prefix}![{description[:30]}](./screenshots/{screenshot_file})"
                        if not dry_run:
                            new_lines.append(img_line)
                        changes += 1
                        if dry_run:
                            print(f"  [DRY] Would add: {img_line}")
                    else:
                        if dry_run:
                            print(f"  [WARN] No mapping for: {description[:60]}")
                i += 1  # 空行分を進める
            else:
                # 空行なし → スキップ
                pass
        else:
            new_lines.append(line)

        i += 1

    if changes > 0 and not dry_run:
        filepath.write_text("\n".join(new_lines), encoding="utf-8")

    return changes


def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("[DRY RUN MODE - no files will be modified]\n")

    day_files = sorted(CURRICULUM_DIR.glob("day*.md"))
    total_changes = 0

    for filepath in day_files:
        if dry_run:
            print(f"\n--- {filepath.name} ---")
        changes = process_file(filepath, dry_run=dry_run)
        if changes > 0:
            print(f"  {filepath.name}: {changes} image link(s) added")
            total_changes += changes

    print(f"\n総計: {total_changes} 件の画像リンクを{'確認' if dry_run else '追加'}しました")


if __name__ == "__main__":
    main()
