import * as T from 'three';
import {
    EffectComposer,
    OutlinePass,
    OutputPass,
    RenderPass,
} from 'three/examples/jsm/Addons.js';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { msToS } from './core';
import { InputHanlder } from './input';

export type GameEngineOptions = {
    autoResize: boolean;
    displayFps: boolean;
    debug: boolean;
};

export default class GameEngine {
    #debug = false;

    #renderer: T.WebGLRenderer;
    #composer: EffectComposer;
    #inputHandler: InputHanlder;
    #mainRenderPass: RenderPass | null = null;
    #outputPass: OutputPass;
    #camera: T.PerspectiveCamera;
    #hudCamera: T.OrthographicCamera;
    #activeScene: T.Scene | null = null;
    #activeHud: T.Scene | null = null;

    #orbitCtrls: OrbitControls | null = null;

    #winWidth: number;
    #winHeight: number;

    #autoResize = false;
    #resizeCooldown: number | null = null;
    #resizeListeners: Array<(width: number, height: number) => void> = [];

    #displayFps = false;
    #fps = 0;
    #frameTimeHistory: number[] = [];
    #fpsCounterElem: HTMLElement | null = null;
    #mousePos = new T.Vector2(-Infinity, -Infinity);

    constructor(
        canvas: HTMLCanvasElement,
        inputHandler: InputHanlder,
        options?: GameEngineOptions
    ) {
        const {
            autoResize = true,
            displayFps = false,
            debug = false,
        } = options ?? {};

        this.#debug = debug;

        this.#inputHandler = inputHandler;

        if (!WebGL.isWebGL2Available()) {
            const warning = WebGL.getWebGL2ErrorMessage();
            canvas.before(warning);
            canvas.remove();

            throw Error(`WebGL not available`);
        }

        this.#winWidth = window.innerWidth;
        this.#winHeight = window.innerHeight;

        this.#renderer = new T.WebGLRenderer({ canvas });
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(this.#winWidth, this.#winHeight);

        this.#composer = new EffectComposer(this.#renderer);
        this.#outputPass = new OutputPass();
        this.#composer.addPass(this.#outputPass);

        this.#camera = new T.PerspectiveCamera(
            75,
            this.#winWidth / this.#winHeight,
            0.1,
            1000
        );
        this.#camera.position.setY(100);
        this.#camera.layers.enable(0);

        const halfWinWidth = this.#winWidth / 2;
        const halfWinHeight = this.#winHeight / 2;
        this.#hudCamera = new T.OrthographicCamera(
            -halfWinWidth,
            halfWinWidth,
            halfWinHeight,
            -halfWinHeight,
            0,
            10
        );
        this.#hudCamera.position.z = 10;
        this.#hudCamera.layers.set(1);

