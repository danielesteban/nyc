import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import geojson from 'geojson-stream';
// import * as turf from '@turf/turf';
import { Buildings, Building } from './protocol.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const origin = turf.point([-73.971321, 40.776676]);
// const radius = 1;
const workers = Array.from({ length: os.cpus().length }, () => new Worker(path.join(__dirname, 'maxRect.js')));
const output = new Buildings();

let parsed = 0;
let processed = 0;
const queue = [];
const log = () => process.stdout.write(
  parsed + ' parsed - ' + queue.length + ' queued - ' + processed + ' processed'  + '\x1b[0G'
);

const stream = fs.createReadStream(path.join(__dirname, 'data.geojson'))
.pipe(geojson.parse((building) => {
  parsed++;
  log();
  if (
    building.geometry.type !== 'Polygon'
    || building.geometry.coordinates === null
    || building.geometry.coordinates.length === 0
    || building.properties.HEIGHT_ROOF === 0
  ) {
    return;
  }
  // if (!building.geometry.coordinates[0].find((p) => (turf.distance(origin, p, {units: 'kilometers'}) < radius))) {
  //   return;
  // }
  queue.push(building);
  processQueue();
}));

const processQueue = () => {
  if (!queue.length) {
    finish();
    return;
  }
  const worker = workers.find((worker) => !worker.isBusy);
  if (!worker) {
    log();
    return;
  }
  const building = queue.pop();
  log();
  worker.isBusy = true;
  worker.once('message', (rect) => {
    worker.isBusy = false;
    if (!rect) {
      processQueue();
      return;
    }
    const min = { x: Infinity, y: Infinity };
    const max = { x: -Infinity, y: -Infinity };
    rect.forEach((p) => {
      min.x = Math.min(min.x, p[0]);
      min.y = Math.min(min.y, p[1]);
      max.x = Math.max(max.x, p[0]);
      max.y = Math.max(max.y, p[1]);
    });
    const position = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 };
    const width = Math.sqrt(
      (rect[0][0] - rect[1][0]) ** 2
      + (rect[0][1] - rect[1][1]) ** 2
    );
    const depth = Math.sqrt(
      (rect[1][0] - rect[2][0]) ** 2
      + (rect[1][1] - rect[2][1]) ** 2
    );
    const rotation = -Math.atan2(rect[0][1] - rect[1][1], rect[0][0] - rect[1][0]);
    output.buildings.push(new Building({
      position,
      scale: { x: width, y: building.properties.HEIGHT_ROOF, z: depth },
      rotation,
    }));
    processed++;
    log();
    processQueue();
  });
  worker.postMessage(building.geometry.coordinates[0]);
};

stream.on('end', () => finish());

const finish = () => {
  if (
    stream.readable
    || workers.find((worker) => worker.isBusy)
  ) {
    return;
  }
  const min = { x: Infinity, y: Infinity };
  const max = { x: -Infinity, y: -Infinity };
  output.buildings.forEach(({ position }) => {
    min.x = Math.min(min.x, position.x);
    min.y = Math.min(min.y, position.y);
    max.x = Math.max(max.x, position.x);
    max.y = Math.max(max.y, position.y);
  });
  const origin = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 };
  output.buildings.forEach((building) => {
    building.position.x -= origin.x;
    building.position.y -= origin.y;
  });
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'buildings.bin'), Buildings.encode(output).finish());
  console.log('\ndone!');
  process.exit();
};
