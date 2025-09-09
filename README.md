# Three.js 3D Room Explorer

Three.jsを使用した3D空間探索アプリケーションです。赤い球体のアバターを操作して、GLBファイルで作成されたルーム内を自由に移動できます。

## 🌐 ライブデモ

**GitHub Pages**: [https://tarryGrain0.github.io/shinsetsu_hackathon2025/](https://tarryGrain0.github.io/shinsetsu_hackathon2025/)

> リアルタイムでアプリケーションを体験できます！

## 🎮 機能

- **3Dルーム探索**: GLBファイル形式の3Dルームを読み込み、リアルタイムで探索
- **三人称視点**: 肩越しカメラによる直感的な操作感
- **物理演算**: 重力、ジャンプ、当たり判定を実装
- **リアルタイムレンダリング**: シャドウマッピング、ライティング
- **レスポンシブ対応**: ウィンドウサイズに合わせて自動調整

## 🕹️ 操作方法

| キー/操作          | 機能                     |
| ------------------ | ------------------------ |
| `W` `A` `S` `D`    | 移動（前後左右）         |
| `Shift` + 移動キー | ダッシュ                 |
| `Space`            | ジャンプ                 |
| マウスドラッグ     | カメラ回転               |
| ホイール           | カメラ距離調整           |
| `R`                | リスポーン（中央に戻る） |
| `H`                | ヘルパー表示切替         |

## 🚀 デプロイ

### GitHub Pages
このプロジェクトはGitHub Actionsを使用して自動デプロイされます。

1. **自動デプロイ**: `main`ブランチへのプッシュ時に自動実行
2. **手動デプロイ**: GitHubリポジトリの「Actions」タブから手動実行可能

### デプロイ設定
- ワークフロー: `.github/workflows/deploy.yml`
- デプロイ先: GitHub Pages
- URL: `https://[ユーザー名].github.io/shinsetsu_hackathon2025/`

## 🚀 セットアップ

### 必要な環境
- モダンなWebブラウザ（ES6 modules対応）
- ローカルHTTPサーバー

### 起動手順

1. プロジェクトディレクトリに移動
```bash
cd shinsetsu_hackathon2025
```

2. HTTPサーバーを起動
```bash
python3 -m http.server 8080
```

3. ブラウザでアクセス
```
http://localhost:8080
```

> ⚠️ **重要**: ファイルを直接ダブルクリックして開かず、必ずHTTPサーバー経由でアクセスしてください。

## 📁 ファイル構成

```
shinsetsu_hackathon2025/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions設定
├── index.html              # メインアプリケーション
├── room_sample.glb         # 3Dルームモデル
├── 404.html                # エラーページ
├── package.json            # プロジェクト設定
├── .nojekyll               # Jekyll無効化
└── README.md               # このファイル
```

## 🔧 技術仕様

### 使用ライブラリ
- **Three.js v0.160.0**: 3Dレンダリングエンジン
- **GLTFLoader**: GLB/GLTFファイル読み込み
- **DRACOLoader**: 圧縮ジオメトリ対応
- **KTX2Loader**: 高効率テクスチャ対応

### 主な機能実装
- **レンダラー**: WebGLRenderer with アンチエイリアシング
- **ライティング**: Hemisphere Light + Directional Light + Ambient Light
- **シャドウ**: PCF Soft Shadow Mapping
- **当たり判定**: Raycaster による地面検出・壁判定
- **カメラ**: 球面座標系による三人称カメラ

## 🎨 カスタマイズ

### 3Dモデルの変更
`room_sample.glb` を別のGLB/GLTFファイルに置き換えることで、異なる3D空間を探索できます。

### 設定パラメータ
```javascript
// 移動速度
const WALK = 3.0;     // 歩行速度 (m/s)
const RUN = 5.6;      // ダッシュ速度 (m/s)

// 物理パラメータ
const GRAVITY = 18.0; // 重力加速度
const JUMP_V = 8.0;   // ジャンプ初速

// カメラ設定
let camDist = 7.0;    // カメラ距離
```

## 📊 パフォーマンス

- **FPS表示**: 右上にリアルタイムFPS表示
- **適応的品質**: デバイスピクセル比に応じた自動調整
- **効率的レンダリング**: フラストラムカリング、シャドウ最適化

## 🐛 トラブルシューティング

### よくある問題

1. **モジュール読み込みエラー**
   - HTTPサーバー経由でアクセスしているか確認
   - `file://` プロトコルでは動作しません

2. **GLBファイルが読み込まれない**
   - ファイルパスが正しいか確認
   - ブラウザの開発者ツールでネットワークエラーをチェック

3. **パフォーマンスが悪い**
   - 影の品質設定を下げる
   - アンチエイリアシングを無効化

## 🛠️ 開発情報

### ビルド不要
このプロジェクトはピュアなHTML/JavaScript/CSSで構成されており、ビルドプロセスは不要です。

### ブラウザサポート
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🎯 今後の改善予定

- [ ] マルチプレイヤー対応
- [ ] VR/AR対応
- [ ] 物理演算エンジン統合
- [ ] アニメーション機能
- [ ] サウンド効果
- [ ] UI/UXの改善

---

**開発者**: Shinsetsu Hackathon 2025  
**作成日**: 2025年9月9日
