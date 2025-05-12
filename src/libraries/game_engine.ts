import * as T from 'three';
import {
    EffectComposer,
    OutlinePass,
    OutputPass,
    RenderPass,
} from 'three/examples/jsm/Addons.js';
import { Text } from 'troika-three-text';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import IsometricCameraController from '@libraries/isometric_camera';
import { msToS, vec2ToString, vec3ToString } from '@libraries/core';
import { InputHandler } from '@libraries/input';

type GameEngineOptions = {
    autoResize?: boolean;
    displayFps?: boolean;
    debug?: boolean;
    useShaders?: boolean;
};

const gltfLoader = new GLTFLoader();

export default class GameEngine {
    #debug = false;

    #renderer: T.WebGLRenderer;

    // All shader related variables
    #useShaders: boolean;
    #composer: EffectComposer;
    #inputHandler: InputHandler;
    #mainRenderPass: RenderPass | null = null;
    #hudRenderPass: RenderPass | null = null;
    #outputPass: OutputPass;

    #camera: T.PerspectiveCamera;
    #isoCamera: IsometricCameraController;
    #hudCamera: T.OrthographicCamera;
    #activeScene: T.Scene | null = null;
    #activeHud: T.Scene | null = null;

    #orbitCtrls: OrbitControls | null = null;

    #winWidth: number;
    #winHeight: number;

    #autoResize = false;
    #resizeCooldown: NodeJS.Timeout | null = null;
    #resizeListeners: Array<(width: number, height: number) => void> = [];

    #displayFps = false;
    #fps = 0;
    #frameTimeHistory: number[] = [];
    #fpsCounter: Text | null = null;

    constructor(
        canvas: HTMLCanvasElement,
        inputHandler: InputHandler,
        options?: GameEngineOptions
    ) {
        const {
            autoResize = true,
            displayFps = false,
            debug = false,
            useShaders = false,
        } = options ?? {};

        this.#debug = debug;
        this.#useShaders = useShaders;

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
            90,
            this.#winWidth / this.#winHeight,
            0.1
        );

        this.#camera.layers.enable(0);
        this.#isoCamera = new IsometricCameraController(this.#camera, {
            target: new T.Vector3(0, 0, 0),
            panSpeed: 400,
            rotationSpeed: 3,
            distance: 100,
            minDistance: 50,
            maxDistance: 300,
            rotationHorizontal: Math.PI / -4,
        });

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
                    console.log(
                        `already processing reize reseting calculation`
                    );
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
            this.showFpsCounter();
        }
    }

    showFpsCounter() {
        this.#displayFps = true;
        const text = new Text();
        text.anchorX = 'right';
        text.anchorY = 'top';
        text.textAlign = 'right';
        text.text = `fps: 0
            mouse_pos: [0, 0]
            mouse_hud_pos: [0, 0]
            cam_pos: [0, 0, 0]`;
        text.color = 0xffffff;
        text.fontSize = 16;
        text.position.set(this.#winWidth / 2 - 10, this.#winHeight / 2 - 10, 0);
        text.sync();
        text.layers.set(1);
        this.#fpsCounter = text;

        // If an active HUD scene is set add the fps counter to it
        if (this.#activeHud !== null) {
            this.#activeHud.add(this.#fpsCounter);
        }
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
        // make sure to add any debug hud elements to the active hud scene
        if (this.#displayFps && this.#fpsCounter !== null) {
            this.#activeHud.add(this.#fpsCounter);
        }

        if (this.#hudRenderPass !== null) {
            this.#composer.removePass(this.#hudRenderPass);
        }

        this.#hudRenderPass = new RenderPass(this.#activeHud, this.#hudCamera);
        this.#composer.addPass(this.#hudRenderPass);
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
        this.#isoCamera.pan(vec);
    }
    rotateCamera(angles: T.Vector2) {
        this.#isoCamera.rotate(angles);
    }
    pointCamera(vec: T.Vector3) {
        this.#isoCamera.changeTarget(vec);
    }

    // Input Control Methods
    enableOrbitCtrls() {
        this.#orbitCtrls = new OrbitControls(
            this.#camera,
            this.#renderer.domElement
        );

        this.#orbitCtrls.keys = {
            LEFT: 'KeyA',
            UP: 'KeyW',
            RIGHT: 'KeyD',
            BOTTOM: 'KeyS',
        };
        this.#orbitCtrls.keyPanSpeed = 80;
        this.#orbitCtrls.listenToKeyEvents(window);
    }
    getRaycaster(source: T.Vector2): T.Raycaster {
        const caster = new T.Raycaster();
        caster.setFromCamera(source, this.#camera);
        return caster;
    }
    getMouseRaycaster(): T.Raycaster {
        const mousePos = this.#inputHandler.toCanvasCoords(
            this.#inputHandler.getMousePos()
        );
        return this.getRaycaster(mousePos);
    }

    update(dT: number = 0) {
        this.#calcFps(dT);
        const secDt = msToS(dT);

        if (this.#debug)
            console.log(
                `dT -> ${secDt.toFixed(2)}s fps -> ${this.#fps.toFixed(2)}`
            );

        if (this.#orbitCtrls) {
            /* clamp camera position to prevent going below the ground plane
             * for oribt controls this must be done before it updates
             */
            const maxViewDist = 1000;
            this.#camera.position.clamp(
                new T.Vector3(-maxViewDist, 50, -maxViewDist),
                new T.Vector3(maxViewDist, maxViewDist, maxViewDist)
            );
            this.#orbitCtrls.update();
        } else {
            this.#isoCamera.update();
        }

        if (this.#inputHandler.isKeyPressed('=')) {
            console.log(`activate fps counter`);
            this.showFpsCounter();
        }

        const mousePos = this.#inputHandler.getMousePos();
        const mouseWorldPos = this.#inputHandler.toCanvasCoords(
            mousePos,
            false
        );
        if (this.#displayFps && this.#fpsCounter !== null) {
            this.#fpsCounter.text = `fps: ${this.#fps.toFixed(
                2
            )}\nmouse_pos: ${vec2ToString(
                mousePos,
                2
            )}\nmouse_hud_pos: ${vec2ToString(
                mouseWorldPos,
                2
            )}\ncam_pos: ${vec3ToString(this.#camera.position, 2)}`;
            this.#fpsCounter.sync();
        }
    }
    /* Render either the current active scene or provided scene */
    render(dT: number) {
        if (this.#activeScene === null) {
            console.error(`no active scene set to render`);
            return;
        }

        if (this.#useShaders) {
            this.#composer.render(dT);
        } else {
            this.#renderer.render(this.#activeScene, this.#camera);

            if (this.#activeHud != null) {
                this.#renderer.autoClear = false;
                this.#renderer.clearDepth();
                this.#renderer.render(this.#activeHud, this.#hudCamera);
                this.#renderer.autoClear = true;
            }
        }
    }

    // Additional helper methods to ease interaction with ThreeJS
    loadModelPromise(url: string): Promise<T.Mesh> {
        return new Promise<T.Mesh>((resolve, reject) => {
            gltfLoader.load(
                url,
                (gltf) => {
                    resolve(gltf.scene.children[0] as T.Mesh);
                },
                undefined,
                (err) => {
                    reject(err);
                }
            );
        });
    }
}
