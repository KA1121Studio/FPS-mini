const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let camera;

// ===== デバッグモード =====
let debugMode = false;

window.mode = () => {
  console.log("モード選択:");
  console.log("1: debugモード ON");
  console.log("2: debugモード OFF");

  window.setMode = (num) => {
    if (num === 1) {
      debugMode = true;
      console.log("DEBUGモード ON");
    } else {
      debugMode = false;
      console.log("DEBUGモード OFF");
    }
  };
};

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

  const parent = new BABYLON.TransformNode("gunParent", scene);

  meshes.forEach(mesh => {
    mesh.parent = parent;
  });

  // カメラにくっつける
  parent.parent = camera;

  // 位置
  parent.position = new BABYLON.Vector3(0.4, -0.2, 1.2);

  // サイズ
  parent.scaling = new BABYLON.Vector3(0.15, 0.15, 0.15);

  // 向き
  parent.rotation = new BABYLON.Vector3(Math.PI, Math.PI, 0);

  // 透明＆両面表示
  meshes.forEach(mesh => {
    if (mesh.material) {
      mesh.material.alpha = 1;
      mesh.material.backFaceCulling = false;
      mesh.material.sideOrientation = BABYLON.Material.DOUBLESIDE;
    }
  });

});

    gun.parent = camera;

    // 初期値（あとで調整できる）
    let rotX = Math.PI / 2;
    let rotY = -Math.PI / 2;
    let rotZ = -Math.PI / 2;

    let posX = 0.6;
    let posY = -0.4;
    let posZ = 1.5;

    gun.rotation = new BABYLON.Vector3(rotX, rotY, rotZ);
    gun.position = new BABYLON.Vector3(posX, posY, posZ);
    gun.scaling = new BABYLON.Vector3(0.0001, 0.0001, 0.0001);

    // ===== デバッグ操作 =====
    window.addEventListener("keydown", (e) => {

      if (!debugMode) return;

      const step = 0.1;

      switch(e.key) {

        // 回転
        case "1": rotX += step; break;
        case "2": rotX -= step; break;

        case "3": rotY += step; break;
        case "4": rotY -= step; break;

        case "5": rotZ += step; break;
        case "6": rotZ -= step; break;

        // 位置
        case "ArrowUp": posZ += step; break;
        case "ArrowDown": posZ -= step; break;
        case "ArrowLeft": posX -= step; break;
        case "ArrowRight": posX += step; break;

        case "q": posY += step; break;
        case "e": posY -= step; break;
      }

      gun.rotation = new BABYLON.Vector3(rotX, rotY, rotZ);
      gun.position = new BABYLON.Vector3(posX, posY, posZ);

      console.log("rotation:", { x: rotX, y: rotY, z: rotZ });
      console.log("position:", { x: posX, y: posY, z: posZ });

    });

    // ===== 透明対策 =====
    gun.getChildMeshes().forEach(mesh => {
      if (mesh.material) {
        mesh.material.alpha = 1;
        mesh.material.backFaceCulling = false;
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
