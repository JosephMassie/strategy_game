import * as T from 'three';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default class GameEngine {
    #renderer: T.WebGLRenderer;
    #camera: T.PerspectiveCamera;
    #orbitCtrls: OrbitControls | null = null;

    #winWidth: number;
    #winHeight: number;

    #shouldResize: boolean = false;
    #resizeCooldown: number | null = null;

    constructor(canvas: HTMLCanvasElement, shouldResize: boolean = false) {
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
        this.#camera.position.setZ(30);

        this.#shouldResize = shouldResize;
        if (this.#shouldResize) {
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
    }

    createScene() {
        return new T.Scene();
    }
    moveCamera(vec: T.Vector3) {
        this.#camera.position.add(vec);
    }
    cameraLookAt(vec: T.Vector3) {
        this.#camera.lookAt(vec);
    }
    enableOrbitCtrls() {
        this.#orbitCtrls = new OrbitControls(
            this.#camera,
            this.#renderer.domElement
        );
    }

    update(dT: number = 0) {
        console.log(`${dT}ms passed`);

        if (this.#orbitCtrls) {
            this.#orbitCtrls.update();
        }
    }
    render(scene: T.Scene) {
        this.#renderer.render(scene, this.#camera);
    }
}
