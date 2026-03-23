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

    gun.getChildMeshes().forEach(mesh => {
      if (mesh.material) {
        mesh.material.alpha = 1;
        mesh.material.backFaceCulling = true;
        mesh.material.needDepthPrePass = true;
      }
    });
  });

  // ===== 薬莢モデル =====
  let shellTemplate = null;

  BABYLON.SceneLoader.ImportMesh("", "models/", "shell.glb", scene, (meshes) => {
    shellTemplate = meshes[0];
    shellTemplate.setEnabled(false);
  });

  scene.shells = [];

  // ===== デバッグ用パラメータ =====
  let shellOffset = new BABYLON.Vector3(0.3, -0.2, 0);
  let shellScale = 0.2;

  // ===== 敵 =====
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", {}, scene);
  enemy.position = new BABYLON.Vector3(0, 1, 10);
  enemy.checkCollisions = true;
  enemy.isEnemy = true;

  // ===== 射撃 =====
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
          console.log("Enemy Down!");
        }

        if (hit.pickedPoint) {
          const line = BABYLON.MeshBuilder.CreateLines("shot", {
            points: [camera.position, hit.pickedPoint]
          }, scene);

          setTimeout(() => line.dispose(), 30);
        }

        // ===== 反動 =====
        recoil += 0.02;

        // ===== 薬莢 =====
        if (shellTemplate) {

          const shell = shellTemplate.clone("shellInstance");
          shell.setEnabled(true);

          const right = camera.getDirection(BABYLON.Axis.X);

          shell.position = camera.position
            .add(right.scale(shellOffset.x))
            .add(new BABYLON.Vector3(0, shellOffset.y, shellOffset.z));

          shell.scaling = new BABYLON.Vector3(
            shellScale,
            shellScale,
            shellScale
          );

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

    // ===== 反動戻し =====
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

  });

  // ===== デバッグUI =====
  const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  function createSlider(label, min, max, value, onChange) {
    const panel = new BABYLON.GUI.StackPanel();
    panel.width = "220px";
    panel.isVertical = true;
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;

    const header = new BABYLON.GUI.TextBlock();
    header.text = label + ": " + value.toFixed(2);
    header.height = "30px";
    header.color = "white";
    panel.addControl(header);

    const slider = new BABYLON.GUI.Slider();
    slider.minimum = min;
    slider.maximum = max;
    slider.value = value;
    slider.height = "20px";

    slider.onValueChangedObservable.add((v) => {
      header.text = label + ": " + v.toFixed(2);
      onChange(v);
    });

    panel.addControl(slider);
    gui.addControl(panel);
  }

  createSlider("X位置", -1, 1, shellOffset.x, v => shellOffset.x = v);
  createSlider("Y位置", -1, 1, shellOffset.y, v => shellOffset.y = v);
  createSlider("Z位置", -1, 1, shellOffset.z, v => shellOffset.z = v);
  createSlider("サイズ", 0.05, 1, shellScale, v => shellScale = v);

  // ===== Inspector =====
  window.addEventListener("keydown", (e) => {
    if (e.key === "i") {
      scene.debugLayer.show();
    }
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

// ジャンプ
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    camera.cameraDirection.y = 0.2;
  }
});

window.addEventListener("resize", () => {
  engine.resize();
});
