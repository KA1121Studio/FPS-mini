<script>
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

  // ===== 銃 =====
  BABYLON.SceneLoader.ImportMesh("", "models/", "gun.glb", scene, (meshes) => {
    const gun = meshes[0];

    gun.parent = camera;

    gun.position = new BABYLON.Vector3(0.4, -0.3, 1.6);

    gun.rotation = new BABYLON.Vector3(
      0.05,
      -1.75,
      0.03
    );

    gun.scaling = new BABYLON.Vector3(0.34, 0.34, 0.34);

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

  // ===== 薬莢テンプレ =====
  let shellTemplate = BABYLON.MeshBuilder.CreateCylinder("shell", {
    height: 0.2,
    diameter: 0.05
  }, scene);

  shellTemplate.isVisible = false;
  shellTemplate.isPickable = false;

  scene.shells = [];

  // ===== 射撃（連射＋弱反動）=====
  let isShooting = false;
  let lastShot = 0;
  const fireRate = 100;

  let recoil = 0;

  canvas.addEventListener("mousedown", () => {
    isShooting = true;
  });

  canvas.addEventListener("mouseup", () => {
    isShooting = false;
  });

  scene.onBeforeRenderObservable.add(() => {

    // ===== 射撃 =====
    if (isShooting) {
      const now = Date.now();
      if (now - lastShot >= fireRate) {

        lastShot = now;

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

        if (hit.pickedPoint) {
          const points = [camera.position, hit.pickedPoint];

          const line = BABYLON.MeshBuilder.CreateLines("shot", {
            points: points
          }, scene);

          setTimeout(() => {
            line.dispose();
          }, 30);
        }

        // ===== 反動 =====
        recoil += 0.02;

        // ===== 薬莢生成 =====
        const shell = shellTemplate.clone("shellInstance");
        shell.isVisible = true;

        const right = camera.getDirection(BABYLON.Axis.X);

        shell.position = camera.position
          .add(right.scale(0.3))
          .add(new BABYLON.Vector3(0, -0.2, 0));

        shell.rotation = new BABYLON.Vector3(
          Math.random(),
          Math.random(),
          Math.random()
        );

        shell.velocity = right.scale(0.2)
          .add(new BABYLON.Vector3(0, 0.1, 0));

        scene.shells.push(shell);

        setTimeout(() => {
          shell.dispose();
        }, 3000);
      }
    }

    // ===== 反動戻り =====
    camera.rotation.x -= recoil;
    recoil *= 0.9;

    // ===== 薬莢更新 =====
    scene.shells.forEach((s) => {
      s.velocity.y -= 0.01;
      s.position.addInPlace(s.velocity);

      s.rotation.x += 0.2;
      s.rotation.y += 0.2;

      if (s.position.y < 0) {
        s.position.y = 0;
        s.velocity = BABYLON.Vector3.Zero();
      }
    });

  });

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});

window.addEventListener("resize", () => {
  engine.resize();
});
</script>
