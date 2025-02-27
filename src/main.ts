import './style.css';

import * as T from 'three';

import GameEngine from './libs/game_engine';
import { generateMap } from './map';

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;
const engine = new GameEngine(canvas, {
    autoResize: true,
    debug: false,
    displayFps: true,
});

const scene = engine.createScene();

const ambientLight = new T.AmbientLight(0xffffff);
scene.add(ambientLight);

engine.enableOrbitCtrls();

const rows = 100;
const columns = rows;
const tileSize = 1;

const width = rows * tileSize;

const startPos = new T.Vector3(-width / 2, -1, -width / 2);

const map = generateMap(rows, columns, tileSize, startPos);
map.addToScene(scene);
engine.setCurScene(scene);

// debug grid to help visual world positions
//const grid = new T.GridHelper(width * 2, width / 2, 0xff00ff, 0xaa00aa);
//scene.add(grid);

let isRunning = true;
let lastTimeStamp = -1;
function gameLoop(now: number) {
    if (!isRunning) return;

    if (lastTimeStamp === -1) lastTimeStamp = now;

    const deltaTime = now - lastTimeStamp;
    lastTimeStamp = now;

    requestAnimationFrame(gameLoop);

    engine.update(deltaTime);
    engine.render();
}

setTimeout(() => gameLoop(lastTimeStamp), 10);
