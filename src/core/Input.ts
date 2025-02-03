import {
  EventDispatcher,
  PerspectiveCamera,
  Vector2,
  Vector3,
} from 'three';

export class Input extends EventDispatcher<{ button: { button: number }; }> {
  private readonly desktop: {
    isLocked: boolean;
    isRunning: boolean;
    look: Vector2;
    movement: Vector3;
  };
  private readonly gamepad: {
    index: number;
    read: boolean[];
    state: boolean[];
  };
  private isLocked: boolean;
  private readonly target: HTMLElement;
  private speed: number;

  constructor(target: HTMLElement) {
    super();
    this.desktop = {
      isLocked: false,
      isRunning: false,
      look: new Vector2(),
      movement: new Vector3(),
    };
    this.gamepad = {
      index: -1,
      read: [],
      state: [],
    };
    this.isLocked = false;
    this.target = target;
    this.speed = 1000;
    window.addEventListener('gamepadconnected', this.gamepadconnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.gamepaddisconnected.bind(this));
    target.addEventListener('pointerdown', this.pointerdown.bind(this));
    document.addEventListener('pointermove', this.pointermove.bind(this));
    document.addEventListener('keydown', this.keydown.bind(this));
    document.addEventListener('keyup', this.keyup.bind(this));
    document.addEventListener('pointerlockchange', this.pointerlock.bind(this));
    document.addEventListener('wheel', this.wheel.bind(this));
  }

  getLook(look: Vector2, delta: number) {
    const { desktop, gamepad } = this;
    look.set(0, 0);
    if (desktop.isLocked) {
      look.copy(desktop.look).multiplyScalar(0.003);
      desktop.look.set(0, 0);
    }
    if (gamepad.index !== -1) {
      const { axes } = navigator.getGamepads()[gamepad.index]!;
      if (Math.max(Math.abs(axes[2]), Math.abs(axes[3])) > 0.1) {
        look.set(-axes[2], axes[3]).multiplyScalar(delta * 1.5);
        this.setLock(true);
      }
    }
  }

  private static readonly _movement = new Vector3();
  private static readonly _forward = new Vector3();
  private static readonly _right = new Vector3();
  private static readonly _worldUp = new Vector3(0, 1, 0);

  getMovement(camera: PerspectiveCamera, movement: Vector3) {
    const { desktop, gamepad } = this;
    const { _movement, _forward, _right, _worldUp } = Input;
    _movement.set(0, 0, 0);
    if (desktop.isLocked) {
      _movement.copy(desktop.movement);
    }
    if (gamepad.index !== -1) {
      const { axes, buttons } = navigator.getGamepads()[gamepad.index]!;
      [0, 3, 4, 5, 6, 7, 10].forEach((button) => {
        const pressed = buttons[button]?.pressed;
        if (gamepad.read[button] !== pressed) {
          gamepad.read[button] = pressed;
          gamepad.state[button] = pressed;
          // @hack
          if (pressed && (button === 3 || button === 6 || button === 7)) {
            this.dispatchEvent({ type: 'button', button: { 7: 1, 6: 2, 3: 4 }[button] });
          }
        }
      });
      if (Math.max(Math.abs(axes[0]), Math.abs(axes[1])) > 0.1 || gamepad.state[0]) {
        _movement.set(
          axes[0],
          gamepad.state[0] ? 1 : 0,
          -axes[1]
        );
        this.setLock(true);
      }
    }
    camera.getWorldDirection(_forward);
    _forward.normalize();
    _right.crossVectors(_forward, _worldUp).normalize();
    movement
      .set(0, 0, 0)
      .addScaledVector(_right, _movement.x)
      .addScaledVector(_worldUp, _movement.y)
      .addScaledVector(_forward, _movement.z);
    const length = movement.length();
    if (length > 1) {
      movement.divideScalar(length);
    }
  }

  getRunning() {
    const { desktop, gamepad } = this;
    return desktop.isRunning || (gamepad.index !== -1 && gamepad.state[10]);
  }

  private static readonly minSpeed = Math.log(100);
  private static readonly maxSpeed = Math.log(5000);
  private static readonly speedRange = Input.maxSpeed - Input.minSpeed;
  getSpeed() {
    return this.speed;
  }

  private gamepadconnected({ gamepad: { index } }: GamepadEvent) {
    const { gamepad } = this;
    gamepad.index = index;
  }

  private gamepaddisconnected({ gamepad: { index } }: GamepadEvent) {
    const { gamepad } = this;
    if (gamepad.index === index) {
      gamepad.index = -1;
      gamepad.read.length = 0;
      gamepad.state.length = 0;
      this.setLock(false);
    }
  }

  private keydown({ code, repeat }: KeyboardEvent) {
    const { desktop } = this;
    if (!desktop.isLocked || repeat) {
      return;
    }
    switch (code) {        
      case 'KeyW':
        desktop.movement.z = 1;
        break;
      case 'KeyS':
        desktop.movement.z = -1;
        break;
      case 'KeyA':
        desktop.movement.x = -1;
        break;
      case 'KeyD':
        desktop.movement.x = 1;
        break;
      case 'Space':
        desktop.movement.y = 1;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        desktop.isRunning = true;
        break;
      default:
        break;
    }
  }

  private keyup({ code }: KeyboardEvent) {
    const { desktop } = this;
    if (!desktop.isLocked) {
      return;
    }
    switch (code) {
      case 'KeyW':
        if (desktop.movement.z > 0) desktop.movement.z = 0;
        break;
      case 'KeyS':
        if (desktop.movement.z < 0) desktop.movement.z = 0;
        break;
      case 'KeyA':
        if (desktop.movement.x < 0) desktop.movement.x = 0;
        break;
      case 'KeyD':
        if (desktop.movement.x > 0) desktop.movement.x = 0;
        break;
      case 'Space':
        desktop.movement.y = 0;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        desktop.isRunning = false;
        break;
      default:
        break;
    }
  }

  private pointerlock() {
    const { desktop } = this;
    desktop.isLocked = !!document.pointerLockElement;
    desktop.isRunning = false;
    desktop.look.set(0, 0);
    desktop.movement.set(0, 0, 0);
    this.setLock(desktop.isLocked);
  }

  private pointerdown(e: PointerEvent) {
    const { desktop, target } = this;
    if (!desktop.isLocked) {
      target.requestPointerLock();
      return;
    }
    this.dispatchEvent({ type: 'button', button: e.buttons });
  }

  private pointermove(e: PointerEvent) {
    const { desktop } = this;
    if (!desktop.isLocked) {
      this.setLock(false);
      return;
    }
    desktop.look.x -= e.movementX;
    desktop.look.y -= e.movementY;
  }

  private wheel({ deltaY }: WheelEvent) {
    const { speed, isLocked } = this;
    if (!isLocked) {
      return;
    }
    const { minSpeed, speedRange } = Input;
    const logSpeed = Math.min(
      Math.max(
        ((Math.log(speed) - minSpeed) / speedRange) - (-deltaY * 0.0003),
        0
      ),
      1
    );
    this.speed = Math.exp(minSpeed + logSpeed * speedRange);
  }

  private setLock(locked: boolean) {
    if (this.isLocked === locked) {
      return;
    }
    this.isLocked = locked;
    document.body.classList[locked ? 'add' : 'remove']('inputlock');
  }
}
