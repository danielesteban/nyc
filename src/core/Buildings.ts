import {
  BoxGeometry,
  BufferAttribute,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { type IBuilding } from '../../data/protocol.js';

export class Buildings extends Mesh {
  constructor(data: IBuilding[]) {
    const box = new BoxGeometry(1, 1, 1, 1, 1, 1);
    box.translate(0, 0.5, 0);
    const index = box.getIndex()!;
    const face = new BufferAttribute(new Int32Array(box.getAttribute('position').count), 1);
    const uv = box.getAttribute('uv');
    box.groups.forEach(({ start, count }, group) => {
      for (let i = start; i < start + count; i++) {
        const v = index.getX(i);
        face.setX(v, group);
        if (group === 2 || group === 3) {
          uv.setXY(v, 0, 0);
        }
      }
    });
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', box.getAttribute('position'));
    geometry.setAttribute('normal', box.getAttribute('normal'));
    geometry.setAttribute('uv', uv);
    geometry.setAttribute('face', face);
    geometry.setIndex(index);
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
    super(geometry, material);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
  }
}
