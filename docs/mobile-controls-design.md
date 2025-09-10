# スマートフォン横向き専用 操作設計書

## 概要
Three.js 3Dルームエクスプローラーをスマートフォン横向き（ランドスケープモード）専用で最適化した操作設計書です。横向きの広い画面を活用し、ゲームコントローラーのような直感的な操作を実現します。

## 前提条件
- **対応方向**: 横向き（landscape）のみ
- **推奨アスペクト比**: 16:9 ～ 21:9
- **最小画面幅**: 568px（iPhone SE横向き）
- **縦向き時の処理**: 横向きへの回転を促すメッセージを表示

## 現在のPC操作とモバイル対応

### 移動操作
| PC操作 | 機能 | モバイル実装方法 |
|--------|------|------------------|
| WASD | 前後左右移動 | バーチャルジョイスティック（左下） |
| Shift + 移動 | ダッシュ | ジョイスティック外側まで倒す or ダブルタップ移動 |
| Space | ジャンプ | 専用ジャンプボタン（右下） |

### カメラ操作
| PC操作 | 機能 | モバイル実装方法 |
|--------|------|------------------|
| マウスドラッグ | カメラ回転 | 画面右側をスワイプ |
| ホイール | カメラ距離調整 | ピンチイン/アウト |
| 矢印キー左右 | アバター回転 | 画面右側を左右スワイプ |
| 矢印キー上下 | カメラピッチ | 画面右側を上下スワイプ |

### その他の操作
| PC操作 | 機能 | モバイル実装方法 |
|--------|------|------------------|
| V | 視点切替 | 画面右上のカメラボタン |
| R | リスポーン | 画面左上のリスポーンボタン |
| H | ヘルパー表示切替 | 設定メニュー内 |
| G | 設定モーダル | 画面右上の設定ボタン |

## モバイルUI設計（横向き専用）

### レイアウト構成
```
横向き画面（ランドスケープ）
┌────────────────────────────────────────────────────────────┐
│ [R]                        [📷] [⚙️]                       │ ← 上部UI
│                                                            │
│                                                            │
│            ＜中央タッチエリア＞                             │ ← カメラ操作
│           （カメラ回転・視点操作）                           │  （画面中央50%）
│                                                            │
│                                                            │
│  [JUMP]                                            ╭─╮    │
│  [DASH]                                            │◯│    │ ← 下部コントロール
│  （左下）                              ジョイスティック →  ╰─╯    │
└────────────────────────────────────────────────────────────┘
         ↑                                          ↑
     左手親指エリア                              右手親指エリア
```

### 横向き専用の利点
- **両手持ち前提**: 左手でアクション、右手で移動＋カメラ
- **広い視野**: 横長画面で3D空間を広く見渡せる
- **誤タップ防止**: 左右のセーフエリアで誤操作を防ぐ
- **没入感向上**: PCゲームに近い操作感

### 1. バーチャルジョイスティック（右手操作）

#### デザイン仕様
- **位置**: 画面右下（bottom: 30px, right: 40px）
- **サイズ**: 
  - 外円: 100px（固定サイズ）
  - 内円: 40px（固定サイズ）
- **外観**:
  - 外円: 半透明白（rgba(255, 255, 255, 0.25)）
  - 内円: 白（rgba(255, 255, 255, 0.7)）
  - ボーダー: 2px solid rgba(255, 255, 255, 0.4)
- **セーフエリア**: 右端から180pxまでを右手専用エリアとして確保

#### 動作仕様
- **基本移動**: 中心からの距離で速度を制御（0-100%）
- **ダッシュ**: 外円の80%以上まで倒すと自動的にダッシュ
- **視覚フィードバック**: 
  - 移動中は内円が移動方向に追従
  - ダッシュ時は内円の色が赤に変化
- **デッドゾーン**: 中心から15%以内は移動なし

### 2. アクションボタン群（左手操作）

#### ジャンプボタン
- **位置**: 画面左下（bottom: 80px, left: 40px）
- **サイズ**: 70px × 70px
- **外観**:
  - 背景: 半透明青（rgba(100, 150, 255, 0.35)）
  - テキスト: "JUMP"
  - タップ時: 明るく光る効果
- **動作**: タップでジャンプ

#### ダッシュボタン
- **位置**: 画面左下（bottom: 30px, left: 120px）
- **サイズ**: 60px × 60px
- **外観**:
  - 背景: 半透明オレンジ（rgba(255, 150, 50, 0.35)）
  - テキスト: "DASH"
  - 押下中: 明るく点灯
- **動作**: 押している間ダッシュ（ホールド操作）

#### 左手セーフエリア
- 左端から180pxまでを左手専用エリアとして確保
- このエリア内のタッチはカメラ操作として処理しない

### 3. カメラ操作エリア（中央）

#### デザイン仕様
- **エリア**: 画面中央50%（左右のセーフエリアを除いた領域）
- **具体的範囲**: 左から180px～右から180pxまで
- **視覚表示**: なし（透明）
- **優先度**: すべてのUIボタンより下

