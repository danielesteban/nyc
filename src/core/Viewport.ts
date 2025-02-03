import {
  Clock,
  PerspectiveCamera,
  ShaderChunk,
  Scene,
  WebGLRenderer,
} from 'three';

ShaderChunk.fog_pars_vertex = /* glsl */`
#ifdef USE_FOG
	varying vec3 vFogPosition;
#endif
`;
ShaderChunk.fog_pars_fragment = /* glsl */`
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying vec3 vFogPosition;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
`;
ShaderChunk.fog_vertex = /* glsl */`
#ifdef USE_FOG
	vFogPosition = mvPosition.xyz;
#endif
`;
ShaderChunk.fog_fragment = /* glsl */`
#ifdef USE_FOG
  float vFogDepth = length(vFogPosition);
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;

export const camera = new PerspectiveCamera(75, 1, 1, 100000);
camera.rotation.order = 'YXZ';
export const clock = new Clock();
export const renderer = new WebGLRenderer({ antialias: true });
export const scene = new Scene();

const resize = () => {
  const { innerWidth: width, innerHeight: height } = window;
  const aspect = width / height;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};
resize();
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => (
  document.visibilityState === 'visible' && clock.start()
));

export const dom = document.getElementById('viewport')!;
dom.appendChild(renderer.domElement);

const prevent = (e: Event) => e.preventDefault();
window.addEventListener('contextmenu', prevent);
window.addEventListener('keydown', (e) => (
  e.key === ' '
  && !['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())
  && prevent(e)
));
window.addEventListener('touchstart', prevent, { passive: false });
window.addEventListener('wheel', (e) => e.ctrlKey && prevent(e), { passive: false });
