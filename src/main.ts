import './main.css';
import {
  Color,
  FogExp2,
  Vector2,
  Vector3,
} from 'three';
import { Buildings } from 'core/Buildings';
import { Grid } from 'core/Grid';
import { Input } from 'core/Input';
import { Starfield } from 'core/Starfield';
import { camera, clock, dom, renderer, scene } from 'core/Viewport';
import { Buildings as Data } from '../data/protocol.js';

camera.position.set(0, 1000, 0);
camera.lookAt(0, 0, -5000);

scene.background = new Color('#001133');
scene.fog = new FogExp2(0x001133, 0.00005);

const grid = new Grid();
scene.add(grid);
const starfield = new Starfield();
scene.add(starfield);

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
  camera.position.y = Math.max(camera.position.y, 1);
  grid.position.set(
    camera.position.x,
    0,
    camera.position.z
  );
  starfield.position.copy(grid.position);
  renderer.render(scene, camera);
});

fetch('/buildings.bin').then((res) => res.arrayBuffer()).then((buf) => {
  const data = Data.decode(new Uint8Array(buf));
  scene.add(new Buildings(data.buildings));
  document.body.removeChild(document.getElementById('loading')!);
});
