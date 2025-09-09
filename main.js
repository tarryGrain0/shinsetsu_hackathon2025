import * as THREE from 'https://esm.sh/three@0.160.0';
import { GLTFLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/KTX2Loader.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe7f1);
// デバッグしやすいよう一旦フォグOFF（必要なら後で有効化）
scene.fog = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 3, 8);

// カメラモード（デフォルトは1人称視点）
let isFirstPerson = true;

// 三人称カメラのパラメータ
let camYaw = 0.0;              // Y周り角（左右）
let camPitch = Math.PI * 0.38; // 上下（0〜π）
let camDist = 7.0;             // 距離
let camMinDist = 2.2, camMaxDist = 30.0;

// --- Lights ---
const hemi = new THREE.HemisphereLight(0xbfdfff, 0x526b52, 0.7);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 16, 10);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 80;
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.15)); // 最低限の環境光

// --- World (GLB room) ---
const worldRoot = new THREE.Group();
scene.add(worldRoot);

const staticMeshes = []; // 当たり判定・地面判定対象
let worldBBox = null; // ルーム全体のBBox
let worldLoaded = false; // GLB読込完了フラグ
let bboxHelper = null;
const statusEl = document.getElementById('status');

// GLTFローダー + Draco/KTX2 対応
const draco = new DRACOLoader();
draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
const ktx2 = new KTX2Loader();
ktx2.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/').detectSupport(renderer);

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
loader.setKTX2Loader(ktx2);

const ROOM_URL = new URL('./assets/room_sample.glb', import.meta.url).href;

loader.load(ROOM_URL, (gltf) => {
  const room = gltf.scene;
  room.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      staticMeshes.push(o);
    }
  });
  worldRoot.add(room);
  worldLoaded = true;
  statusEl.textContent = 'room_sample.glb: loaded';

  // --- BBox からスケール・中心・床を推定
  worldBBox = new THREE.Box3().setFromObject(room);
  const size = worldBBox.getSize(new THREE.Vector3());
  const center = worldBBox.getCenter(new THREE.Vector3());

  // カメラ near/far をシーン規模に合わせる
  const diag = size.length();
  camera.near = Math.max(0.01, diag * 1e-4);
  camera.far = Math.max(500, diag * 2.0);
  camera.updateProjectionMatrix();

  // レイ開始高さ
  rayTopY = worldBBox.max.y + Math.max(5, size.y * 0.5);

  // アバターのサイズ調整
  const targetR = THREE.MathUtils.clamp(diag * 0.02, 0.25, 1.5);
  const k = targetR / SPHERE_R;
  avatar.scale.setScalar(k);
  SPHERE_R = targetR;

  // スポーン
  const gy = groundHeightAt(center.x, center.z);
  const spawnY = Number.isFinite(gy) ? gy + SPHERE_R : center.y + SPHERE_R;
  avatar.position.set(center.x, spawnY, center.z);

  // カメラ距離
  camMinDist = Math.max(1.5, SPHERE_R * 3);
  camMaxDist = Math.max(20.0, diag * 0.6);
  camDist = Math.min(Math.max(camDist, camMinDist + 0.5), camMaxDist * 0.6);

  // BBox可視化（Hで切替）
  bboxHelper = new THREE.Box3Helper(worldBBox, 0x00ff88);
  scene.add(bboxHelper);

}, (e) => {
  if (e && e.total) {
    const p = (e.loaded / e.total * 100).toFixed(0);
    statusEl.textContent = `loading room_sample.glb… ${p}%`;
  } else {
    statusEl.textContent = 'loading room_sample.glb…';
  }
}, (err) => {
  console.error('GLB load error:', err);
  statusEl.textContent = `GLB load error: ${err?.message || err}`;
});

// 簡易ヘルスチェック（HTTPステータス）
fetch(ROOM_URL, { method: 'HEAD' }).then(r => {
  if (!r.ok) statusEl.textContent = `HTTP ${r.status} for room_sample.glb`;
}).catch(e => {
  statusEl.textContent = `Fetch error for room_sample.glb: ${e}`;
});

// --- Avatar: GLBモデル ---
let SPHERE_R = 0.5; // アバターの半径（衝突判定用）
let avatarRotation = 0; // アバターの向き（ラジアン）
const avatar = new THREE.Group(); // GLBを格納するグループ
avatar.position.set(0, SPHERE_R, 0);
scene.add(avatar);