        this.#autoResize = autoResize;
        if (this.#autoResize) {
            window.addEventListener('resize', () => {
                if (this.#resizeCooldown != null) {
                    clearTimeout(this.#resizeCooldown);
                }
                console.log(`resize occured`);
                this.#resizeCooldown = setTimeout(() => {
                    this.#resizeCooldown = null;
                    console.log(`resize timer triggered checking width`);

                    if (
                        this.#winWidth !== window.innerWidth ||
                        this.#winHeight !== window.innerHeight
                    ) {
                        this.#winWidth = window.innerWidth;
                        this.#winHeight = window.innerHeight;
                        this.#renderer.setSize(this.#winWidth, this.#winHeight);

                        this.#composer.setSize(this.#winWidth, this.#winHeight);

                        // update camera aspect ratio
                        this.#camera.aspect = this.#winWidth / this.#winHeight;
                        this.#camera.updateProjectionMatrix();

                        // update hud camera size
                        const halfWinWidth = this.#winWidth / 2;
                        const halfWinHeight = this.#winHeight / 2;
                        this.#hudCamera.left = -halfWinWidth;
                        this.#hudCamera.right = halfWinWidth;
                        this.#hudCamera.top = halfWinHeight;
                        this.#hudCamera.bottom = -halfWinHeight;
                        this.#hudCamera.updateProjectionMatrix();

                        // make sure to call all registered listeners
                        this.#resizeListeners.forEach((callback) => {
                            callback(this.#winWidth, this.#winHeight);
                        });
                    }
                }, 50);
            });
        }

        this.#displayFps = displayFps;
        if (this.#displayFps) {
            const count = document.createElement('div');
            count.classList.add('fps-counter');

            canvas.after(count);
            this.#fpsCounterElem = count;
        }

        window.addEventListener('mousemove', (event) => {
            const mouseScreenPos = new T.Vector2(event.clientX, event.clientY);
            this.#mousePos = this.#screenToWorld(mouseScreenPos, true);
        });
    }

    // Internal only utility methods
    #calcFps(dT: number) {
        this.#frameTimeHistory.push(Math.round(dT));
        if (this.#frameTimeHistory.length > 100) {
            this.#frameTimeHistory.shift();
        }
        const avgFrameTime =
            this.#frameTimeHistory.reduce((a, b) => a + b, 0) /
            this.#frameTimeHistory.length;
        this.#fps = 1000 / avgFrameTime;
    }

    /* convert screen X,Y coords to world X,Y coords
     * primarily used with mouse position for raycasting
     * and UI interactions, toNormalize should be set to true
     * when raycasting to work properly with ThreeJS raycasting
     * from camera methods
     */
    #screenToWorld(
        screnePos: T.Vector2,
        toNormalize: boolean = false
    ): T.Vector2 {
        const canvas = this.#renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const worldPos = new T.Vector2(
            ((screnePos.x - rect.left) * canvas.width) / rect.width,
            ((screnePos.y - rect.top) * canvas.height) / rect.height
        );

        if (toNormalize) {
            worldPos.x = (worldPos.x / canvas.width) * 2 - 1;
            worldPos.y = (worldPos.y / canvas.height) * -2 + 1;
        }

        return worldPos;
    }

    // Register a listener for when the screen is resized
    whenResized(callback: (width: number, height: number) => void) {
        this.#resizeListeners.push(callback);
    }

    // Scene Control Methods
    createScene(): T.Scene {
        return new T.Scene();
    }
    /* Set the current active scene to render by
     * default when no scene is passed to the
     * render method
     */
    setActiveScene(s: T.Scene) {
        this.#activeScene = s;

        if (this.#mainRenderPass !== null) {
            this.#composer.removePass(this.#mainRenderPass);
        }

        this.#mainRenderPass = new RenderPass(this.#activeScene, this.#camera);
        this.#composer.insertPass(this.#mainRenderPass, 0);
    }
    getActiveScene(): T.Scene | null {
        return this.#activeScene;
    }
    // Scene control methods specifically for the HUD
    setActiveHudScene(s: T.Scene) {
        this.#activeHud = s;
    }
    getActiveHudScene(): T.Scene | null {
        return this.#activeHud;
    }

    /* Create a new shader to outline selected elements in either the
     * provided scene or the current active scene
     */
    createOutlineShader(scene?: T.Scene): OutlinePass | undefined {
        const targetScene = scene ?? this.#activeScene;
        if (targetScene === null) {
            console.error(
                `could not create outline shader, invalid scene or not active scene`
            );
            return;
        }

        const outline = new OutlinePass(
            new T.Vector2(this.#winWidth, this.#winHeight),
            targetScene,
            this.#camera
        );
        this.#composer.addPass(outline);

        return outline;
    }

    // Camera Control Methods
    moveCamera(vec: T.Vector3) {
        this.#camera.position.add(vec);
    }
    rotateCamera(axis: T.Vector3, radians: number) {
        this.#camera.rotateOnAxis(axis, radians);
    }
    cameraLookAt(vec: T.Vector3) {
        this.#camera.lookAt(vec);
    }

    // Input Control Methods
    enableOrbitCtrls() {
        this.#orbitCtrls = new OrbitControls(
            this.#camera,
            this.#renderer.domElement
        );
    }
    getRaycaster(source: T.Vector2): T.Raycaster {
        const caster = new T.Raycaster();
        caster.setFromCamera(source, this.#camera);
        return caster;
    }
    getMouseRaycaster(): T.Raycaster {
        return this.getRaycaster(this.#mousePos);
    }

    update(dT: number = 0) {
        this.#calcFps(dT);

        if (this.#debug)
            console.log(
                `dT -> ${msToS(dT).toFixed(2)}s fps -> ${this.#fps.toFixed(2)}`
            );

        if (this.#orbitCtrls) {
            this.#orbitCtrls.update();
        } else {
            const cameraSpeed = 0.1;
            let cameraVelocity = new T.Vector3(0, 0);
            if (this.#inputHandler.isKeyDown('w')) {
                cameraVelocity.add(new T.Vector3(-cameraSpeed, 0, 0));
            }

            if (this.#inputHandler.isKeyDown('s')) {
                cameraVelocity.add(new T.Vector3(cameraSpeed, 0, 0));
            }

            if (this.#inputHandler.isKeyDown('a')) {
                cameraVelocity.add(new T.Vector3(0, 0, cameraSpeed));
            }

            if (this.#inputHandler.isKeyDown('d')) {
                cameraVelocity.add(new T.Vector3(0, 0, -cameraSpeed));
            }

            if (this.#inputHandler.isKeyDown('ArrowUp')) {
                cameraVelocity.add(new T.Vector3(0, -cameraSpeed, 0));
            }

            if (this.#inputHandler.isKeyDown('ArrowDown')) {
                cameraVelocity.add(new T.Vector3(0, cameraSpeed, 0));
            }
            cameraVelocity.multiplyScalar(dT);
            this.moveCamera(cameraVelocity);

            const cameraRotateSpd = 0.001;
            let cameraRotation = 0;
            if (this.#inputHandler.isKeyDown('ArrowLeft')) {
                cameraRotation += cameraRotateSpd;
            }

            if (this.#inputHandler.isKeyDown('ArrowRight')) {
                cameraRotation -= cameraRotateSpd;
            }
            this.rotateCamera(new T.Vector3(0, 0, 1), cameraRotation * dT);
        }

        // clamp camera position to prevent going below the ground plane
        if (this.#camera.position.y < 5) {
            this.#camera.position.y = 5;
        }
    }
    /* Render either the current active scene or provided scene */
    render(dT: number, scene?: T.Scene) {
        const curScene = scene ?? this.#activeScene;

        if (curScene === null) {
            console.error(`no scene provided or active scene set to render`);
            return;
        }

        if (this.#composer && this.#composer.passes.length > 2) {
            this.#composer.render(dT);
        } else {
            this.#renderer.render(curScene, this.#camera);
        }

        if (this.#activeHud != null) {
            this.#renderer.autoClear = false;
            this.#renderer.clearDepth();
            this.#renderer.render(this.#activeHud, this.#hudCamera);
            this.#renderer.autoClear = true;
        }

        if (this.#displayFps && this.#fpsCounterElem !== null) {
            this.#fpsCounterElem.textContent = `fps: ${this.#fps.toFixed(
                2
            )}\nmp: [${this.#mousePos.x.toFixed(3)}, ${this.#mousePos.y.toFixed(
                3
            )}]\ncp: [${this.#camera.position.x}, ${this.#camera.position.y}, ${
                this.#camera.position.z
            }]`;
        }
    }
}
