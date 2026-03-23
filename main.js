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
    gun.rotation = new BABYLON.Vector3(0.05, -1.75, 0.03);
    gun.scaling = new BABYLON.Vector3(0.34, 0.34, 0.34);

    gun.alwaysSelectAsActiveMesh = true;
    gun.isPickable = false;
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

  let shellOffset = new BABYLON.Vector3(0.3, -0.2, 0);
  let shellScale = 0.2;

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

        // ===== 薬莢生成 =====
        if (shellTemplate) {
          const shell = shellTemplate.clone("shell");
          shell.setEnabled(true);

          const right = camera.getDirection(BABYLON.Axis.X);

          shell.position = camera.position
            .add(right.scale(shellOffset.x))
            .add(new BABYLON.Vector3(0, shellOffset.y, shellOffset.z));

          shell.scaling = new BABYLON.Vector3(shellScale, shellScale, shellScale);

          shell.rotation = new BABYLON.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );

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
    if (debugMode && debugShell && camera) {
      const right = camera.getDirection(BABYLON.Axis.X);

      debugShell.position = camera.position
        .add(right.scale(shellOffset.x))
        .add(new BABYLON.Vector3(0, shellOffset.y, shellOffset.z));

      debugShell.scaling = new BABYLON.Vector3(shellScale, shellScale, shellScale);
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

    const step = 0.05;

    switch (e.key) {

      case "ArrowRight": shellOffset.x += step; break;
      case "ArrowLeft": shellOffset.x -= step; break;

      case "ArrowUp": shellOffset.y += step; break;
      case "ArrowDown": shellOffset.y -= step; break;

      case "q": shellOffset.z += step; break;
      case "e": shellOffset.z -= step; break;

      case "+":
      case "=": shellScale += 0.05; break;

      case "-": shellScale -= 0.05; break;

      case "c":
        console.log("=== COPY ===");
        console.log(`shellOffset = new BABYLON.Vector3(${shellOffset.x}, ${shellOffset.y}, ${shellOffset.z});`);
        console.log(`shellScale = ${shellScale};`);
        break;
    }

    console.log(
      `位置: new BABYLON.Vector3(${shellOffset.x.toFixed(2)}, ${shellOffset.y.toFixed(2)}, ${shellOffset.z.toFixed(2)})`
    );
    console.log(`サイズ: ${shellScale.toFixed(2)}`);
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
