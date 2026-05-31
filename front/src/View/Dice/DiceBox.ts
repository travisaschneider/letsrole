import THREE = require("three");
import CANNON = require("cannon");
import { DieGeometry } from "./Extensions/DieGeometry";
import { DieGroup } from "./Extensions/DieGroup";
import { DieMesh } from "./Extensions/DieMesh";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Face3, Geometry } from "three";

// Note :
// Do not import Dependency Injection (container) in
// this file. It is called from several scripts
// that should stay lightweight.

interface DieModels {
  [id: string]: DieMesh;
}

export class DiceBox {
  private renderer: THREE.WebGLRenderer;
  private frameRate: number = 1 / 45;
  private savedStream: any;
  public rolling = false;

  private callback: any;

  private ambientLightColor = 0xf0f5fb;
  private spotLightColor = 0xefdfd5;
  private selectorBackColors = {
    color: 0x404040,
    shininess: 0,
    emissive: 0x858787,
  };
  private deskColor = 0xdfdfdf;
  private useShadows = true;

  private borderThickness = 0.93;

  private knownTypes = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];
  private diceMass: any = {
    d4: 300,
    d6: 300,
    d8: 340,
    d10: 350,
    d12: 350,
    d20: 400,
    d100: 350,
  };
  private diceInertia: any = {
    d4: 5,
    d6: 13,
    d8: 10,
    d10: 9,
    d12: 8,
    d20: 6,
    d100: 9,
  };
  private diceScale: any = {
    d4: 1.2,
    d6: 0.9,
    d8: 1.0,
    d10: 0.9,
    d12: 0.9,
    d20: 1.0,
    d100: 0.9,
  };
  private diceTypes: any = {};

  private scale = 50;

  private d4_labels = [
    [],
    [0, 0, 0],
    [2, 4, 3],
    [1, 3, 4],
    [2, 1, 4],
    [1, 2, 3],
  ];

  private d4Geometry: DieGeometry | undefined;
  private d6Geometry: DieGeometry | undefined;
  private d8Geometry: DieGeometry | undefined;
  private d10Geometry: DieGeometry | undefined;
  private d12Geometry: DieGeometry | undefined;
  private d20Geometry: DieGeometry | undefined;
  private d100Geometry: DieGeometry | undefined;

  private d4Die: DieModels;
  private d6Die: DieModels;
  private d8Die: DieModels;
  private d10Die: DieModels;
  private d12Die: DieModels;
  private d20Die: DieModels;
  private d100Die: DieModels;
  private transparentMaterial: Array<THREE.MeshBasicMaterial>;

  private dices: Array<any>;
  private scene: THREE.Scene;
  private world: CANNON.World;
  private container: any;

  private diceBodyMaterial: CANNON.Material | undefined;
  private deskBodyMaterial: CANNON.Material | undefined;
  private barrierBodyMaterial: CANNON.Material | undefined;

  private height: number;
  private width: number;
  private clientWidth: number;
  private clientHeight: number;
  private widthHeight: number;
  private aspect: number;

  private desk: any;
  private light: THREE.SpotLight | undefined;

  private running: any;
  private lastTime: number;
  private camera: THREE.Camera | undefined;

  private iteration: number;
  private useAdaptimeTimestep: boolean;

  private standart_d20_dice_face_labels = [
    " ",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
  ];

  constructor(container: any, dimentions: any) {
    this.iteration = 0;
    this.useAdaptimeTimestep = true;
    this.height = 0;
    this.width = 0;
    this.clientHeight = 0;
    this.clientWidth = 0;
    this.widthHeight = 0;
    this.aspect = 0;

    this.d4Geometry = undefined;
    this.d6Geometry = undefined;
    this.d8Geometry = undefined;
    this.d10Geometry = undefined;
    this.d12Geometry = undefined;
    this.d20Geometry = undefined;
    this.d100Geometry = undefined;

    this.d4Die = {};
    this.d6Die = {};
    this.d8Die = {};
    this.d10Die = {};
    this.d12Die = {};
    this.d20Die = {};
    this.d100Die = {};

    this.diceBodyMaterial = undefined;
    this.deskBodyMaterial = undefined;
    this.barrierBodyMaterial = undefined;

    this.transparentMaterial = [];

    this.light = undefined;

    this.dices = [];
    this.scene = new THREE.Scene();
    this.world = new CANNON.World();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    container.appendChild(this.renderer.domElement);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container = container;

    this.reinit(container, dimentions);

    this.world.gravity.set(0, 0, -9.8 * 800);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 16;

    const ambientLight = new THREE.AmbientLight(this.ambientLightColor, 1.0);
    this.scene.add(ambientLight);

    this.diceBodyMaterial = new CANNON.Material("diceBody");
    const deskBodyMaterial = new CANNON.Material("deskBody");
    const barrierBodyMaterial = new CANNON.Material("barrierBody");
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(deskBodyMaterial, this.diceBodyMaterial, {
        friction: 0.01,
        restitution: 0.5,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(barrierBodyMaterial, this.diceBodyMaterial, {
        friction: 0,
        restitution: 1.0,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceBodyMaterial, this.diceBodyMaterial, {
        friction: 0,
        restitution: 0.5,
      })
    );

    const body = new CANNON.Body({ mass: 0, material: this.deskBodyMaterial });
    body.addShape(new CANNON.Plane());

    this.world.addBody(body);
    let barrier;
    barrier = new CANNON.Body({ mass: 0, material: this.barrierBodyMaterial });
    barrier.addShape(new CANNON.Plane());

    barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    barrier.position.set(0, this.height * this.borderThickness, 0);
    this.world.addBody(barrier);

    barrier = new CANNON.Body({ mass: 0, material: this.barrierBodyMaterial });
    barrier.addShape(new CANNON.Plane());
    barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    barrier.position.set(0, -this.height * this.borderThickness, 0);
    this.world.addBody(barrier);

    barrier = new CANNON.Body({ mass: 0, material: this.barrierBodyMaterial });
    barrier.addShape(new CANNON.Plane());
    barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
    barrier.position.set(this.width * this.borderThickness, 0, 0);
    this.world.addBody(barrier);

    barrier = new CANNON.Body({ mass: 0, material: this.barrierBodyMaterial });
    barrier.addShape(new CANNON.Plane());
    barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
    barrier.position.set(-this.width * this.borderThickness, 0, 0);
    this.world.addBody(barrier);

    this.lastTime = 0;
    this.running = false;

    if (this.camera !== undefined) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  random() {
    return Math.random();
  }

  createShape(vertices: any, faces: any, radius: any) {
    const cv = new Array(vertices.length),
      cf = new Array(faces.length);
    for (let i = 0; i < vertices.length; ++i) {
      const v = vertices[i];
      cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
    }
    for (let i = 0; i < faces.length; ++i) {
      cf[i] = faces[i].slice(0, faces[i].length - 1);
    }
    return new CANNON.ConvexPolyhedron(cv, cf);
  }

  makeGeometry(vertices: any, faces: any, radius: any, tab: any, af: any) {
    const geom = new Geometry();
    for (let i = 0; i < vertices.length; ++i) {
      const vertex = vertices[i].multiplyScalar(radius);
      vertex.index = geom.vertices.push(vertex) - 1;
    }
    for (let i = 0; i < faces.length; ++i) {
      const ii = faces[i],
        fl = ii.length - 1;
      const aa = (Math.PI * 2) / fl;
      for (let j = 0; j < fl - 2; ++j) {
        const face = new Face3(
          ii[0],
          ii[j + 1],
          ii[j + 2],
          undefined,
          undefined,
          ii[fl] + 1
        );
        face.materialIndex = ii[fl] + 1;
        geom.faces.push(face);
        geom.faceVertexUvs[0].push([
          new THREE.Vector2(
            (Math.cos(af) + 1 + tab) / 2 / (1 + tab),
            (Math.sin(af) + 1 + tab) / 2 / (1 + tab)
          ),
          new THREE.Vector2(
            (Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
            (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)
          ),
          new THREE.Vector2(
            (Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
            (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab)
          ),
        ]);
      }
    }
    geom.computeVertexNormals();
    geom.computeFaceNormals();
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
    return geom;
  }

  getChamferGeometry(vectors: any, faces: any, chamfer: any) {
    const chamfer_vectors = [],
      chamfer_faces = [],
      corner_faces = new Array(vectors.length);
    for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
    for (let i = 0; i < faces.length; ++i) {
      const ii = faces[i],
        fl = ii.length - 1;
      const center_point = new THREE.Vector3();
      const face = new Array(fl);
      for (let j = 0; j < fl; ++j) {
        const vv = vectors[ii[j]].clone();
        center_point.add(vv);
        corner_faces[ii[j]].push((face[j] = chamfer_vectors.push(vv) - 1));
      }
      center_point.divideScalar(fl);
      for (let j = 0; j < fl; ++j) {
        const vv = chamfer_vectors[face[j]];
        vv.subVectors(vv, center_point)
          .multiplyScalar(chamfer)
          .addVectors(vv, center_point);
      }
      face.push(ii[fl]);
      chamfer_faces.push(face);
    }
    for (let i = 0; i < faces.length - 1; ++i) {
      for (let j = i + 1; j < faces.length; ++j) {
        const pairs = [];
        let lastm = -1;
        for (let m = 0; m < faces[i].length - 1; ++m) {
          const n = faces[j].indexOf(faces[i][m]);
          if (n >= 0 && n < faces[j].length - 1) {
            if (lastm >= 0 && m !== lastm + 1) pairs.unshift([i, m], [j, n]);
            else pairs.push([i, m], [j, n]);
            lastm = m;
          }
        }
        if (pairs.length !== 4) continue;
        chamfer_faces.push([
          chamfer_faces[pairs[0][0]][pairs[0][1]],
          chamfer_faces[pairs[1][0]][pairs[1][1]],
          chamfer_faces[pairs[3][0]][pairs[3][1]],
          chamfer_faces[pairs[2][0]][pairs[2][1]],
          -1,
        ]);
      }
    }
    for (let i = 0; i < corner_faces.length; ++i) {
      const cf = corner_faces[i],
        face = [cf[0]];
      let count = cf.length - 1;
      while (count) {
        for (let m = faces.length; m < chamfer_faces.length; ++m) {
          let index = chamfer_faces[m].indexOf(face[face.length - 1]);
          if (index >= 0 && index < 4) {
            if (--index === -1) index = 3;
            const next_vertex = chamfer_faces[m][index];
            if (cf.indexOf(next_vertex) >= 0) {
              face.push(next_vertex);
              break;
            }
          }
        }
        --count;
      }
      face.push(-1);
      chamfer_faces.push(face);
    }
    return { vectors: chamfer_vectors, faces: chamfer_faces };
  }

  getGeometry(
    vertices: any,
    faces: any,
    radius: number,
    tab: any,
    af: any,
    chamfer: number
  ) {
    const vectors = new Array(vertices.length);
    for (let i = 0; i < vertices.length; ++i) {
      vectors[i] = new THREE.Vector3().fromArray(vertices[i]).normalize();
    }

    const chamferGeometry = this.getChamferGeometry(vectors, faces, chamfer);
    const geometry = this.makeGeometry(
      chamferGeometry.vectors,
      chamferGeometry.faces,
      radius,
      tab,
      af
    ) as DieGeometry;

    geometry.shape = this.createShape(vectors, faces, radius);
    return geometry;
  }

  createD4Geometry(radius: number) {
    const vertices = [
      [1, 1, 1],
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1],
    ];
    const faces = [
      [1, 0, 2, 1],
      [0, 1, 3, 2],
      [0, 3, 2, 3],
      [1, 2, 3, 4],
    ];
    return this.getGeometry(
      vertices,
      faces,
      radius,
      -0.1,
      (Math.PI * 7) / 6,
      0.96
    );
  }

  createD6Geometry(radius: number) {
    const vertices = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];
    const faces = [
      [0, 3, 2, 1, 1],
      [1, 2, 6, 5, 5],
      [0, 1, 5, 4, 3],
      [3, 7, 6, 2, 4],
      [0, 4, 7, 3, 2],
      [4, 5, 6, 7, 6],
    ];
    return this.getGeometry(vertices, faces, radius, 0.1, Math.PI / 4, 0.96);
  }

  createD8Geometry(radius: number) {
    const vertices = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    const faces = [
      [0, 2, 4, 1],
      [0, 4, 3, 2],
      [0, 3, 5, 3],
      [0, 5, 2, 4],
      [1, 3, 4, 5],
      [1, 4, 2, 6],
      [1, 2, 5, 7],
      [1, 5, 3, 8],
    ];
    return this.getGeometry(
      vertices,
      faces,
      radius,
      0,
      -Math.PI / 4 / 2,
      0.965
    );
  }

  createD100Geometry(radius: number) {
    const a = (Math.PI * 2) / 10,
      k = Math.cos(a),
      h = 0.105,
      v = -1;
    const vertices = [];
    for (let i = 0, b = 0; i < 10; ++i, b += a)
      vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
    vertices.push([0, 0, -1]);
    vertices.push([0, 0, 1]);
    const faces = [
      [5, 7, 11, 0],
      [4, 2, 10, 1],
      [1, 3, 11, 2],
      [0, 8, 10, 3],
      [7, 9, 11, 4],
      [8, 6, 10, 5],
      [9, 1, 11, 6],
      [2, 0, 10, 7],
      [3, 5, 11, 8],
      [6, 4, 10, 9],
      [1, 0, 2, v],
      [1, 2, 3, v],
      [3, 2, 4, v],
      [3, 4, 5, v],
      [5, 4, 6, v],
      [5, 6, 7, v],
      [7, 6, 8, v],
      [7, 8, 9, v],
      [9, 8, 0, v],
      [9, 0, 1, v],
    ];
    return this.getGeometry(
      vertices,
      faces,
      radius,
      0,
      (Math.PI * 6) / 5,
      0.945
    );
  }

  createD12Geometry(radius: number) {
    const p = (1 + Math.sqrt(5)) / 2,
      q = 1 / p;
    const vertices = [
      [0, q, p],
      [0, q, -p],
      [0, -q, p],
      [0, -q, -p],
      [p, 0, q],
      [p, 0, -q],
      [-p, 0, q],
      [-p, 0, -q],
      [q, p, 0],
      [q, -p, 0],
      [-q, p, 0],
      [-q, -p, 0],
      [1, 1, 1],
      [1, 1, -1],
      [1, -1, 1],
      [1, -1, -1],
      [-1, 1, 1],
      [-1, 1, -1],
      [-1, -1, 1],
      [-1, -1, -1],
    ];
    const faces = [
      [2, 14, 4, 12, 0, 1],
      [15, 9, 11, 19, 3, 2],
      [16, 10, 17, 7, 6, 3],
      [6, 7, 19, 11, 18, 4],
      [6, 18, 2, 0, 16, 5],
      [18, 11, 9, 14, 2, 6],
      [1, 17, 10, 8, 13, 7],
      [1, 13, 5, 15, 3, 8],
      [13, 8, 12, 4, 5, 9],
      [5, 4, 14, 9, 15, 10],
      [0, 12, 8, 10, 16, 11],
      [3, 19, 7, 17, 1, 12],
    ];
    return this.getGeometry(
      vertices,
      faces,
      radius,
      0.2,
      -Math.PI / 4 / 2,
      0.968
    );
  }

  createD20Geometry(radius: number) {
    const t = (1 + Math.sqrt(5)) / 2;
    const vertices = [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1],
    ];
    const faces = [
      [0, 11, 5, 1],
      [0, 5, 1, 2],
      [0, 1, 7, 3],
      [0, 7, 10, 4],
      [0, 10, 11, 5],
      [1, 5, 9, 6],
      [5, 11, 4, 7],
      [11, 10, 2, 8],
      [10, 7, 6, 9],
      [7, 1, 8, 10],
      [3, 9, 4, 11],
      [3, 4, 2, 12],
      [3, 2, 6, 13],
      [3, 6, 8, 14],
      [3, 8, 9, 15],
      [4, 9, 5, 16],
      [2, 4, 11, 17],
      [6, 2, 10, 18],
      [8, 6, 7, 19],
      [9, 8, 1, 20],
    ];
    return this.getGeometry(
      vertices,
      faces,
      radius,
      -0.2,
      -Math.PI / 4 / 2,
      0.955
    );
  }

  loadDiceModel(id: number, uri: any, modelList: any, callback: any) {
    const gltfLoader = new GLTFLoader();
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const idStr: string = id.toString(10);

    gltfLoader.load(uri, (gltf: any) => {
      const root = gltf.scene;
      modelList.forEach((model: any) => {
        this.diceMass["l_" + idStr + "_" + model.name] =
          this.diceMass[model.type];
        this.diceInertia["l_" + idStr + "_" + model.name] =
          this.diceInertia[model.type];
        this.diceTypes["l_" + idStr + "_" + model.name] = model.type;
        let die = undefined;
        const o = root.getObjectByName(model.name);

        switch (model.type) {
          case "d4":
            die = this.d4Geometry;
            if (!die) {
              die = this.createD4Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d4Geometry = die;
            }
            this.d4Die[id] = o;
            break;
          case "d6":
            die = this.d6Geometry;
            if (!die) {
              die = this.createD6Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d6Geometry = die;
            }
            this.d6Die[id] = o;
            break;
          case "d8":
            die = this.d8Geometry;
            if (!die) {
              die = this.createD8Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d8Geometry = die;
            }
            this.d8Die[id] = o;
            break;
          case "d10":
            die = this.d10Geometry;
            if (!die) {
              die = this.createD100Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d10Geometry = die;
            }
            this.d10Die[id] = o;
            break;
          case "d12":
            die = this.d12Geometry;
            if (!die) {
              die = this.createD12Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d12Geometry = die;
            }
            this.d12Die[id] = o;
            break;
          case "d20":
            die = this.d20Geometry;
            if (!die) {
              die = this.createD20Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d20Geometry = die;
            }
            this.d20Die[id] = o;
            break;
          case "d100":
            die = this.d100Geometry;
            if (!die) {
              die = this.createD100Geometry(
                this.scale * this.diceScale[model.type]
              );
              this.d100Geometry = die;
            }
            this.d100Die[id] = o;
            break;
        }

        const os = new THREE.Sphere(),
          os2 = new THREE.Sphere();
        new THREE.Box3().setFromObject(o).getBoundingSphere(os);
        new THREE.Box3()
          .setFromObject(new THREE.Mesh(die))
          .getBoundingSphere(os2);
        o.scale.multiplyScalar(os2.radius / os.radius);
        o.position.set(0, 0, 0);
        o.traverse((obj: any) => {
          if (obj.castShadow !== undefined) obj.castShadow = true;
          if (obj.material) {
            obj.material.map.anisotropy = maxAnisotropy;
          }
        });
      });
      if (callback) callback();
    });
  }

  reinit(container: any, dimentions: any) {
    this.clientWidth = container.clientWidth / 2;
    this.clientHeight = container.clientHeight / 2;
    if (dimentions) {
      this.width = dimentions.w;
      this.height = dimentions.h;
    } else {
      this.width = this.clientWidth;
      this.height = this.clientHeight;
    }
    this.aspect = Math.min(
      this.clientWidth / this.width,
      this.clientHeight / this.height
    );

    let diceScale = 14;
    const isMobile: boolean =
      window["configuration"] && !!window["configuration"].mobile;

    if (isMobile) {
      diceScale = 8; // bigger
    }

    this.scale =
      Math.sqrt(this.width * this.width + this.height * this.height) /
      diceScale;

    this.renderer.setSize(this.clientWidth * 2, this.clientHeight * 2);

    this.widthHeight =
      this.clientHeight / this.aspect / Math.tan((10 * Math.PI) / 180);
    if (this.camera) this.scene.remove(this.camera);
    this.camera = new THREE.PerspectiveCamera(
      20,
      this.clientWidth / this.clientHeight,
      1,
      this.widthHeight * 1.3
    );
    this.camera.position.z = this.widthHeight;

    const mw = Math.max(this.width, this.height);
    if (this.light) this.scene.remove(this.light);
    this.light = new THREE.SpotLight(this.spotLightColor, 7);
    this.light.position.set(-mw, mw, mw * 3.8);
    this.light.target.position.set(0, 0, 0);
    this.light.distance = mw * 5;
    this.light.castShadow = true;
    this.light.shadow.camera.near = mw / 10;
    this.light.shadow.camera.far = mw * 5;
    this.light.shadow.camera.fov = 50;
    this.light.shadow.mapSize.width = 1024 * 4;
    this.light.shadow.mapSize.height = 1024 * 4;
    this.light.shadow.radius = 3.0;
    this.light.shadow.bias = 0.0001;
    this.scene.add(this.light);

    if (this.desk) this.scene.remove(this.desk);
    this.desk = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width * 2, this.height * 2, 1, 1),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    this.desk.receiveShadow = this.useShadows;
    this.scene.add(this.desk);

    this.renderer.render(this.scene, this.camera);
  }

  createTransparentMaterial() {
    const materials = [];
    for (let i = 0; i < this.standart_d20_dice_face_labels.length; ++i) {
      materials.push(
        new THREE.MeshBasicMaterial({
          colorWrite: false,
          alphaTest: 0.5,
          color: 0,
          transparent: true,
        })
      );
    }
    return materials;
  }

  createCompoundModel(type: string) {
    let die = null;
    let geometry = null;

    const parts: string[] = type.split("_");
    const id: number = parseInt(parts[1], 10);
    const dType: string = parts.pop();

    switch (dType) {
      case "d4":
        die = this.d4Die[id];
        geometry = this.d4Geometry;
        break;
      case "d6":
        die = this.d6Die[id];
        geometry = this.d6Geometry;
        break;
      case "d8":
        die = this.d8Die[id];
        geometry = this.d8Geometry;
        break;
      case "d10":
        die = this.d10Die[id];
        geometry = this.d10Geometry;
        break;
      case "d12":
        die = this.d12Die[id];
        geometry = this.d12Geometry;
        break;
      case "d20":
        die = this.d20Die[id];
        geometry = this.d20Geometry;
        break;
      case "d100":
        die = this.d100Die[id];
        geometry = this.d100Geometry;
        break;
      default:
        die = this.d4Die[id];
        geometry = this.d4Geometry;
        break;
    }

    if (!this.transparentMaterial)
      this.transparentMaterial = this.createTransparentMaterial();
    const dd = new DieMesh(geometry, this.transparentMaterial);
    dd.geometry = geometry;
    const group = new DieGroup();
    group.add(dd);
    if (die !== undefined) {
      group.add(die.clone());
    }
    return group;
  }

  makeRandomVector(vector: any) {
    const random_angle = (Math.random() * Math.PI) / 5 - Math.PI / 5 / 2;
    const vec = {
      x: vector.x * Math.cos(random_angle) - vector.y * Math.sin(random_angle),
      y: vector.x * Math.sin(random_angle) + vector.y * Math.cos(random_angle),
    };
    if (vec.x == 0) vec.x = 0.01;
    if (vec.y == 0) vec.y = 0.01;
    return vec;
  }

  generateVectors(notation: any, vector: any, boost: any) {
    const vectors = [];
    for (const i in notation.set) {
      const vec = this.makeRandomVector(vector);
      const pos = {
        x: this.width * (vec.x > 0 ? -1 : 1) * 0.9,
        y: this.height * (vec.y > 0 ? -1 : 1) * 0.9,
        z: Math.random() * 200 + 200,
      };
      const projector = Math.abs(vec.x / vec.y);
      if (projector > 1.0) pos.y /= projector;
      else pos.x *= projector;
      const velvec = this.makeRandomVector(vector);
      const velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
      const inertia = this.diceInertia[notation.set[i]];
      const angle = {
        x: -(Math.random() * vec.y * 5 + inertia * vec.y),
        y: Math.random() * vec.x * 5 + inertia * vec.x,
        z: 0,
      };
      const axis = {
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        a: Math.random(),
      };
      vectors.push({
        set: notation.set[i],
        pos: pos,
        velocity: velocity,
        angle: angle,
        axis: axis,
      });
    }
    return vectors;
  }

  createDice(type: any, pos: any, velocity: any, angle: any, axis: any) {
    const dice = this.createCompoundModel(type);

    const dicem = dice.children[0] as DieMesh;
    if (!dice.children[1]) dicem.castShadow = true;
    dice.diceType = this.diceTypes[type] || type;
    dice.body = new CANNON.Body({
      mass: this.diceMass[type],
      material: this.diceBodyMaterial,
    });
    dice.body.addShape(dicem.geometry.shape);
    dice.body.position.set(pos.x, pos.y, pos.z);
    dice.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(axis.x, axis.y, axis.z),
      axis.a * Math.PI * 2
    );
    dice.body.angularVelocity.set(angle.x, angle.y, angle.z);
    dice.body.velocity.set(velocity.x, velocity.y, velocity.z);
    dice.body.linearDamping = 0.1;
    dice.body.angularDamping = 0.1;
    this.scene.add(dice);
    this.dices.push(dice);
    this.world.addBody(dice.body);
  }

  checkIfThrowFinished() {
    let res = true;
    const e = 6;
    if (this.iteration < 10 / this.frameRate) {
      for (let i = 0; i < this.dices.length; ++i) {
        const dice = this.dices[i];
        if (dice.dice_stopped === true) continue;
        const a = dice.body.angularVelocity,
          v = dice.body.velocity;
        if (
          Math.abs(a.x) < e &&
          Math.abs(a.y) < e &&
          Math.abs(a.z) < e &&
          Math.abs(v.x) < e &&
          Math.abs(v.y) < e &&
          Math.abs(v.z) < e
        ) {
          if (dice.dice_stopped) {
            if (this.iteration - dice.dice_stopped > 3) {
              dice.dice_stopped = true;
              continue;
            }
          } else dice.dice_stopped = this.iteration;
          res = false;
        } else {
          dice.dice_stopped = undefined;
          res = false;
        }
      }
    }
    return res;
  }

  getDiceValue(diceGroup: any) {
    const dicem = diceGroup.children[0];
    const vector = new THREE.Vector3(0, 0, diceGroup.diceType == "d4" ? -1 : 1);
    let closest_face,
      closest_angle = Math.PI * 2;
    for (let i = 0, l = dicem.geometry.faces.length; i < l; ++i) {
      const face = dicem.geometry.faces[i];
      if (face.materialIndex == 0) continue;
      const angle = face.normal
        .clone()
        .applyQuaternion(dicem.quaternion)
        .applyQuaternion(diceGroup.body.quaternion)
        .angleTo(vector);
      if (angle < closest_angle) {
        closest_angle = angle;
        closest_face = face;
      }
    }
    let matindex = closest_face.materialIndex - 1;
    if (diceGroup.diceType == "d100") matindex *= 10;
    if (diceGroup.diceType == "d10" && matindex == 0) matindex = 10;
    return matindex;
  }

  getDiceValues(dices: any) {
    const values = [];
    for (let i = 0, l = dices.length; i < l; ++i) {
      values.push(this.getDiceValue(dices[i]));
    }
    return values;
  }

  emulateThrow() {
    while (!this.checkIfThrowFinished()) {
      ++this.iteration;
      this.world.step(this.frameRate);
      const step = [];
      for (let i = 0; i < this.scene.children.length; ++i) {
        const interact = this.scene.children[i] as DieGroup;
        if (interact.body != undefined) {
          const p = interact.body.position;
          const q = interact.body.quaternion;
          step.push([
            new CANNON.Vec3(p.x, p.y, p.z),
            new CANNON.Quaternion(q.x, q.y, q.z, q.w),
          ]);
        }
      }
      this.savedStream.push(step);
    }
    return this.getDiceValues(this.dices);
  }

  __animate(threadid: any) {
    const time = new Date().getTime();
    let time_diff = (time - this.lastTime) / 1000;
    if (time_diff > 3) time_diff = this.frameRate;
    ++this.iteration;
    if (this.useAdaptimeTimestep) {
      while (time_diff > this.frameRate * 1.1) {
        this.world.step(this.frameRate);
        time_diff -= this.frameRate;
      }
      this.world.step(time_diff);
    } else {
      this.world.step(this.frameRate);
    }
    for (let i = 0; i < this.scene.children.length; ++i) {
      const interact = this.scene.children[i] as DieGroup;
      if (interact.body != undefined) {
        interact.position.copy(interact.body.position);
        interact.quaternion.copy(interact.body.quaternion);
      }
    }
    if (this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.lastTime = this.lastTime ? time : new Date().getTime();
    if (this.running == threadid && this.checkIfThrowFinished()) {
      this.running = false;
      if (this.callback)
        this.callback.call(this, this.getDiceValues(this.dices));
    }
    if (this.running == threadid) {
      ((t, tid, uat) => {
        if (!uat && time_diff < this.frameRate) {
          setTimeout(function () {
            requestAnimationFrame(() => {
              t.__animate(tid);
            });
          }, (this.frameRate - time_diff) * 1000);
        } else
          requestAnimationFrame(() => {
            t.__animate(tid);
          });
      })(this, threadid, this.useAdaptimeTimestep);
    }
  }

  __saved_animate() {
    const step = this.savedStream[this.iteration];
    let j = 0;
    for (let i = 0; i < this.scene.children.length; ++i) {
      const interact = this.scene.children[i] as DieGroup;
      if (interact.body != undefined) {
        interact.position.copy(step[j][0]);
        interact.quaternion.copy(step[j][1]);
        interact.body.position = step[j][0];
        interact.body.quaternion = step[j][1];
        ++j;
      }
    }
    ++this.iteration;
    if (this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const tt = this;
    if (this.iteration == this.savedStream.length) {
      this.savedStream = [];
      const values = this.getDiceValues(this.dices);
      for (const i in values) this.placeDiceProperly(this.dices[i], values[i]);
      if (this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.callback) this.callback.call(this, values);
    } else
      requestAnimationFrame(function () {
        tt.__saved_animate();
      });
  }

  clear() {
    this.running = false;
    let dice;
    while (this.dices.length) {
      dice = this.dices.pop();
      this.scene.remove(dice);
      if (dice.body) this.world.remove(dice.body);
    }
    if (this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const box = this;
    setTimeout(function () {
      if (box.camera) {
        box.renderer.render(box.scene, box.camera);
      }
    }, 100);
  }

  prepareDicesForRoll(vectors: any) {
    this.clear();
    this.iteration = 0;
    for (const i in vectors) {
      this.createDice(
        vectors[i].set,
        vectors[i].pos,
        vectors[i].velocity,
        vectors[i].angle,
        vectors[i].axis
      );
    }
  }

  shiftDiceFace(diceGroup: any, value: any, res: any) {
    if (diceGroup.diceType == "d100") {
      value /= 10;
      res /= 10;
    }
    if (diceGroup.diceType == "d10" || diceGroup.diceType == "d100") {
      value %= 10;
      res %= 10;
    }
    const dicem = diceGroup.children[0];
    const geom = dicem.geometry;
    let v1, v2;
    for (let i = 0; i < geom.faces.length; ++i) {
      if (geom.faces[i].materialIndex == value + 1) v1 = geom.faces[i].normal;
      if (geom.faces[i].materialIndex == res + 1) v2 = geom.faces[i].normal;
    }
    if (!v1 || !v2) return;
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(v1, v2);
    dicem.applyQuaternion(quaternion);
    if (diceGroup.children[1])
      diceGroup.children[1].applyQuaternion(quaternion);
  }

  placeDiceProperly(diceGroup: any, value: any) {
    if (diceGroup.diceType == "d100") value /= 10;
    if (diceGroup.diceType == "d10" || diceGroup.diceType == "d100")
      value %= 10;
    const dicem = diceGroup.children[0];
    const geom = dicem.geometry;
    let v1 = new THREE.Vector3(0, 0, diceGroup.diceType == "d4" ? -1 : 1);
    const v2 = v1;
    for (let i = 0; i < geom.faces.length; ++i) {
      if (geom.faces[i].materialIndex == value + 1) v1 = geom.faces[i].normal;
    }
    if (!v1) return;
    v1 = v1
      .clone()
      .applyQuaternion(dicem.quaternion)
      .applyQuaternion(diceGroup.body.quaternion);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(v1, v2);
    diceGroup.applyQuaternion(quaternion);
  }

  roll(vectors: any, values: any, callback: any) {
    this.callback = callback;
    this.prepareDicesForRoll(vectors);
    if (values != undefined && values.length) {
      this.savedStream = [];
      const res = this.emulateThrow();

      this.prepareDicesForRoll(vectors);

      for (const i in res) this.shiftDiceFace(this.dices[i], values[i], res[i]);

      this.__saved_animate();
      return;
    }
    this.running = new Date().getTime();
    this.lastTime = 0;
    this.__animate(this.running);
  }

  startThrow(notation_getter: any, before_roll: any, after_roll: any) {
    if (this.rolling) return;
    const vector = {
      x: (Math.random() * 2 - 1) * this.width,
      y: -(Math.random() * 2 - 1) * this.height,
    };
    const dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    const boost = (Math.random() + 3) * dist;
    this.throwDices(
      this,
      vector,
      boost,
      dist,
      notation_getter,
      before_roll,
      after_roll
    );
  }

  throwDices(
    box: any,
    vector: any,
    boost: any,
    dist: any,
    notation_getter: any,
    before_roll: any,
    after_roll: any
  ) {
    const uat = this.useAdaptimeTimestep;

    function roll(request_results: any) {
      if (after_roll) {
        box.clear();
        box.roll(vectors, request_results || notation.result, (result: any) => {
          if (after_roll) after_roll.call(box, notation, result);
          box.rolling = false;
          box.useAdaptimeTimestep = uat;
        });
      }
    }

    vector.x /= dist;
    vector.y /= dist;
    const notation = notation_getter.call(box);
    if (notation.set.length == 0) return;
    const vectors = box.generateVectors(notation, vector, boost);
    box.rolling = true;
    if (before_roll) before_roll.call(box, vectors, notation, roll);
    else roll(null);
  }
}
