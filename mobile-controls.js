// mobile-controls.js - モバイルコントロールシステム

// モバイルデバイス判定
export function isMobile() {
  // URLパラメータでデバッグモード判定
  const urlParams = new URLSearchParams(window.location.search);
  const debugMobile = urlParams.get('mobile') === 'true';
  
  if (debugMobile) {
    console.log('Debug mobile mode enabled');
    return true;
  }
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia("(max-width: 1024px)").matches && 
     'ontouchstart' in window);
}

// モバイルコントロール管理クラス
export class MobileControls {
  constructor() {
    this.enabled = false;
    
    // 移動用ジョイスティック（右側）
    this.joystick = {
      touchId: null,
      active: false,
      knob: null,
      base: null,
      container: null,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
      vector: { x: 0, y: 0 }
    };
    
    // カメラ用ジョイスティック（左側）
    this.cameraJoystick = {
      touchId: null,
      active: false,
      knob: null,
      base: null,
      container: null,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
      vector: { x: 0, y: 0 }
    };
    
    this.camera = {
      touchIds: [],
      startPos: [],
      lastPos: [],
      pinchDistance: 0
    };
    
    this.buttons = {
      jump: false,
      dash: false
    };
    
    this.moveVector = { x: 0, y: 0 };
    this.cameraRotation = { x: 0, y: 0 };
    this.zoomDelta = 0;
    
    this.init();
  }
  
  init() {
    // デバイス判定
    if (!isMobile()) {
      console.log('Desktop mode - mobile controls disabled');
      return;
    }
    
    console.log('Mobile mode - initializing controls');
    console.log('User Agent:', navigator.userAgent);
    console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
    this.enabled = true;
    
    // 画面向き検出
    this.checkOrientation();
    window.addEventListener('orientationchange', () => this.checkOrientation());
    window.addEventListener('resize', () => this.checkOrientation());
    
    // DOM要素取得
    this.setupElements();
    
    // イベントリスナー設定
    if (this.enabled) {
      this.setupEventListeners();
    }
  }
  
  setupElements() {
    // 移動用ジョイスティック要素（右側）
    this.joystick.container = document.getElementById('joystickContainer');
    this.joystick.base = document.getElementById('joystickBase');
    this.joystick.knob = document.getElementById('joystickKnob');
    
    // カメラ用ジョイスティック要素（左側）
    this.cameraJoystick.container = document.getElementById('cameraJoystickContainer');
    this.cameraJoystick.base = document.getElementById('cameraJoystickBase');
    this.cameraJoystick.knob = document.getElementById('cameraJoystickKnob');
    
    // ボタン要素
    this.jumpBtn = document.getElementById('mobileJumpBtn');
    this.dashBtn = document.getElementById('mobileDashBtn');
    
    // カメラタッチエリア
    this.cameraArea = document.getElementById('cameraTouch');
    
    // 向きメッセージ
    this.orientationMessage = document.getElementById('orientationMessage');
    this.mobileControls = document.getElementById('mobileControls');
  }
  
  checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (!this.enabled) return;
    
    if (!isLandscape) {
      // 縦向きの場合
      if (this.orientationMessage) {
        this.orientationMessage.style.display = 'flex';
      }
      if (this.mobileControls) {
        this.mobileControls.style.display = 'none';
      }
    } else {
      // 横向きの場合
      if (this.orientationMessage) {
        this.orientationMessage.style.display = 'none';
      }
      if (this.mobileControls) {
        this.mobileControls.style.display = 'block';
      }
    }
    