// desk.glbの読み込みと配置
const DESK_URL = new URL('./assets/desk.glb', import.meta.url).href;

// 2つのデスクを配置（中央に並べる）
const deskPositions = [
  { x: -0.8, y: 0, z: 0, rotation: 0 },      // 左側のデスク
  { x: 0.8, y: 0, z: 0, rotation: 0 }        // 右側のデスク
];

deskPositions.forEach((pos, index) => {
  loader.load(DESK_URL, (gltf) => {
    const desk = gltf.scene.clone();
    
    // デスクのサイズを取得して調整
    const deskBBox = new THREE.Box3().setFromObject(desk);
    const deskSize = deskBBox.getSize(new THREE.Vector3());
    
    // カメラの高さの半分より少し高いくらいに調整
    // カメラの高さ = SPHERE_R * 2.5 = 0.5 * 2.5 = 1.25m
    // その半分より少し高い = 約0.7m
    const targetHeight = 0.7;
    const currentHeight = deskSize.y;
    const scale = targetHeight / currentHeight;
    desk.scale.setScalar(scale);
    
    desk.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        staticMeshes.push(o); // 衝突判定に追加
      }
    });
    
    // 位置設定（スケール後の高さを考慮）
    desk.position.set(pos.x, pos.y, pos.z);
    desk.rotation.y = pos.rotation;
    
    scene.add(desk);
    console.log(`Desk ${index + 1} loaded successfully`);
  }, (e) => {
    if (e && e.total) {
      const p = (e.loaded / e.total * 100).toFixed(0);
      console.log(`Loading desk.glb (${index + 1})… ${p}%`);
    }
  }, (err) => {
    console.error(`Desk ${index + 1} GLB load error:`, err);
  });
});

// chair.glbの読み込みと配置
const CHAIR_URL = new URL('./assets/chair.glb', import.meta.url).href;

// 各机に2つずつ椅子を配置（机の長辺側に配置）
const chairPositions = [
  // 左側の机の椅子（長辺側）
  { x: -1.3, y: 0, z: 0, rotation: Math.PI / 2 },    // 左机の左側
  { x: -0.3, y: 0, z: 0, rotation: -Math.PI / 2 },  // 左机の右側
  // 右側の机の椅子（長辺側）
  { x: 0.3, y: 0, z: 0, rotation: Math.PI / 2 },     // 右机の左側
  { x: 1.3, y: 0, z: 0, rotation: -Math.PI / 2 }    // 右机の右側
];

chairPositions.forEach((pos, index) => {
  loader.load(CHAIR_URL, (gltf) => {
    const chair = gltf.scene.clone();
    
    // 椅子のサイズを取得して調整
    const chairBBox = new THREE.Box3().setFromObject(chair);
    const chairSize = chairBBox.getSize(new THREE.Vector3());
    
    // カメラの高さの半分より少し高いくらいに調整（机と同じ）
    const targetHeight = 0.7;
    const currentHeight = chairSize.y;
    const scale = targetHeight / currentHeight;
    chair.scale.setScalar(scale);
    
    chair.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        staticMeshes.push(o); // 衝突判定に追加
      }
    });
    
    // 位置設定
    chair.position.set(pos.x, pos.y, pos.z);
    chair.rotation.y = pos.rotation;
    
    scene.add(chair);
    console.log(`Chair ${index + 1} loaded successfully`);
  }, (e) => {
    if (e && e.total) {
      const p = (e.loaded / e.total * 100).toFixed(0);
      console.log(`Loading chair.glb (${index + 1})… ${p}%`);
    }
  }, (err) => {
    console.error(`Chair ${index + 1} GLB load error:`, err);
  });
});

// アバターGLBの読み込み
const AVATAR_URL = new URL('./assets/avatar.glb', import.meta.url).href;
loader.load(AVATAR_URL, (gltf) => {
  const avatarModel = gltf.scene;
  avatarModel.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  
  // アバターのサイズ調整（必要に応じて）
  const avatarBBox = new THREE.Box3().setFromObject(avatarModel);
  const avatarSize = avatarBBox.getSize(new THREE.Vector3());
  const avatarHeight = avatarSize.y;
  
  // 高さを基準にスケール調整（1メートルに正規化）
  const desiredHeight = 1.0;
  const scale = desiredHeight / avatarHeight;
  avatarModel.scale.setScalar(scale);
  
  // 位置調整（足が地面につくように）
  avatarModel.position.y = -SPHERE_R;
  
  avatar.add(avatarModel);
  console.log('Avatar loaded successfully');
}, (e) => {
  if (e && e.total) {
    const p = (e.loaded / e.total * 100).toFixed(0);
    console.log(`Loading avatar.glb… ${p}%`);
  }
}, (err) => {
  console.error('Avatar GLB load error:', err);
  // フォールバック: 赤い球体を表示
  const fallbackAvatar = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 })
  );
  fallbackAvatar.castShadow = true;
  avatar.add(fallbackAvatar);
});

