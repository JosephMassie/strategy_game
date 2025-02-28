import './style.css';

import * as T from 'three';

import GameEngine from './libs/game_engine';
import LvlMap from './map';

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;
const engine = new GameEngine(canvas, {
    autoResize: true,
    debug: false,
    displayFps: true,
});

const scene = engine.createScene();
engine.setActiveScene(scene);

const ambientLight = new T.AmbientLight(0xffffff);
scene.add(ambientLight);

engine.enableOrbitCtrls();

const rows = 100;
const columns = rows;
const tileSize = 1;

const width = rows * tileSize;

const startPos = new T.Vector3(-width / 2, -1, -width / 2);

const map = new LvlMap(engine, rows, columns, tileSize, startPos);
map.addToScene();

// debug grid to help visual world positions
//const grid = new T.GridHelper(width * 2, width / 2, 0xff00ff, 0xaa00aa);
//scene.add(grid);

let isRunning = true;
let lastTimeStamp: number = performance.now();
function gameLoop(now: number) {
    if (!isRunning) return;

    if (lastTimeStamp === undefined) lastTimeStamp = now;

    const deltaTime = now - lastTimeStamp;
    lastTimeStamp = now;

    engine.update(deltaTime);
    map.update();

    engine.render(deltaTime);

    requestAnimationFrame(gameLoop);
}

setTimeout(() => gameLoop(lastTimeStamp), 10);
