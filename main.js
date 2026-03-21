const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let camera;

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // ===== 空（明るく）=====
  scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1);

  // ===== カメラ（FPS）=====
  camera = new BABYLON.UniversalCamera("camera",
    new BABYLON.Vector3(0, 2, -10), scene);

  camera.attachControl(canvas, true);

  // WASD操作に変更
  camera.keysUp = [87];    // W
  camera.keysDown = [83];  // S
  camera.keysLeft = [65];  // A
  camera.keysRight = [68]; // D

  camera.speed = 0.4;
  camera.angularSensibility = 4000;

  // 重力＆衝突
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
  scene.collisionsEnabled = true;

  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(1, 1, 1);

  // ===== ライト（明るく）=====
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 1.2;

  // ===== マップ =====
  BABYLON.SceneLoader.ImportMesh("", "models/", "map.glb", scene, (meshes) => {
    meshes.forEach(mesh => {
      mesh.checkCollisions = true;
    });
  });

  // ===== 銃 =====
 BABYLON.SceneLoader.ImportMesh("", "models/", "gun.glb", scene, (meshes) => {
  const gun = meshes[0];

  gun.parent = camera;

  // 位置（少し上＋ちょい前）
  gun.position = new BABYLON.Vector3(0.6, -0.4, 1.5);

  // サイズ
  gun.scaling = new BABYLON.Vector3(0.25, 0.25, 0.25);

  // 回転（これが本体）
gun.rotation = new BABYLON.Vector3(
  Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2
);

   
  // 透明バグ修正
  gun.getChildMeshes().forEach(mesh => {
    if (mesh.material) {
      mesh.material.alpha = 1;
      mesh.material.backFaceCulling = true;
      mesh.material.needDepthPrePass = true;
    }
  });
});
  
  // ===== 敵 =====
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", {}, scene);
  enemy.position = new BABYLON.Vector3(0, 1, 10);
  enemy.checkCollisions = true;

  // ===== 射撃 =====
  window.addEventListener("click", () => {

    const ray = scene.createPickingRay(
      engine.getRenderWidth() / 2,
      engine.getRenderHeight() / 2,
      BABYLON.Matrix.Identity(),
      camera
    );

    const hit = scene.pickWithRay(ray);

    if (hit.pickedMesh && hit.pickedMesh.name === "enemy") {
      hit.pickedMesh.dispose();
      console.log("Enemy Down!");
    }

  });

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

// FPSモード
canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});

window.addEventListener("resize", () => {
  engine.resize();
});