// 目印：プレイヤーにビコン＆ライト＆座標軸
const avatarLamp = new THREE.PointLight(0xff4444, 1.2, 10);
avatar.add(avatarLamp);
const avatarAxes = new THREE.AxesHelper(1.2); avatar.add(avatarAxes);

let helpersVisible = true;

// --- Input state ---
const keys = Object.create(null);
addEventListener('keydown', (e) => {
  if (!e.repeat) {
    if (e.code === 'KeyH') { helpersVisible = !helpersVisible; toggleHelpers(); }
    if (e.code === 'KeyR') { respawnAtCenter(); }
    if (e.code === 'KeyV') { toggleCameraMode(); }
  }
  keys[e.code] = true;
});
addEventListener('keyup', (e) => keys[e.code] = false);

// マウスでカメラ回転
let dragging = false; let lastX = 0, lastY = 0;
addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
addEventListener('mouseup', () => dragging = false);
addEventListener('mouseleave', () => dragging = false);
addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX; const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  camYaw -= dx * 0.0035;           // 左右回転
  camPitch -= dy * 0.0030;           // 上下回転
  camPitch = Math.max(0.05, Math.min(Math.PI * 0.95, camPitch));
});
addEventListener('wheel', (e) => {
  camDist = Math.min(camMaxDist, Math.max(camMinDist, camDist + e.deltaY * 0.002));
}, { passive: true });

// --- Movement params ---
const WALK = 3.0;     // m/s
const RUN = 5.6;     // m/s
const GRAVITY = 18.0; // 簡易重力
const JUMP_V = 8.0;   // ジャンプ初速
const ROTATION_SPEED = 3.0; // アバターの回転速度 (rad/s)
let vY = 0;           // 垂直速度

const up = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const target = new THREE.Vector3();
const camOffset = new THREE.Vector3();
const desiredCamPos = new THREE.Vector3();
let firstFocus = true;

function toggleHelpers() {
  if (bboxHelper) bboxHelper.visible = helpersVisible;
  avatarAxes.visible = helpersVisible;
}

function toggleCameraMode() {
  isFirstPerson = !isFirstPerson;
  const btn = document.getElementById('cameraToggle');
  if (btn) {
    btn.textContent = isFirstPerson ? '📷 3人称視点に切替' : '📷 1人称視点に切替';
  }
  firstFocus = true; // カメラ位置をリセット
}

function respawnAtCenter() {
  if (worldBBox) {
    const c = worldBBox.getCenter(new THREE.Vector3());
    const gy = groundHeightAt(c.x, c.z);
    const y = Number.isFinite(gy) ? gy + SPHERE_R : c.y + SPHERE_R;
    avatar.position.set(c.x, y, c.z);
    firstFocus = true; // 次フレームでカメラ即追従
  } else {
    avatar.position.set(0, SPHERE_R, 0);
    firstFocus = true;
  }
}

