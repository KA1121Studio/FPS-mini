const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let camera;

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // カメラ（FPS）
  camera = new BABYLON.UniversalCamera("camera",
    new BABYLON.Vector3(0, 2, -10), scene);

  camera.attachControl(canvas, true);
  camera.speed = 0.4;
  camera.angularSensibility = 4000;

  // 重力と衝突
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
  scene.collisionsEnabled = true;

  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(1, 1, 1);

  // ライト
  new BABYLON.HemisphericLight("light",
    new BABYLON.Vector3(0, 1, 0), scene);

  // ===== マップ読み込み =====
  BABYLON.SceneLoader.ImportMesh("", "models/", "map.glb", scene, (meshes) => {
    meshes.forEach(mesh => {
      mesh.checkCollisions = true;
    });
  });

  // ===== 銃読み込み =====
  BABYLON.SceneLoader.ImportMesh("", "models/", "gun.glb", scene, (meshes) => {
    const gun = meshes[0];

    gun.parent = camera;
    gun.position = new BABYLON.Vector3(0.5, -0.5, 1);
    gun.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
  });

  // ===== 敵（仮） =====
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