#### 動作仕様
- **1本指スワイプ**:
  - 左右: アバター回転＋カメラ追従
  - 上下: カメラピッチ調整（視線の上下）
  - 感度: X軸 0.004 rad/px、Y軸 0.003 rad/px（横向き用に調整）
- **2本指ピンチ**:
  - ピンチイン: カメラを近づける
  - ピンチアウト: カメラを遠ざける
  - 範囲: 2.2m ～ 30m
- **ダブルタップ**: 視点切替（1人称/3人称）

### 4. 上部コントロールボタン

#### リスポーンボタン
- **位置**: 左上（top: 60px, left: 12px）
- **サイズ**: 44px × 44px
- **アイコン**: ↻ または "R"
- **動作**: タップで中央にリスポーン

#### カメラ切替ボタン
- **位置**: 右上（top: 60px, right: 60px）
- **サイズ**: 44px × 44px
- **アイコン**: 📷
- **動作**: タップで1人称/3人称切替

#### 設定ボタン
- **位置**: 右上（top: 60px, right: 12px）
- **サイズ**: 44px × 44px
- **アイコン**: ⚙️
- **動作**: タップで設定モーダル表示

## タッチイベント実装

### 必要なイベントハンドラー

```javascript
// タッチイベントの基本構造
const touchControls = {
  joystick: {
    touchId: null,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    active: false
  },
  camera: {
    touchIds: [],
    startPos: [],
    lastPos: [],
    pinchDistance: 0
  }
};
```

### イベント処理フロー

1. **touchstart**
   - タッチ位置を判定（ジョイスティック/カメラ/ボタン）
   - 対応するコントロールを有効化
   - タッチIDを記録

2. **touchmove**
   - アクティブなタッチIDを追跡
   - ジョイスティック: 移動ベクトル計算
   - カメラ: スワイプ/ピンチ処理

3. **touchend**
   - タッチIDを解放
   - コントロールをリセット
   - ジョイスティックを中央に戻す

## 横向き画面の処理

### 画面向き検出と制御

```javascript
// 画面向きの検出
function checkOrientation() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const orientationMessage = document.getElementById('orientationMessage');
  const mobileControls = document.getElementById('mobileControls');
  
  if (!isLandscape && isMobile()) {
    // 縦向きの場合、回転を促すメッセージを表示
    orientationMessage.style.display = 'flex';
    mobileControls.style.display = 'none';
  } else {
    // 横向きの場合、ゲームを表示
    orientationMessage.style.display = 'none';
    mobileControls.style.display = 'block';
  }
}

// 画面向きの強制（可能な場合）
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {
    console.log('画面向きのロックはサポートされていません');
  });
}
```

### 縦向き時のメッセージ画面

```html
<div id="orientationMessage" class="orientation-message">
  <div class="rotate-icon">📱↻</div>
  <h2>画面を横向きにしてください</h2>
  <p>最適なゲーム体験のため、デバイスを横向きにしてプレイしてください</p>
</div>
```

```css
.orientation-message {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  color: white;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.rotate-icon {
  font-size: 48px;
  animation: rotate 2s ease-in-out infinite;
}

@keyframes rotate {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(90deg); }
}
```

## パフォーマンス最適化

### モバイル向け最適化
1. **自動品質調整**
   - デバイス検出して自動的に低～中品質に設定
   - pixelRatio を最大2に制限
   - シャドウマップを512x512に削減

2. **タッチイベント最適化**
   - passive: trueを使用してスクロール性能向上
   - requestAnimationFrameで更新を間引き
   - タッチmoveは16msごとに処理

3. **UI要素の最適化**
   - will-change: transformを使用
   - GPU加速を有効化
   - 半透明要素を最小限に

## アクセシビリティ考慮事項

### タッチターゲット
- 最小サイズ: 44px × 44px（iOS/Android推奨）
- ボタン間隔: 最低8px
- エッジからの距離: 最低12px

### 視覚的フィードバック
- タップ時のハイライト効果
- ドラッグ中の視覚的変化
- 状態変化のアニメーション（0.2s）

### ハプティックフィードバック
- ボタンタップ時: 軽い振動
- ジャンプ着地時: 中程度の振動
- 壁衝突時: 短い振動

## 実装優先度

### Phase 1 - 必須機能（MVP）
1. バーチャルジョイスティック実装
2. ジャンプボタン実装
3. 基本的なカメラスワイプ操作
4. レスポンシブレイアウト

### Phase 2 - 基本機能
1. ピンチズーム実装
2. 視点切替ボタン
3. リスポーンボタン
4. モバイル用設定調整

### Phase 3 - 改善機能
1. ハプティックフィードバック
2. ジェスチャー認識の改善
3. パフォーマンス最適化
4. 横画面専用レイアウト

## テスト項目

