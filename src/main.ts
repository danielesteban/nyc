import './main.css';
import { Buildings } from 'core/Buildings';
import { Grid } from 'core/Grid';
import { Input } from 'core/Input';
import { camera, clock, dom, renderer, scene } from 'core/Viewport';
import {
  // BufferGeometry,
  Color,
  FogExp2,
  // Line,
  // LineBasicMaterial,
  Vector2,
  Vector3,
} from 'three';
import { Buildings as Data } from '../data/protocol.js';

camera.position.set(0, 40, 0);

scene.background = new Color('#336688');
scene.fog = new FogExp2(0x336688, 0.001);

const input = new Input(dom);
const look = new Vector2();
const movement = new Vector3();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.2);
  input.getLook(look, delta);
  if (look.x !== 0 || look.y !== 0) {
    camera.rotation.y += look.x;
    camera.rotation.x += look.y;
    camera.rotation.x = Math.min(Math.max(camera.rotation.x, Math.PI * -0.5), Math.PI * 0.5);
    camera.updateMatrixWorld();
  }
  input.getMovement(camera, movement);
  const step = input.getSpeed() * (input.getRunning() ? 2 : 1) * delta;
  camera.position.addScaledVector(movement, step);
  renderer.render(scene, camera);
});

scene.add(new Grid());

// const polygonMat = new LineBasicMaterial({
//   color: 0x0000ff
// });
// const rectMat = new LineBasicMaterial({
//   color: 0xff0000
// });

// data.forEach(({ polygon, rect }) => {
//   [polygon, rect].forEach((points, i) => {
//     const p = points.map(([x, y]) => new Vector3(x, y, 0));
//     const line = new Line(
//       new BufferGeometry().setFromPoints(p),
//       i === 0 ? polygonMat : rectMat
//     );
//     line.rotation.x = Math.PI * 0.5;
//     scene.add(line);
//   });
// });

fetch('/buildings.bin').then((res) => res.arrayBuffer()).then((buf) => {
  const data = Data.decode(new Uint8Array(buf));
  scene.add(new Buildings(data.buildings));
});
