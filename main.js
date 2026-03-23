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

  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];

  camera.speed = 0.4;
  camera.angularSensibility = 4000;

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
    meshes.forEach(mesh => mesh.checkCollisions = true);
  });

  // ===== 銃 =====
  let ejectPoint = null;

  BABYLON.SceneLoader.ImportMesh("", "models/", "gun.glb", scene, (meshes) => {
    const gun = meshes[0];

    gun.parent = camera;
    gun.position = new BABYLON.Vector3(0.4, -0.3, 1.6);
    gun.rotation = new BABYLON.Vector3(0.05, -1.75, 0.03);
    gun.scaling = new BABYLON.Vector3(0.34, 0.34, 0.34);

    gun.alwaysSelectAsActiveMesh = true;
    gun.isPickable = false;

    // ===== 排莢口ポイント =====
    ejectPoint = new BABYLON.TransformNode("ejectPoint", scene);
    ejectPoint.parent = gun;

    // ★ここをデバッグで合わせる
    ejectPoint.position = new BABYLON.Vector3(0.2, 0.1, 0);
  });

  // ===== 薬莢モデル =====
  let shellTemplate = null;

  BABYLON.SceneLoader.ImportMesh("", "models/", "shell.glb", scene, (meshes) => {
    shellTemplate = meshes[0];
    shellTemplate.setEnabled(false);
  });

  scene.shells = [];

  // ===== デバッグ =====
  let debugMode = false;
  let debugShell = null;

  let shellScale = 0.05;
  let shellRotation = new BABYLON.Vector3(0, 0, 0);

  // ===== 敵 =====
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", {}, scene);
  enemy.position = new BABYLON.Vector3(0, 1, 10);
  enemy.isEnemy = true;

  // ===== 射撃 =====
  let isShooting = false;
  let lastShot = 0;
  const fireRate = 100;
  let recoil = 0;

  canvas.addEventListener("mousedown", () => isShooting = true);
  canvas.addEventListener("mouseup", () => isShooting = false);

  scene.onBeforeRenderObservable.add(() => {

    // ===== 射撃 =====
    if (isShooting) {
      const now = Date.now();
      if (now - lastShot > fireRate) {

        lastShot = now;

        const ray = scene.createPickingRay(
          engine.getRenderWidth() / 2,
          engine.getRenderHeight() / 2,
          BABYLON.Matrix.Identity(),
          camera
        );

        const hit = scene.pickWithRay(ray);

        if (hit.pickedMesh && hit.pickedMesh.isEnemy) {
          hit.pickedMesh.dispose();
        }

        if (hit.pickedPoint) {
          const line = BABYLON.MeshBuilder.CreateLines("shot", {
            points: [camera.position, hit.pickedPoint]
          }, scene);
          setTimeout(() => line.dispose(), 30);
        }

        recoil += 0.02;

        // ===== 薬莢生成（排莢口から） =====
        if (shellTemplate && ejectPoint) {

          const shell = shellTemplate.clone("shell");
          shell.setEnabled(true);

          shell.position = ejectPoint.getAbsolutePosition();

          shell.scaling = new BABYLON.Vector3(shellScale, shellScale, shellScale);
          shell.rotation = shellRotation.clone();

          const right = ejectPoint.getDirection(BABYLON.Axis.X);

          shell.velocity = right.scale(0.25)
            .add(new BABYLON.Vector3(0, 0.15, 0));

          scene.shells.push(shell);

          setTimeout(() => shell.dispose(), 3000);
        }
      }
    }

    // ===== 反動 =====
    camera.rotation.x -= recoil;
    recoil *= 0.9;

    // ===== 薬莢物理 =====
    scene.shells.forEach((s) => {
      if (!s) return;

      s.velocity.y -= 0.01;
      s.position.addInPlace(s.velocity);

      s.rotation.x += 0.2;
      s.rotation.y += 0.2;

      if (s.position.y < 0) {
        s.position.y = 0;
        s.velocity = BABYLON.Vector3.Zero();
      }
    });

    // ===== デバッグ表示 =====
    if (debugMode && debugShell && ejectPoint) {

      debugShell.position = ejectPoint.getAbsolutePosition();
      debugShell.scaling = new BABYLON.Vector3(shellScale, shellScale, shellScale);
      debugShell.rotation = shellRotation;
    }

  });

  // ===== キー操作 =====
  window.addEventListener("keydown", (e) => {

    // デバッグON/OFF
    if (e.key === "p") {
      debugMode = !debugMode;
      console.log("DEBUG:", debugMode ? "ON" : "OFF");

      if (debugMode && shellTemplate) {
        debugShell = shellTemplate.clone("debugShell");
        debugShell.setEnabled(true);
      } else {
        if (debugShell) {
          debugShell.dispose();
          debugShell = null;
        }
      }
    }

    if (!debugMode) return;

    const scaleStep = e.shiftKey ? 0.01 : 0.05;
    const rotStep = 0.1;

    switch (e.key) {

      // ===== サイズ =====
      case "+":
      case "=": shellScale += scaleStep; break;
      case "-": shellScale -= scaleStep; break;

      // ===== 回転 =====
      case "u": shellRotation.x += rotStep; break;
      case "j": shellRotation.x -= rotStep; break;

      case "i": shellRotation.y += rotStep; break;
      case "k": shellRotation.y -= rotStep; break;

      case "o": shellRotation.z += rotStep; break;
      case "l": shellRotation.z -= rotStep; break;

      // コピー
      case "c":
        console.log("=== COPY ===");
        console.log(`ejectPoint.position = new BABYLON.Vector3(${ejectPoint.position.x}, ${ejectPoint.position.y}, ${ejectPoint.position.z});`);
        console.log(`shellScale = ${shellScale};`);
        console.log(`shellRotation = new BABYLON.Vector3(${shellRotation.x}, ${shellRotation.y}, ${shellRotation.z});`);
        break;
    }

    if (shellScale < 0.01) shellScale = 0.01;

    console.log(`サイズ: ${shellScale.toFixed(3)}`);
    console.log(
      `回転: new BABYLON.Vector3(${shellRotation.x.toFixed(2)}, ${shellRotation.y.toFixed(2)}, ${shellRotation.z.toFixed(2)})`
    );
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

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    camera.cameraDirection.y = 0.2;
  }
});

window.addEventListener("resize", () => {
  engine.resize();
});
