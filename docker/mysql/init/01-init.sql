-- Task Management App - MySQL初期化スクリプト
-- 開発環境用のデータベース初期設定

-- 文字セット設定
ALTER DATABASE taskapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- タイムゾーン設定
SET time_zone = '+09:00';

-- 開発用ユーザーに必要な権限を付与
GRANT ALL PRIVILEGES ON taskapp.* TO 'taskapp_user'@'%';
FLUSH PRIVILEGES;

-- 開発環境での動作確認用
SELECT 'MySQL 初期化完了' as message;
SELECT NOW() as current_time;
SELECT @@character_set_database as charset;
SELECT @@collation_database as collation;