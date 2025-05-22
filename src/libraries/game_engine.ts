import * as T from 'three';
import {
    EffectComposer,
    OutlinePass,
    OutputPass,
    ShaderPass,
    RenderPass,
} from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import IsometricCameraController from '@libraries/isometric_camera';
import { shaderUniforms } from '@libraries/core';
import { input } from '@libraries/input';
import ToonShader from '@/shaders/toon';
import { SUN_POS } from '@/constants';

type GameEngineOptions = {
    autoResize?: boolean;
    displayFps?: boolean;
    debug?: boolean;
    useShaders?: boolean;
};

let engine: GameEngine;

export default function getGameEngine(
    canvas?: HTMLCanvasElement,
    opts: GameEngineOptions = {}
): GameEngine {
    if (engine === undefined) {
        console.log('game engine not yet initialized, initializing');
        if (canvas === undefined) {
            throw new Error(
                `failed to initialize game engine no canvas provided`
            );
        }

        engine = new GameEngine(canvas, opts);
    }

    return engine;
}

export class GameEngine {
    #debug = false;

    #renderer: T.WebGLRenderer;

    // All shader related variables
    #useShaders: boolean;
    #composer: EffectComposer;
    #mainRenderPass: RenderPass | null = null;
    #hudRenderPass: RenderPass | null = null;
    #outputPass: OutputPass;
    #additionalPasses: Array<ShaderPass | OutlinePass> = [];

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
    #fpsCounter: Stats | null = null;

    constructor(canvas: HTMLCanvasElement, options?: GameEngineOptions) {
        const {
            autoResize = true,
            displayFps = false,
            debug = false,
            useShaders = false,
        } = options ?? {};

        this.#debug = debug;
        this.#useShaders = useShaders;

        if (!WebGL.isWebGL2Available()) {
            const warning = WebGL.getWebGL2ErrorMessage();
            canvas.before(warning);
            canvas.remove();

            throw Error(`WebGL not available`);
        }

        this.#winWidth = window.innerWidth;
        this.#winHeight = window.innerHeight;

        this.#renderer = new T.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(this.#winWidth, this.#winHeight);
        this.#renderer.autoClear = !useShaders;
        this.#composer = new EffectComposer(this.#renderer);
        this.#outputPass = new OutputPass();
        this.#composer.addPass(this.#outputPass);

        this.#camera = new T.PerspectiveCamera(
            75,
            this.#winWidth / this.#winHeight,
            0.1,
            800
        );

        this.#camera.layers.enable(0);
        this.#isoCamera = new IsometricCameraController(this.#camera, {
            target: new T.Vector3(0, 0, 0),
            panSpeed: 400,
            rotationSpeed: 3,
            distance: 100,
            minDistance: 50,
            maxDistance: 200,
            rotationHorizontal: Math.PI / -4,
            minVerticalRotation: Math.PI / 16,
            maxVerticalRotation: Math.PI / 3,
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

                        // update composers when using shaders
                        if (this.#useShaders) {
                            this.#composer.setSize(
                                this.#winWidth,
                                this.#winHeight
                            );
                        }

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
        if (this.#displayFps) return;

        this.#displayFps = true;
        const stats = new Stats();
        stats.dom.style.left = 'auto';
        stats.dom.style.right = '0';
        document.body.append(stats.dom);

        this.#fpsCounter = stats;
    }

    // Register a listener for when the screen is resized
    whenResized(callback: (width: number, height: number) => void) {
        this.#resizeListeners.push(callback);
    }

    // Scene Control Methods
    createScene(): T.Scene {
        return new T.Scene();
    }

    #rebuildRenderPasses(additionalPasses?: Array<ShaderPass | OutlinePass>) {
        this.#composer.passes = [];

        if (this.#mainRenderPass) {
            this.#mainRenderPass.clear = true;
            this.#composer.addPass(this.#mainRenderPass);
        }

        if (Array.isArray(additionalPasses)) {
            this.#additionalPasses = [
                ...this.#additionalPasses,
                ...additionalPasses,
            ];
            this.#additionalPasses.forEach((pass) =>
                this.#composer.addPass(pass)
            );
        }

        if (this.#hudRenderPass) {
            this.#hudRenderPass.clear = false;
            this.#hudRenderPass.clearDepth = true;
            this.#composer.addPass(this.#hudRenderPass);
        }

        this.#composer.addPass(this.#outputPass);

        // Log the pass stack for debugging
        if (this.#debug) {
            console.log('Rebuilt render passes:');
            this.#composer.passes.forEach((pass, i) => {
                console.log(`${i}: ${pass.constructor.name}`, pass);
            });
        }
    }
    /* Set the current active scene to render by
     * default when no scene is passed to the
     * render method
     */
    setActiveScene(s: T.Scene) {
        this.#activeScene = s;

        this.#mainRenderPass = new RenderPass(this.#activeScene, this.#camera);
        this.#rebuildRenderPasses();
    }
    getActiveScene(): T.Scene | null {
        return this.#activeScene;
    }
    // Scene control methods specifically for the HUD
    setActiveHudScene(s: T.Scene) {
        this.#activeHud = s;

        this.#hudRenderPass = new RenderPass(this.#activeHud, this.#hudCamera);
        this.#hudRenderPass.clear = false;
        this.#rebuildRenderPasses();
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
                'could not create outline shader, invalid scene or not active scene'
            );
            return;
        }

        const outline = new OutlinePass(
            new T.Vector2(this.#winWidth, this.#winHeight),
            targetScene,
            this.#camera
        );
        this.#rebuildRenderPasses([outline]);
        return outline;
    }

    createToonShader(scene?: T.Scene): ShaderPass | undefined {
        const targetScene = scene ?? this.#activeScene;
        if (targetScene === null) {
            console.error(
                `failed to create toon shader, invalid scene or no active scene available`
            );
            return;
        }

        const toon = new ShaderPass(ToonShader);

        toon.uniforms = {
            ...toon.uniforms,
            ...shaderUniforms({
                lightPosition: new T.Vector3(...SUN_POS),
                outlineThreshold: 0.1,
                outlineMultiplier: 2.0,
                samplingRadius: 0.75,
            }),
        };

        this.#rebuildRenderPasses([toon]);
        return toon;
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
        const mousePos = input.toCanvasCoords(input.getMousePos());
        return this.getRaycaster(mousePos);
    }

    update() {
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

        if (input.isKeyPressed('=')) {
            console.log(`activate fps counter`);
            this.showFpsCounter();
        }

        if (this.#displayFps && this.#fpsCounter !== null) {
            this.#fpsCounter.update();
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
}
