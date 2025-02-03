import {
  BufferGeometry,
  Points,
  PointsMaterial,
  BufferAttribute,
  Vector3,
} from 'three';

export class Starfield extends Points {
  private static count = 10000;
  private static radius = 100000;

  private static geometry?: BufferGeometry;

  static getGeometry() {
    if (!Starfield.geometry) {
      const { count, radius } = Starfield;
      const position = new Float32Array(count * 3);
      const color = new Float32Array(count * 3);
      const aux = new Vector3();
      for (let i = 0; i < count; i += 1) {
        aux
          .set(
            Math.random() * 2 - 1,
            Math.random() * 1.25 - 0.625,
            Math.random() * 2 - 1,
          )
          .normalize()
          .multiplyScalar(radius * (0.75 + Math.random() * 0.25));
        position.set([
          aux.x,
          aux.y,
          aux.z,
        ], i * 3);
        color.set([
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5
        ], i * 3);
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(position, 3));
      geometry.setAttribute('color', new BufferAttribute(color, 3));
      Starfield.geometry = geometry;
    }
    return Starfield.geometry;
  }
  
  private static material?: PointsMaterial;

  static getMaterial() {
    if (!Starfield.material) {
      Starfield.material = new PointsMaterial({
        vertexColors: true,
        fog: false,
      });
    }
    return Starfield.material;
  }
  
  constructor() {
    super(Starfield.getGeometry(), Starfield.getMaterial());
  }
}
