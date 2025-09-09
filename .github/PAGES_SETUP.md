# GitHub Pages 設定ガイド

## 🔧 自動設定 (推奨)

現在のワークフローは `enablement: true` を使用して自動的にPages設定を行います。
通常は手動設定は不要ですが、エラーが発生する場合は以下を確認してください。

## 🛠️ 手動設定 (エラー時のみ)

### 1. リポジトリ設定でPages を有効化

1. GitHubリポジトリページで「Settings」タブをクリック
2. 左サイドバーの「Pages」をクリック
3. 「Source」セクションで「GitHub Actions」を選択
4. 「Save」ボタンをクリック

### 2. ワークフローファイル

- `deploy.yml` - メインのデプロイワークフロー（enablement付き）
- `backup-deploy.yml` - バックアップ用（現在無効化）

## 🚨 トラブルシューティング

### エラー「Pages site failed」の場合
1. リポジトリの Settings > Pages で GitHub Actions が選択されているか確認
2. Actions タブで実行ログを確認
3. 権限設定を確認

### デプロイURLが見つからない場合
デプロイ完了後、以下のURLでアクセス可能：
https://[ユーザー名].github.io/[リポジトリ名]/

例: https://tarryGrain0.github.io/shinsetsu_hackathon2025/
