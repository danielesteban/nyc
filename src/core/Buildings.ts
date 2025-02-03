import {
  BufferGeometry,
  BufferAttribute,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type IBuilding } from '../../data/protocol.js';

export class Buildings extends Mesh {
  private static geometry?: BufferGeometry;

  private static getGeometry() {
    if (!Buildings.geometry) {
      const geometries: BufferGeometry[] = [];
      const plane = new PlaneGeometry(1, 1, 1, 1);
      plane.setAttribute('face', new BufferAttribute(new Int32Array(plane.getAttribute('position').count), 1));
      const addFace = (x: number, y: number, z: number, rotationY?: number, rotationX?: number, zeroUV?: boolean) => {
        const index = geometries.length;
        const geometry = plane.clone();
        const face = geometry.getAttribute('face');
        const uv = geometry.getAttribute('uv');
        for (let i = 0, l = geometry.getAttribute('position')!.count; i < l; i++) {
          face.setX(i, index);
          if (zeroUV) {
            uv.setXY(i, 0, 0);
          }
        }
        if (rotationY) {
          geometry.rotateY(rotationY);
        }
        if (rotationX) {
          geometry.rotateX(rotationX);
        }
        geometry.translate(x, y, z);
        geometries.push(geometry);
      };
      addFace(0.5, 0.5, 0, Math.PI * 0.5);
      addFace(-0.5, 0.5, 0, Math.PI * -0.5);
      addFace(0, 0.5, 0.5);
      addFace(0, 0.5, -0.5, Math.PI);
      addFace(0, 1.0, 0, 0, Math.PI * -0.5, true);
      Buildings.geometry = mergeGeometries(geometries);
    }
    return Buildings.geometry;
  }

  private static material?: MeshBasicMaterial;

  private static getMaterial() {
    if (!Buildings.material) {
      const material = new MeshBasicMaterial({ vertexColors: true });
      material.onBeforeCompile = (parameters) => {
        parameters.vertexShader = parameters.vertexShader
          .replace('#include <common>',
            /* glsl */ `
            #include <common>
            attribute int face;
            attribute vec3 offset;
            attribute vec3 scale;
            attribute float rotation;
            varying vec2 vUv;
            mat3 rotateY(float angle) {
              float s = sin(angle);
              float c = cos(angle);
              return mat3(
                c, 0.0, -s,
                0.0, 1.0, 0.0,
                s, 0.0, c
              );
            }
            `
          )
          .replace('#include <begin_vertex>',
            /* glsl */ `
            vec3 transformed = vec3(rotateY(rotation) * (position * scale) + offset);
            `
          )
          .replace('#include <uv_vertex>',
            /* glsl */ `
            vUv = vec2(uv.x * (face == 0 || face == 1 ? scale.z : scale.x), uv.y * scale.y) / 10.0;
            `
          );
        parameters.fragmentShader = parameters.fragmentShader
          .replace('#include <common>',
            /* glsl */ `
            #include <common>
            varying vec2 vUv;
            `
          )
          .replace('#include <color_fragment>',
            /* glsl */ `
            #include <color_fragment>
            float light = 0.2;
            bool isFirstFloor = vUv.y < 1.0;
            if (isFirstFloor) {
              light = 0.1 * max(vUv.y, 0.2);
            } else {
              vec2 floor = vec2(mod(vUv.x, 1.0), mod(vUv.y, 1.0));
              bool isWindow = floor.x > 0.2 && floor.x < 0.8 && floor.y > 0.45 && floor.y < 0.55;
              bool isCornice = floor.y < 0.25 || floor.y > 0.75;
              if (isCornice) {
                light = 0.1;
              } else if (isWindow) {
                light = 0.9;
              }
            }
            diffuseColor *= light;
            `
          );
      };
      Buildings.material = material;
    }
    return Buildings.material;
  }

  constructor(data: IBuilding[]) {
    const building = Buildings.getGeometry();
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', building.getAttribute('position'));
    geometry.setAttribute('normal', building.getAttribute('normal'));
    geometry.setAttribute('uv', building.getAttribute('uv'));
    geometry.setAttribute('face', building.getAttribute('face'));
    geometry.setIndex(building.getIndex());
    geometry.instanceCount = data.length;
    const color = new Color();
    const simplex = new SimplexNoise();
    const colors = new Float32Array(geometry.instanceCount * 3);
    const offsets = new Float32Array(geometry.instanceCount * 3);
    const scales = new Float32Array(geometry.instanceCount * 3);
    const rotations = new Float32Array(geometry.instanceCount);
    data.forEach(({ position, scale, rotation }, i) => {
      color.setHSL(
        0.5 + (simplex.noise(position!.y!, position!.x!) / 3),
        0.5 + (simplex.noise(position!.x!, position!.y!) / 3),
        0.5 + (simplex.noise(-position!.y!, position!.x!) / 3),
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      offsets[i * 3] = position!.x!;
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = position!.y!;
      scales[i * 3] = scale!.x!;
      scales[i * 3 + 1] = scale!.y!;
      scales[i * 3 + 2] = scale!.z!;
      rotations[i] = rotation!;
    });
    geometry.setAttribute('color', new InstancedBufferAttribute(colors, 3));
    geometry.setAttribute('offset', new InstancedBufferAttribute(offsets, 3));
    geometry.setAttribute('scale', new InstancedBufferAttribute(scales, 3));
    geometry.setAttribute('rotation', new InstancedBufferAttribute(rotations, 1));
    super(geometry, Buildings.getMaterial());
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
  }
}
