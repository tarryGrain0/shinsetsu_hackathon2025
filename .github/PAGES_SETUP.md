# GitHub Pages 設定ガイド

GitHub Pagesを有効にするための手順です。

## 1. リポジトリ設定でPages を有効化

1. GitHubリポジトリページで「Settings」タブをクリック
2. 左サイドバーの「Pages」をクリック
3. 「Source」セクションで「GitHub Actions」を選択
4. 「Save」ボタンをクリック

## 2. ワークフローの確認

- `pages.yml` - シンプル版（推奨）
- `deploy.yml` - 詳細版

どちらか一方を使用してください。

## 3. カスタムドメイン（オプション）

カスタムドメインを使用する場合：
1. Pagesの設定で「Custom domain」に入力
2. DNS設定でCNAMEレコードを追加

## 4. トラブルシューティング

### エラー「Pages site failed」の場合
1. リポジトリの Settings > Pages で GitHub Actions が選択されているか確認
2. Actions タブで実行ログを確認
3. 権限設定を確認

### デプロイURLが見つからない場合
デプロイ完了後、以下のURLでアクセス可能：
https://[ユーザー名].github.io/[リポジトリ名]/

例: https://tarryGrain0.github.io/shinsetsu_hackathon2025/
