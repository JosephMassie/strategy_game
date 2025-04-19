import './style.css';

import * as T from 'three';

import GameEngine from './libs/game_engine';
import LvlMap from './map';
import { input } from './libs/input';

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;

input.initialize(canvas);

const engine = new GameEngine(canvas, input, {
    autoResize: true,
    debug: false,
});

const scene = engine.createScene();
engine.setActiveScene(scene);

const hudScene = engine.createScene();
engine.setActiveHudScene(hudScene);

const ambientLight = new T.AmbientLight(0xffffff);
scene.add(ambientLight);

const rows = 100;
const columns = rows;
const tileSize = 1;

const width = rows * tileSize;

const startPos = new T.Vector3(-width / 2, -1, -width / 2);
engine.cameraLookAt(new T.Vector3(0, 0, 0));
engine.rotateCamera(new T.Vector3(0, 0, 1), 1.57);

const map = new LvlMap(engine, rows, columns, tileSize, startPos);
map.addToScene();

canvas.focus();

let isRunning = true;
let lastTimeStamp: number = performance.now();
function gameLoop(now: number) {
    if (!isRunning) return;

    if (lastTimeStamp === undefined) lastTimeStamp = now;

    const deltaTime = now - lastTimeStamp;
    lastTimeStamp = now;

    input.update();

    if (input.wasKeyPressed('Escape')) {
        console.log('Escape pressed');
        isRunning = false;
    }
    engine.update(deltaTime);
    map.update();

    engine.render(deltaTime);

    requestAnimationFrame(gameLoop);
}

setTimeout(() => gameLoop(lastTimeStamp), 10);
