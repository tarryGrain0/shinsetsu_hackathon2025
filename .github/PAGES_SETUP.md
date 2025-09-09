# GitHub Pages 設定ガイド

## � 権限エラーの解決方法

「Resource not accessible by integration」エラーが発生した場合の対処法：

### 1. リポジトリの Actions 権限設定

1. GitHubリポジトリの「Settings」→ 「Actions」→ 「General」
2. 「Workflow permissions」で以下を選択：
   - ☑️ **Read and write permissions**
   - ☑️ **Allow GitHub Actions to create and approve pull requests**
3. 「Save」をクリック

### 2. GitHub Pages の設定

1. 「Settings」→ 「Pages」
2. 「Source」で以下のいずれかを選択：
   - **GitHub Actions** (推奨)
   - または **Deploy from a branch** → **gh-pages**

### 3. ワークフローの選択

現在3つのワークフローがあります：

- `deploy.yml` - peaceiris/actions-gh-pages を使用（推奨）
- `simple-deploy.yml` - JamesIves/github-pages-deploy-action を使用
- `backup-deploy.yml` - バックアップ（現在無効）

## � 手動デプロイ手順

権限エラーが解決しない場合：

1. 「Actions」タブで「workflow_dispatch」から手動実行
2. または以下のコマンドで手動デプロイ：

```bash
# gh-pages ブランチを作成してプッシュ
git checkout --orphan gh-pages
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
git checkout main
```

### エラー「Pages site failed」の場合
1. リポジトリの Settings > Pages で GitHub Actions が選択されているか確認
2. Actions タブで実行ログを確認
3. 権限設定を確認

### デプロイURLが見つからない場合
デプロイ完了後、以下のURLでアクセス可能：
https://[ユーザー名].github.io/[リポジトリ名]/

例: https://tarryGrain0.github.io/shinsetsu_hackathon2025/
