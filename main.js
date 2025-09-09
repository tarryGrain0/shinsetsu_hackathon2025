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

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 3, 8);

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

// フォールバック地面（GLB失敗時の見やすさ向上）
const fallbackGround = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x93c47d, roughness: 1 })
);
fallbackGround.rotation.x = -Math.PI / 2;
fallbackGround.receiveShadow = true;
scene.add(fallbackGround);

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
  fallbackGround.visible = false;
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

// ランドマーク（カラフルな箱をいくつか）
const palette = [0xff7675, 0x74b9ff, 0x55efc4, 0xfdcb6e, 0xa29bfe, 0xffb4a2];
const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
for (let i = 0; i < 18; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.8 });
  const b = new THREE.Mesh(boxGeo, mat);
  b.castShadow = true; b.receiveShadow = true;
  const r = 30 + Math.random() * 90; const t = Math.random() * Math.PI * 2;
  b.position.set(Math.cos(t) * r, 0.6, Math.sin(t) * r);
  scene.add(b);
}

// --- Avatar: 赤い球体 ---
let SPHERE_R = 0.5;
const avatar = new THREE.Mesh(
  new THREE.SphereGeometry(SPHERE_R, 32, 16),
  new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.0, emissive: 0x220000, emissiveIntensity: 0.25 })
);
avatar.castShadow = true;
avatar.position.set(0, SPHERE_R, 0);
scene.add(avatar);

// 目印：プレイヤーにビコン＆ライト＆座標軸
const avatarLamp = new THREE.PointLight(0xff4444, 1.2, 10);
avatar.add(avatarLamp);
const avatarAxes = new THREE.AxesHelper(1.2); avatar.add(avatarAxes);
const beaconMat = new THREE.SpriteMaterial({ color: 0xff3344, transparent: true, opacity: 0.85, depthTest: false });
const beacon = new THREE.Sprite(beaconMat); beacon.scale.set(0.8, 0.8, 0.8); beacon.position.y = SPHERE_R * 1.8; avatar.add(beacon);
let helpersVisible = true;

// --- Input state ---
const keys = Object.create(null);
addEventListener('keydown', (e) => {
  if (!e.repeat) {
    if (e.code === 'KeyH') { helpersVisible = !helpersVisible; toggleHelpers(); }
    if (e.code === 'KeyR') { respawnAtCenter(); }
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

  // 1) カメラ方向ベクトル（水平面）
  forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));

  // 2) 入力合成（WASD はカメラ基準）
  const move = new THREE.Vector3();
  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyA']) move.sub(right);
  if (keys['KeyD']) move.add(right);

  const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? RUN : WALK;
  if (move.lengthSq() > 0) {
    move.normalize();
    // 壁当たりを簡易判定（前方レイ）
    const step = speed * dt;
    const allowed = willHitWall(new THREE.Vector3(avatar.position.x, avatar.position.y, avatar.position.z), move, step);
    avatar.position.addScaledVector(move, allowed);
  }

  // 3) ジャンプ・重力 + 地面スナップ（GLB床）
  const gy = groundHeightAt(avatar.position.x, avatar.position.z);
  const onGround = Math.abs(avatar.position.y - (gy + SPHERE_R)) < 1e-3;
  if (keys['Space'] && onGround) vY = JUMP_V;
  vY -= GRAVITY * dt;
  avatar.position.y += vY * dt;
  if (avatar.position.y < gy + SPHERE_R) { avatar.position.y = gy + SPHERE_R; vY = 0; }

  // 4) 三人称カメラ（肩越し風） & 障害物で手前に寄せる
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

console.log('%cTIP', 'background:#34d399;color:#111;padding:2px 6px;border-radius:6px', 'ローカルHTTPサーバーで開いてください。例: `python3 -m http.server`');