// --- Raycaster for ground & wall ---
const ray = new THREE.Raycaster();
ray.far = 100;
let rayTopY = 50; // GLB読込後に更新
function groundHeightAt(x, z) {
  if (staticMeshes.length === 0) return 0; // GLB未読込時の暫定
  ray.set(new THREE.Vector3(x, rayTopY, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(staticMeshes, true);
  return hits.length ? hits[0].point.y : 0;
}

function willHitWall(from, dir, dist) {
  if (staticMeshes.length === 0) return dist; // 未読込時は無視
  const eps = 1e-2;
  ray.set(from, dir.clone().normalize());
  const hits = ray.intersectObjects(staticMeshes, true);
  if (!hits.length) return dist;
  const d = hits[0].distance;
  if (d < dist + SPHERE_R) return Math.max(0, d - SPHERE_R - eps);
  return dist;
}

// FPS 表示（簡易）
const fpsEl = document.getElementById('fps');
let fpsAcc = 0, fpsFrames = 0, fpsTimer = 0;

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);

  // 1) 方向ベクトルの計算
  // 1人称視点時はアバターの向き、3人称視点時はカメラの向きを使用
  if (isFirstPerson) {
    // アバターの向きを基準にする
    // W: 前進（顔の向き）、S: 後退、A: 左、D: 右
    forward.set(Math.sin(avatarRotation), 0, Math.cos(avatarRotation));
    right.set(Math.cos(avatarRotation), 0, -Math.sin(avatarRotation));
  } else {
    // カメラの向きを基準にする（従来通り）
    forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
  }

  // 2) 入力合成（WASD）
  const move = new THREE.Vector3();
  if (keys['KeyW']) move.sub(forward);  // 前進（カメラ視点では逆）
  if (keys['KeyS']) move.add(forward);  // 後退
  if (keys['KeyA']) move.sub(right);    // 左
  if (keys['KeyD']) move.add(right);    // 右

  const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? RUN : WALK;
  if (move.lengthSq() > 0) {
    move.normalize();
    // 壁当たりを簡易判定（前方レイ）
    const step = speed * dt;
    const allowed = willHitWall(new THREE.Vector3(avatar.position.x, avatar.position.y, avatar.position.z), move, step);
    avatar.position.addScaledVector(move, allowed);
  }
  
  // 矢印キーでアバターを回転（左右）、カメラピッチを調整（上下）
  if (keys['ArrowLeft']) {
    avatarRotation += ROTATION_SPEED * dt;
  }
  if (keys['ArrowRight']) {
    avatarRotation -= ROTATION_SPEED * dt;
  }
  avatar.rotation.y = avatarRotation;
  
  // 上下矢印キーでカメラの上下向きを調整
  const PITCH_SPEED = 2.0; // カメラピッチの回転速度 (rad/s)
  if (keys['ArrowUp']) {
    camPitch += PITCH_SPEED * dt;  // 上を押したら上を向く
  }
  if (keys['ArrowDown']) {
    camPitch -= PITCH_SPEED * dt;  // 下を押したら下を向く
  }
  
  // 人間の首の可動域に合わせて制限（上方向60度、下方向50度）
  const minPitch = Math.PI / 2 - (60 * Math.PI / 180); // 上限（見上げる）
  const maxPitch = Math.PI / 2 + (50 * Math.PI / 180); // 下限（見下ろす）
  camPitch = Math.max(minPitch, Math.min(maxPitch, camPitch));

  // 3) ジャンプ・重力 + 地面スナップ（GLB床）
  const gy = groundHeightAt(avatar.position.x, avatar.position.z);
  const onGround = Math.abs(avatar.position.y - (gy + SPHERE_R)) < 1e-3;
  if (keys['Space'] && onGround) vY = JUMP_V;
  vY -= GRAVITY * dt;
  avatar.position.y += vY * dt;
  if (avatar.position.y < gy + SPHERE_R) { avatar.position.y = gy + SPHERE_R; vY = 0; }

  // 4) カメラモードに応じた処理
  if (isFirstPerson) {
    // 1人称視点: アバターの頭の上から見る
    const eyeHeight = SPHERE_R * 2.5; // 頭の上の高さ（より高い位置に）
    camera.position.set(
      avatar.position.x,
      avatar.position.y + eyeHeight,
      avatar.position.z
    );
    
    // アバターの向きに完全に固定（マウス操作は上下のみ影響）
    // 180度回転させるため、符号を反転
    const lookDir = new THREE.Vector3(
      -Math.sin(avatarRotation),
      Math.sin(camPitch - Math.PI / 2) * 0.8,
      -Math.cos(avatarRotation)
    );
    const lookTarget = new THREE.Vector3().copy(camera.position).add(lookDir);
    camera.lookAt(lookTarget);
  } else {
    // 3人称視点: 従来の肩越しカメラ
    target.set(avatar.position.x, avatar.position.y + SPHERE_R * 0.8, avatar.position.z);
    camOffset.setFromSpherical(new THREE.Spherical(camDist, camPitch, camYaw));
    desiredCamPos.copy(target).add(camOffset);

    // カメラ遮蔽回避
    if (staticMeshes.length) {
      const dirToCam = desiredCamPos.clone().sub(target).normalize();
      ray.set(target, dirToCam);
      const dist = desiredCamPos.distanceTo(target);
      const hits = ray.intersectObjects(staticMeshes, true);
      if (hits.length && hits[0].distance < dist) {
        desiredCamPos.copy(target).addScaledVector(dirToCam, Math.max(0.3, hits[0].distance - 0.2));
      }
    }

    if (firstFocus) { camera.position.copy(desiredCamPos); firstFocus = false; }
    else { camera.position.lerp(desiredCamPos, 0.18); }
    camera.lookAt(target);
  }

  // 5) レンダ＆FPS
  renderer.render(scene, camera);

  fpsAcc += 1 / dt; fpsFrames++; fpsTimer += dt;
  if (fpsTimer > 0.5) { fpsEl.textContent = (fpsAcc / fpsFrames).toFixed(0) + ' FPS'; fpsAcc = 0; fpsFrames = 0; fpsTimer = 0; }

  requestAnimationFrame(animate);
}
animate();
animate();

