#!/bin/bash

# GitHub Pages 手動デプロイスクリプト
# 権限エラーを回避するための代替手段

echo "🚀 GitHub Pages 手動デプロイを開始..."

# 現在のブランチを保存
current_branch=$(git branch --show-current)
echo "現在のブランチ: $current_branch"

# 作業ディレクトリをクリーンアップ
echo "📦 作業ディレクトリの確認..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  未コミットの変更があります。先にコミットしてください。"
    git status
    exit 1
fi

# gh-pages ブランチの存在確認と作成
echo "🌿 gh-pages ブランチの準備..."
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "gh-pages ブランチが存在します"
    git checkout gh-pages
    git pull origin gh-pages
else
    echo "gh-pages ブランチを新規作成します"
    git checkout --orphan gh-pages
fi

# メインブランチの内容をコピー
echo "📋 メインブランチの内容をコピー..."
git rm -rf . 2>/dev/null || true
git checkout $current_branch -- .
git reset HEAD

# 不要なファイルを除去
echo "🧹 不要なファイルの除去..."
rm -rf .github/workflows/
rm -f .github/PAGES_SETUP.md
rm -f package.json
rm -f deploy.sh

# デプロイ用ファイルの追加
echo "✅ デプロイファイルの最終確認..."
ls -la

# コミットとプッシュ
echo "📤 GitHub Pages にデプロイ..."
git add .
git commit -m "Deploy to GitHub Pages - $(date)"

if git push origin gh-pages; then
    echo "✅ デプロイ成功！"
    echo "🌐 サイトURL: https://tarryGrain0.github.io/shinsetsu_hackathon2025/"
    echo "⏱️  反映まで数分かかる場合があります"
else
    echo "❌ プッシュに失敗しました"
    exit 1
fi

# 元のブランチに戻る
git checkout $current_branch
echo "🔄 $current_branch ブランチに戻りました"

echo "🎉 デプロイ完了！"
