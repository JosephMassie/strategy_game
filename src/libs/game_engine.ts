import * as T from 'three';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { msToS } from './core';

export type GameEngineOptions = {
    autoResize: boolean;
    displayFps: boolean;
    debug: boolean;
};

export default class GameEngine {
    #debug = false;

    #renderer: T.WebGLRenderer;
    #camera: T.PerspectiveCamera;
    #activeScene: T.Scene | null = null;
    #orbitCtrls: OrbitControls | null = null;

    #winWidth: number;
    #winHeight: number;

    #autoResize = false;
    #resizeCooldown: number | null = null;

    #displayFps = false;
    #fps = 0;
    #frameCount = 0;
    #elapsedTime = 0;
    #fpsCounterElem: HTMLElement | null = null;
    #mousePos = new T.Vector2(-Infinity, -Infinity);

    constructor(canvas: HTMLCanvasElement, options?: GameEngineOptions) {
        const {
            autoResize = false,
            displayFps = false,
            debug = false,
        } = options ?? {};

        this.#debug = debug;

        if (!WebGL.isWebGL2Available()) {
            const warning = WebGL.getWebGL2ErrorMessage();
            canvas.before(warning);
            canvas.remove();

            throw Error(`WebGL not available`);
        }

        this.#winWidth = window.innerWidth;
        this.#winHeight = window.innerHeight;

        this.#renderer = new T.WebGLRenderer({ canvas });
        this.#camera = new T.PerspectiveCamera(
            75,
            this.#winWidth / this.#winHeight,
            0.1,
            1000
        );

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(this.#winWidth, this.#winHeight);
        //this.#camera.position.setZ(10);
        this.#camera.position.setY(140);

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

                        // update camera aspect ratio
                        this.#camera.aspect = this.#winWidth / this.#winHeight;
                        this.#camera.updateProjectionMatrix();
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
        this.#frameCount++;
        this.#elapsedTime += dT;
        this.#fps = this.#frameCount / msToS(this.#elapsedTime);
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

    // Scene Control Methods
    createScene(): T.Scene {
        return new T.Scene();
    }
    setActiveScene(s: T.Scene) {
        this.#activeScene = s;
    }
    getActiveScene(): T.Scene | null {
        return this.#activeScene;
    }

    // Camera Control Methods
    moveCamera(vec: T.Vector3) {
        this.#camera.position.add(vec);
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
        }
    }
    render(scene?: T.Scene) {
        const curScene = scene ?? this.#activeScene;

        if (curScene === null) {
            console.error(`no scene provided or active scene set to render`);
            return;
        }

        this.#renderer.render(curScene, this.#camera);

        if (this.#displayFps && this.#fpsCounterElem !== null) {
            this.#fpsCounterElem.textContent = `fps: ${this.#fps.toFixed(
                2
            )}\nmp: ${this.#mousePos.x.toFixed(3)}, ${this.#mousePos.y.toFixed(
                3
            )}`;
        }
    }
}