// --- Resize ---
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// カメラ切り替えボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
  const cameraBtn = document.getElementById('cameraToggle');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', toggleCameraMode);
  }
});

// --- 設定管理システム ---
const SETTINGS_KEY = 'three-room-explorer-settings';

// デフォルト設定
const defaultSettings = {
  graphics: {
    quality: 'medium',
    shadows: true,
    antialiasing: true,
    fov: 75
  },
  ui: {
    showFPS: true,
    showControls: true,
    showHelpers: true,
    showStatus: true
  }
};

// 現在の設定
let currentSettings = { ...defaultSettings };

// LocalStorageから設定を読み込み
function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      currentSettings = { ...defaultSettings, ...JSON.parse(saved) };
      applySettings();
    }
  } catch (e) {
    console.error('設定の読み込みに失敗:', e);
  }
}

// LocalStorageに設定を保存
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
  } catch (e) {
    console.error('設定の保存に失敗:', e);
  }
}

// 設定を適用
function applySettings() {
  // グラフィック設定の適用
  applyGraphicsSettings();
  
  // UI設定の適用
  applyUISettings();
  
  // フォームの値を更新
  updateSettingsForm();
}

// グラフィック設定を適用
function applyGraphicsSettings() {
  const { quality, shadows, antialiasing, fov } = currentSettings.graphics;
  
  // 品質設定によるpixelRatio調整
  switch (quality) {
    case 'low':
      renderer.setPixelRatio(1.0);
      if (dir.shadow) {
        dir.shadow.mapSize.set(512, 512);
      }
      break;
    case 'medium':
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (dir.shadow) {
        dir.shadow.mapSize.set(1024, 1024);
      }
      break;
    case 'high':
      renderer.setPixelRatio(window.devicePixelRatio);
      if (dir.shadow) {
        dir.shadow.mapSize.set(2048, 2048);
      }
      break;
  }
  
  // シャドウ設定
  renderer.shadowMap.enabled = shadows;
  
  // アンチエイリアシング（再作成が必要な場合は警告）
  // 注: WebGLRendererのantialias設定は初期化時のみ有効
  
  // FOV設定
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

// UI設定を適用
function applyUISettings() {
  const { showFPS, showControls, showHelpers, showStatus } = currentSettings.ui;
  
  // FPS表示
  const fpsEl = document.getElementById('fps');
  if (fpsEl) fpsEl.style.display = showFPS ? 'block' : 'none';
  
  // 操作ガイド表示
  const uiEl = document.getElementById('ui');
  if (uiEl) uiEl.style.display = showControls ? 'block' : 'none';
  
  // デバッグヘルパー表示
  helpersVisible = showHelpers;
  toggleHelpers();
  
  // ステータス表示
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.style.display = showStatus ? 'block' : 'none';
}

// 設定フォームの値を更新
function updateSettingsForm() {
  // グラフィック設定
  const qualityEl = document.getElementById('quality');
  if (qualityEl) qualityEl.value = currentSettings.graphics.quality;
  
  const shadowsEl = document.getElementById('shadows');
  if (shadowsEl) shadowsEl.checked = currentSettings.graphics.shadows;
  
  const antialiasingEl = document.getElementById('antialiasing');
  if (antialiasingEl) antialiasingEl.checked = currentSettings.graphics.antialiasing;
  
  const fovEl = document.getElementById('fov');
  if (fovEl) {
    fovEl.value = currentSettings.graphics.fov;
    const fovValueEl = document.getElementById('fovValue');
    if (fovValueEl) fovValueEl.textContent = currentSettings.graphics.fov;
  }
  
  // UI設定
  const showFPSEl = document.getElementById('showFPS');
  if (showFPSEl) showFPSEl.checked = currentSettings.ui.showFPS;
  
  const showControlsEl = document.getElementById('showControls');
  if (showControlsEl) showControlsEl.checked = currentSettings.ui.showControls;
  
  const showHelpersEl = document.getElementById('showHelpers');
  if (showHelpersEl) showHelpersEl.checked = currentSettings.ui.showHelpers;
  
  const showStatusEl = document.getElementById('showStatus');
  if (showStatusEl) showStatusEl.checked = currentSettings.ui.showStatus;
}

// 設定モーダルの初期化
function initSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeBtns = document.querySelectorAll('#closeModalBtn, #closeModalBtn2');
  const resetBtn = document.getElementById('resetSettingsBtn');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 設定ボタンクリック
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }
  
  // 閉じるボタン
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  });
  
  // モーダル背景クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
  
  // タブ切り替え
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // タブのアクティブ状態を更新
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // タブコンテンツの表示を更新
      tabContents.forEach(content => {
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
  
  // リセットボタン
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      applySettings();
      saveSettings();
    });
  }
  
  // 各設定項目のイベントリスナー
  
  // グラフィック設定
  const qualityEl = document.getElementById('quality');
  if (qualityEl) {
    qualityEl.addEventListener('change', (e) => {
      currentSettings.graphics.quality = e.target.value;
      applyGraphicsSettings();
      saveSettings();
    });
  }
  
  const shadowsEl = document.getElementById('shadows');
  if (shadowsEl) {
    shadowsEl.addEventListener('change', (e) => {
      currentSettings.graphics.shadows = e.target.checked;
      applyGraphicsSettings();
      saveSettings();
    });
  }
  
  const antialiasingEl = document.getElementById('antialiasing');
  if (antialiasingEl) {
    antialiasingEl.addEventListener('change', (e) => {
      currentSettings.graphics.antialiasing = e.target.checked;
      // 注: アンチエイリアシングの変更にはレンダラーの再作成が必要
      alert('アンチエイリアシング設定の変更は、ページをリロード後に反映されます。');
      saveSettings();
    });
  }
  
  const fovEl = document.getElementById('fov');
  if (fovEl) {
    fovEl.addEventListener('input', (e) => {
      currentSettings.graphics.fov = parseInt(e.target.value);
      const fovValueEl = document.getElementById('fovValue');
      if (fovValueEl) fovValueEl.textContent = e.target.value;
      applyGraphicsSettings();
      saveSettings();
    });
  }
  
  // UI設定
  const showFPSEl = document.getElementById('showFPS');
  if (showFPSEl) {
    showFPSEl.addEventListener('change', (e) => {
      currentSettings.ui.showFPS = e.target.checked;
      applyUISettings();
      saveSettings();
    });
  }
  
  const showControlsEl = document.getElementById('showControls');
  if (showControlsEl) {
    showControlsEl.addEventListener('change', (e) => {
      currentSettings.ui.showControls = e.target.checked;
      applyUISettings();
      saveSettings();
    });
  }
  
  const showHelpersEl = document.getElementById('showHelpers');
  if (showHelpersEl) {
    showHelpersEl.addEventListener('change', (e) => {
      currentSettings.ui.showHelpers = e.target.checked;
      applyUISettings();
      saveSettings();
    });
  }
  
  const showStatusEl = document.getElementById('showStatus');
  if (showStatusEl) {
    showStatusEl.addEventListener('change', (e) => {
      currentSettings.ui.showStatus = e.target.checked;
      applyUISettings();
      saveSettings();
    });
  }
}

// Gキーで設定モーダルを開く
addEventListener('keydown', (e) => {
  if (e.code === 'KeyG' && !e.repeat) {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.toggle('active');
    }
  }
});

// 初期化時に設定を読み込む
document.addEventListener('DOMContentLoaded', () => {
  initSettingsModal();
  loadSettings();
});

console.log('%cTIP', 'background:#34d399;color:#111;padding:2px 6px;border-radius:6px', 'ローカルHTTPサーバーで開いてください。例: `python3 -m http.server`');