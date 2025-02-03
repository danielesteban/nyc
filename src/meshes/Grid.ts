import {
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';

export class Grid extends Mesh {
  private static geometry?: BufferGeometry;

  private static getGeometry() {
    if (!Grid.geometry) {
      const geometry = new PlaneGeometry(100000, 100000, 1, 1);
      geometry.rotateX(Math.PI * -0.5);
      geometry.computeBoundingSphere();
      Grid.geometry = geometry;
    }
    return Grid.geometry;
  }

  private static material?: MeshBasicMaterial;

  private static getMaterial() {
    if (!Grid.material) {
      const material = new MeshBasicMaterial({ transparent: true });
      material.customProgramCacheKey = () => 'grid';
      material.onBeforeCompile = (parameters) => {
        parameters.uniforms.color = { value: new Color('#351645') };
        parameters.vertexShader = parameters.vertexShader
          .replace(
            '#include <common>',
            /* glsl */`
            #include <common>
            varying vec2 gridPos;
            `
          )
          .replace(
            '#include <worldpos_vertex>',
            /* glsl */`
            vec4 worldPosition = vec4(transformed, 1.0);
            worldPosition = modelMatrix * worldPosition;
            gridPos = worldPosition.xz * 0.01;
            `
          );
        parameters.fragmentShader = parameters.fragmentShader
          .replace(
            '#include <common>',
            /* glsl */`
            #include <common>
            varying vec2 gridPos;
            uniform vec3 color;
            float line(vec2 position) {
              vec2 coord = abs(fract(position - 0.5) - 0.5) / fwidth(position);
              return 1.0 - min(min(coord.x, coord.y), 1.0);
            }
            `
          )
          .replace(
            '#include <color_fragment>',
            /* glsl */`
            #include <color_fragment>
            diffuseColor.rgb *= color * line(gridPos);
            `
          )
          .replace(
            '#include <fog_fragment>',
            /* glsl */`
            float fDepth = length(vFogPosition);
            float fDensity = fogDensity * 2.0;
            float fFactor = 1.0 - exp( - fDensity * fDensity * fDepth * fDepth );
            gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3(0.0), fFactor );
            #include <fog_fragment>
            `
          );
      };
      Grid.material = material;
    }
    return Grid.material;
  }

  constructor() {
    super(Grid.getGeometry(), Grid.getMaterial());
  }
}
