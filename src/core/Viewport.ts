import {
  Clock,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

export const camera = new PerspectiveCamera(75, 1, 0.1, 10000);
camera.rotation.order = 'YXZ';
export const clock = new Clock();
export const renderer = new WebGLRenderer({ antialias: true });
export const scene = new Scene();

const resize = () => {
  const { innerWidth: width, innerHeight: height } = window;
  const aspect = width / height;
  renderer.setSize(width, height);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
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