### 機能テスト
- [ ] ジョイスティックによる8方向移動
- [ ] ダッシュの自動発動
- [ ] ジャンプボタンの動作
- [ ] カメラ回転（スワイプ）
- [ ] ズーム（ピンチ）
- [ ] マルチタッチの競合解決

### デバイステスト
- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] iPad Safari
- [ ] Android Tablet

### パフォーマンステスト
- [ ] 60FPS維持（ハイエンド）
- [ ] 30FPS維持（ミドルレンジ）
- [ ] メモリ使用量監視
- [ ] バッテリー消費確認

## 実装例

### 横向き専用モバイルコントロールHTML
```html
<!-- 縦向き時の回転促進メッセージ -->
<div id="orientationMessage" class="orientation-message">
  <div class="rotate-icon">📱↻</div>
  <h2>画面を横向きにしてください</h2>
  <p>最適なゲーム体験のため、デバイスを横向きにしてプレイしてください</p>
</div>

<!-- 横向き時のゲームコントロール -->
<div id="mobileControls" class="mobile-controls-landscape">
  <!-- 左手エリア（アクションボタン） -->
  <div class="left-controls">
    <button id="jumpButton" class="action-btn jump-btn">JUMP</button>
    <button id="dashButton" class="action-btn dash-btn">DASH</button>
  </div>
  
  <!-- 中央カメラ操作エリア -->
  <div id="cameraTouch" class="camera-touch-area"></div>
  
  <!-- 右手エリア（ジョイスティック） -->
  <div class="right-controls">
    <div id="joystickContainer">
      <div id="joystickBase">
        <div id="joystickKnob"></div>
      </div>
    </div>
  </div>
  
  <!-- 上部UI -->
  <div class="top-controls">
    <button id="respawnBtn" class="top-btn">R</button>
    <button id="cameraToggleBtn" class="top-btn">📷</button>
    <button id="settingsBtn" class="top-btn">⚙️</button>
  </div>
</div>
```

### 横向き専用CSS
```css
/* 横向き専用レイアウト */
.mobile-controls-landscape {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.mobile-controls-landscape > * {
  pointer-events: auto;
}

/* 左手エリア（アクションボタン） */
.left-controls {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 180px;
  height: 100%;
}

.action-btn {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: bold;
}

.jump-btn {
  bottom: 80px;
  left: 40px;
  width: 70px;
  height: 70px;
  background: rgba(100, 150, 255, 0.35);
}

.dash-btn {
  bottom: 30px;
  left: 120px;
  width: 60px;
  height: 60px;
  background: rgba(255, 150, 50, 0.35);
}

/* 右手エリア（ジョイスティック） */
.right-controls {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 180px;
  height: 100%;
}

#joystickContainer {
  position: absolute;
  bottom: 30px;
  right: 40px;
}

/* 中央カメラエリア */
.camera-touch-area {
  position: absolute;
  left: 180px;
  right: 180px;
  top: 0;
  bottom: 0;
  /* デバッグ用: background: rgba(0, 255, 0, 0.1); */
}

/* 横向きのみ表示 */
@media (orientation: landscape) {
  .mobile-controls-landscape {
    display: block;
  }
}

/* 縦向き時は回転メッセージ */
@media (orientation: portrait) {
  .orientation-message {
    display: flex !important;
  }
  .mobile-controls-landscape {
    display: none !important;
  }
}
```

### タッチイベント基本実装
```javascript
// ジョイスティック制御
let joystickTouch = null;
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

joystickBase.addEventListener('touchstart', (e) => {
  if (!joystickTouch) {
    const touch = e.touches[0];
    joystickTouch = touch.identifier;
    updateJoystick(touch);
  }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  for (let touch of e.touches) {
    if (touch.identifier === joystickTouch) {
      updateJoystick(touch);
      e.preventDefault();
    }
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  for (let touch of e.changedTouches) {
    if (touch.identifier === joystickTouch) {
      joystickTouch = null;
      resetJoystick();
    }
  }
});
```

## 今後の拡張案

### 横向き専用の改善案

1. **エルゴノミクス最適化**
   - 親指の可動範囲に基づくボタン配置の微調整
   - デバイスサイズ別の自動レイアウト調整
   - 手の大きさに応じたUIスケール設定

2. **操作カスタマイズ**
   - ボタン配置のカスタマイズ（左利き対応含む）
   - ジョイスティックの感度調整
   - デッドゾーンのカスタマイズ
   - ボタンサイズの調整

3. **ゲームパッド風の拡張**
   - L/Rトリガーエリアの追加（画面上部の角）
   - コンボ操作のサポート
   - 振動フィードバックの強化

4. **横向き特有の機能**
   - ミニマップ表示（空いた画面スペースを活用）
   - クイックアクセスメニュー（スワイプダウン）
   - ステータス表示の最適化

5. **パフォーマンスモード**
   - 省電力モード（30FPS制限、エフェクト削減）
   - 高性能モード（60FPS、全エフェクト有効）
   - 自動調整モード（バッテリー残量に応じて）