    // 画面向きロック（可能な場合）
    if (screen.orientation && screen.orientation.lock && isLandscape) {
      screen.orientation.lock('landscape').catch(() => {
        console.log('Screen orientation lock not supported');
      });
    }
  }
  
  setupEventListeners() {
    console.log('Setting up event listeners');
    
    // デバッグモードの場合、マウスイベントも追加
    const isDebug = new URLSearchParams(window.location.search).get('mobile') === 'true';
    
    // 移動用ジョイスティックイベント（右側）
    if (this.joystick.base) {
      console.log('Movement joystick base found:', this.joystick.base);
      
      // タッチイベント
      this.joystick.base.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
      document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
      document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
      document.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
      
      // デバッグ用マウスイベント
      if (isDebug) {
        this.joystick.base.addEventListener('mousedown', (e) => this.onJoystickStartMouse(e), { passive: false });
        document.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: false });
        document.addEventListener('mouseup', (e) => this.onMouseUp(e), { passive: false });
      }
    } else {
      console.error('Movement joystick base not found!');
    }
    
    // カメラ用ジョイスティックイベント（左側）
    if (this.cameraJoystick.base) {
      console.log('Camera joystick base found:', this.cameraJoystick.base);
      
      // タッチイベント
      this.cameraJoystick.base.addEventListener('touchstart', (e) => this.onCameraJoystickStart(e), { passive: false });
      
      // デバッグ用マウスイベント
      if (isDebug) {
        this.cameraJoystick.base.addEventListener('mousedown', (e) => this.onCameraJoystickStartMouse(e), { passive: false });
      }
    } else {
      console.error('Camera joystick base not found!');
    }
    
    // ジャンプボタン
    if (this.jumpBtn) {
      console.log('Jump button found:', this.jumpBtn);
      
      this.jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.buttons.jump = true;
        console.log('Jump pressed (touch)');
      }, { passive: false });
      
      this.jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.buttons.jump = false;
      }, { passive: false });
      
      // デバッグ用マウスイベント
      if (isDebug) {
        this.jumpBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.buttons.jump = true;
          console.log('Jump pressed (mouse)');
        });
        
        this.jumpBtn.addEventListener('mouseup', (e) => {
          e.preventDefault();
          this.buttons.jump = false;
        });
      }
    } else {
      console.error('Jump button not found!');
    }
    
    // ダッシュボタン
    if (this.dashBtn) {
      console.log('Dash button found:', this.dashBtn);
      
      this.dashBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.buttons.dash = true;
        this.dashBtn.classList.add('active');
        console.log('Dash pressed (touch)');
      }, { passive: false });
      
      this.dashBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.buttons.dash = false;
        this.dashBtn.classList.remove('active');
      }, { passive: false });
      
      // デバッグ用マウスイベント
      if (isDebug) {
        this.dashBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.buttons.dash = true;
          this.dashBtn.classList.add('active');
          console.log('Dash pressed (mouse)');
        });
        
        this.dashBtn.addEventListener('mouseup', (e) => {
          e.preventDefault();
          this.buttons.dash = false;
          this.dashBtn.classList.remove('active');
        });
      }
    } else {
      console.error('Dash button not found!');
    }
    
    // カメラタッチエリア
    if (this.cameraArea) {
      this.cameraArea.addEventListener('touchstart', (e) => this.onCameraStart(e), { passive: false });
    }
  }
  
  // カメラジョイスティックのイベントハンドラー
  onCameraJoystickStart(e) {
    try {
      e.preventDefault();
      
      // 既にカメラジョイスティック操作中の場合は無視
      if (this.cameraJoystick.touchId !== null) return;
      
      const touch = e.touches[0];
      this.cameraJoystick.touchId = touch.identifier;
      this.cameraJoystick.active = true;
      
      const rect = this.cameraJoystick.base.getBoundingClientRect();
      this.cameraJoystick.startPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      this.updateCameraJoystick(touch);
    } catch (error) {
      console.error('Camera joystick start error:', error);
      this.cameraJoystick.touchId = null;
      this.cameraJoystick.active = false;
    }
  }
  
  onCameraJoystickStartMouse(e) {
    e.preventDefault();
    
    if (this.cameraJoystick.touchId !== null) return;
    
    this.cameraJoystick.touchId = 'mouse';
    this.cameraJoystick.active = true;
    
    const rect = this.cameraJoystick.base.getBoundingClientRect();
    this.cameraJoystick.startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    this.updateCameraJoystickMouse(e);
  }
  
  // 移動ジョイスティックのイベントハンドラー
  onJoystickStart(e) {
    try {
      e.preventDefault();
      
      // 既にジョイスティック操作中の場合は無視
      if (this.joystick.touchId !== null) return;
      
      const touch = e.touches[0];
      this.joystick.touchId = touch.identifier;
      this.joystick.active = true;
      
      const rect = this.joystick.base.getBoundingClientRect();
      this.joystick.startPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      this.updateJoystick(touch);
    } catch (error) {
      console.error('Joystick start error:', error);
      this.joystick.touchId = null;
      this.joystick.active = false;
    }
  }
  
  onCameraStart(e) {
    try {
      
      e.preventDefault();
      
      const touches = e.touches;
      
      // カメラ用のタッチを記録（ジョイスティック用のタッチは除外）
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        // ジョイスティック用のタッチまたは既に記録されているタッチIDは無視
        if (touch.identifier !== this.joystick.touchId && !this.camera.touchIds.includes(touch.identifier)) {
          this.camera.touchIds.push(touch.identifier);
          this.camera.startPos.push({ x: touch.clientX, y: touch.clientY });
          this.camera.lastPos.push({ x: touch.clientX, y: touch.clientY });
        }
      }
      
      // ピンチズーム用の初期距離計算
      if (touches.length === 2) {
        const dx = touches[1].clientX - touches[0].clientX;
        const dy = touches[1].clientY - touches[0].clientY;
        this.camera.pinchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    } catch (error) {
      console.error('Camera start error:', error);
    }
  }
  
  onTouchMove(e) {
    try {
      // 移動ジョイスティックの処理
      let joystickHandled = false;
      for (let touch of e.touches) {
        if (touch.identifier === this.joystick.touchId) {
          e.preventDefault();
          this.updateJoystick(touch);
          joystickHandled = true;
          break;
        }
      }
      
      // カメラジョイスティックの処理
      let cameraJoystickHandled = false;
      for (let touch of e.touches) {
        if (touch.identifier === this.cameraJoystick.touchId) {
          e.preventDefault();
          this.updateCameraJoystick(touch);
          cameraJoystickHandled = true;
          break;
        }
      }
      
      // カメラの処理（ジョイスティック用のタッチは除外）
      const cameraTouch = [];
      for (let touch of e.touches) {
        // ジョイスティック用のタッチは除外
        if (touch.identifier !== this.joystick.touchId) {
          const index = this.camera.touchIds.indexOf(touch.identifier);
          if (index !== -1) {
            e.preventDefault();
            cameraTouch.push({ touch, index });
          }
        }
      }
      
      if (cameraTouch.length === 1) {
        // 1本指 - カメラ回転
        const { touch, index } = cameraTouch[0];
        const dx = touch.clientX - this.camera.lastPos[index].x;
        const dy = touch.clientY - this.camera.lastPos[index].y;
        
        this.cameraRotation.x = dx * 0.004;
        this.cameraRotation.y = dy * 0.003;
        
        this.camera.lastPos[index] = { x: touch.clientX, y: touch.clientY };
      } else if (cameraTouch.length === 2) {
        // 2本指 - ピンチズーム
        const validTouches = [];
        for (let i = 0; i < e.touches.length; i++) {
          // ジョイスティック用のタッチは除外
          if (e.touches[i].identifier !== this.joystick.touchId && 
              this.camera.touchIds.includes(e.touches[i].identifier)) {
            validTouches.push(e.touches[i]);
          }
        }
        
        if (validTouches.length === 2) {
          const dx = validTouches[1].clientX - validTouches[0].clientX;
          const dy = validTouches[1].clientY - validTouches[0].clientY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (this.camera.pinchDistance > 0) {
            this.zoomDelta = (distance - this.camera.pinchDistance) * 0.01;
          }
          
          this.camera.pinchDistance = distance;
        }
        
        // 位置も更新
        for (let { touch, index } of cameraTouch) {
          if (this.camera.lastPos[index]) {
            this.camera.lastPos[index] = { x: touch.clientX, y: touch.clientY };
          }
        }
      }
    } catch (error) {
      console.error('Touch move error:', error);
      // エラー時はジョイスティックとカメラの状態をリセット
      this.resetJoystick();
      this.camera.touchIds = [];
      this.camera.startPos = [];
      this.camera.lastPos = [];
    }
  }
  
  onTouchEnd(e) {
    try {
      // changedTouchesが存在しない場合の対処
      const touches = e.changedTouches || [];
      
      for (let touch of touches) {
        // 移動ジョイスティックの処理
        if (touch.identifier === this.joystick.touchId) {
          this.joystick.touchId = null;
          this.joystick.active = false;
          this.resetJoystick();
        }
        
        // カメラジョイスティックの処理
        if (touch.identifier === this.cameraJoystick.touchId) {
          this.cameraJoystick.touchId = null;
          this.cameraJoystick.active = false;
          this.resetCameraJoystick();
        }
        
        // カメラタッチの処理
        const index = this.camera.touchIds.indexOf(touch.identifier);
        if (index !== -1) {
          this.camera.touchIds.splice(index, 1);
          this.camera.startPos.splice(index, 1);
          this.camera.lastPos.splice(index, 1);
          
          if (this.camera.touchIds.length === 0) {
            this.cameraRotation = { x: 0, y: 0 };
            this.zoomDelta = 0;
            this.camera.pinchDistance = 0;
          }
        }
      }
    } catch (error) {
      console.error('Touch end error:', error);
      // エラー時は全ての状態をリセット
      this.joystick.touchId = null;
      this.joystick.active = false;
      this.resetJoystick();
      this.camera.touchIds = [];
      this.camera.startPos = [];
      this.camera.lastPos = [];
      this.cameraRotation = { x: 0, y: 0 };
      this.zoomDelta = 0;
    }
  }
  
  updateJoystick(touch) {
    const dx = touch.clientX - this.joystick.startPos.x;
    const dy = touch.clientY - this.joystick.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40; // ジョイスティックの最大移動距離
    
    let clampedDistance = Math.min(distance, maxDistance);
    let angle = Math.atan2(dy, dx);
    
    // ノブの位置更新
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;
    
    if (this.joystick.knob) {
      this.joystick.knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      
      // ダッシュ判定（80%以上）
      if (clampedDistance > maxDistance * 0.8) {
        this.joystick.knob.classList.add('active');
      } else {
        this.joystick.knob.classList.remove('active');
      }
    }
    
    // 移動ベクトル計算（-1 ~ 1）
    if (distance > 5) { // デッドゾーン
      this.moveVector.x = (knobX / maxDistance);
      this.moveVector.y = -(knobY / maxDistance); // Y軸は反転
    } else {
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    }
    
    // 自動ダッシュ（80%以上倒したとき）
    this.joystick.isDashing = clampedDistance > maxDistance * 0.8;
  }
  
  updateCameraJoystick(touch) {
    const dx = touch.clientX - this.cameraJoystick.startPos.x;
    const dy = touch.clientY - this.cameraJoystick.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40;
    
    let clampedDistance = Math.min(distance, maxDistance);
    let angle = Math.atan2(dy, dx);
    
    // ノブの位置更新
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;
    
    if (this.cameraJoystick.knob) {
      this.cameraJoystick.knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      this.cameraJoystick.knob.classList.add('active');
    }
    
    // カメラ回転用のベクトル計算
    if (distance > 5) {
      this.cameraJoystick.vector.x = (dx / maxDistance) * 0.05;
      this.cameraJoystick.vector.y = (dy / maxDistance) * 0.04;
    } else {
      this.cameraJoystick.vector.x = 0;
      this.cameraJoystick.vector.y = 0;
    }
  }
  
  updateCameraJoystickMouse(e) {
    const dx = e.clientX - this.cameraJoystick.startPos.x;
    const dy = e.clientY - this.cameraJoystick.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40;
    
    let clampedDistance = Math.min(distance, maxDistance);
    let angle = Math.atan2(dy, dx);
    
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;
    
    if (this.cameraJoystick.knob) {
      this.cameraJoystick.knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      this.cameraJoystick.knob.classList.add('active');
    }
    
    if (distance > 5) {
      this.cameraJoystick.vector.x = (dx / maxDistance) * 0.05;
      this.cameraJoystick.vector.y = (dy / maxDistance) * 0.04;
    } else {
      this.cameraJoystick.vector.x = 0;
      this.cameraJoystick.vector.y = 0;
    }
  }
  
  resetCameraJoystick() {
    if (this.cameraJoystick.knob) {
      this.cameraJoystick.knob.style.transform = 'translate(0, 0)';
      this.cameraJoystick.knob.classList.remove('active');
    }
    
    this.cameraJoystick.vector = { x: 0, y: 0 };
    this.cameraJoystick.currentPos = { x: 0, y: 0 };
  }
  
  resetJoystick() {
    if (this.joystick.knob) {
      this.joystick.knob.style.transform = 'translate(0px, 0px)';
      this.joystick.knob.classList.remove('active');
    }
    this.moveVector = { x: 0, y: 0 };
    this.joystick.isDashing = false;
  }
  
  // ゲームループから呼び出されるメソッド
  getMovement() {
    if (!this.enabled) return null;
    
    return {
      move: this.moveVector,
      jump: this.buttons.jump,
      dash: this.buttons.dash || this.joystick.isDashing,
      cameraRotation: this.cameraRotation,
      zoom: this.zoomDelta
    };
  }
  
  // フレーム更新後に呼び出す
  resetFrameInputs() {
    this.buttons.jump = false; // ジャンプは1フレームのみ
    this.cameraRotation = { x: 0, y: 0 };
    this.zoomDelta = 0;
  }
  
  // デバッグ用マウスイベントハンドラー
  onJoystickStartMouse(e) {
    e.preventDefault();
    console.log('Mouse down on joystick');
    
    if (this.joystick.touchId !== null) return;
    
    this.joystick.touchId = 'mouse';
    this.joystick.active = true;
    
    const rect = this.joystick.base.getBoundingClientRect();
    this.joystick.startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    this.updateJoystickMouse(e);
  }
  
  onMouseMove(e) {
    if (this.joystick.touchId === 'mouse') {
      e.preventDefault();
      this.updateJoystickMouse(e);
    }
    if (this.cameraJoystick.touchId === 'mouse') {
      e.preventDefault();
      this.updateCameraJoystickMouse(e);
    }
  }
  
  onMouseUp(e) {
    if (this.joystick.touchId === 'mouse') {
      this.joystick.touchId = null;
      this.joystick.active = false;
      this.resetJoystick();
    }
    if (this.cameraJoystick.touchId === 'mouse') {
      this.cameraJoystick.touchId = null;
      this.cameraJoystick.active = false;
      this.resetCameraJoystick();
    }
  }
  
  updateJoystickMouse(e) {
    const dx = e.clientX - this.joystick.startPos.x;
    const dy = e.clientY - this.joystick.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40;
    
    let clampedDistance = Math.min(distance, maxDistance);
    let angle = Math.atan2(dy, dx);
    
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;
    
    if (this.joystick.knob) {
      this.joystick.knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      
      if (clampedDistance > maxDistance * 0.8) {
        this.joystick.knob.classList.add('active');
      } else {
        this.joystick.knob.classList.remove('active');
      }
    }
    
    if (distance > 5) {
      this.moveVector.x = (knobX / maxDistance);
      this.moveVector.y = -(knobY / maxDistance);
    } else {
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    }
    
    this.joystick.isDashing = clampedDistance > maxDistance * 0.8;
  }
}

// シングルトンインスタンス
let mobileControlsInstance = null;

export function initMobileControls() {
  if (!mobileControlsInstance) {
    mobileControlsInstance = new MobileControls();
  }
  return mobileControlsInstance;
}

export function getMobileControls() {
  return mobileControlsInstance;
}