const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let camera;

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // ===== 空 =====
  scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1);

  // ===== カメラ =====
  camera = new BABYLON.UniversalCamera("camera",
    new BABYLON.Vector3(0, 2, -10), scene);

  camera.attachControl(canvas, true);

  // WASD
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];

  camera.speed = 0.4;
  camera.angularSensibility = 4000;

  // 衝突
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
  scene.collisionsEnabled = true;

  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(1, 1, 1);

  // ===== ライト =====
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

  // ===== 銃（完成状態）=====
  BABYLON.SceneLoader.ImportMesh("", "models/", "gun.glb", scene, (meshes) => {
    const gun = meshes[0];

    gun.parent = camera;

    // 位置
    gun.position = new BABYLON.Vector3(0.4, -0.3, 1.6);

    // 回転（最適化済み）
    gun.rotation = new BABYLON.Vector3(
      0.05,
      -1.75,
      0.03
    );

    // サイズ
    gun.scaling = new BABYLON.Vector3(0.34, 0.34, 0.34);

    // 透明対策
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
  let canShoot = true;

  window.addEventListener("click", () => {

    if (!canShoot) return;
    canShoot = false;

    // レイ
    const ray = scene.createPickingRay(
      engine.getRenderWidth() / 2,
      engine.getRenderHeight() / 2,
      BABYLON.Matrix.Identity(),
      camera
    );

    const hit = scene.pickWithRay(ray);

    // 敵ヒット
    if (hit.pickedMesh && hit.pickedMesh.name === "enemy") {
      hit.pickedMesh.dispose();
      console.log("Enemy Down!");
    }

    // 弾の線
    if (hit.pickedPoint) {
      const points = [camera.position, hit.pickedPoint];

      const line = BABYLON.MeshBuilder.CreateLines("shot", {
        points: points
      }, scene);

      setTimeout(() => {
        line.dispose();
      }, 50);
    }

    // 反動
    camera.rotation.x -= 0.05;

    // 連射制御
    setTimeout(() => {
      canShoot = true;
    }, 200);
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
