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

const rows = 200;
const columns = rows;
const tileSize = 1;

const width = rows * tileSize;

const startPos = new T.Vector3(-width / 2, -1, -width / 2);

const map = generateMap(rows, columns, tileSize, startPos);
map.addToScene(scene);

//const grid = new T.GridHelper(width * 2, width / 2, 0xff00ff, 0xaa00aa);
//scene.add(grid);

console.log(map);

let isRunning = true;
let lastTimeStamp = Date.now();
function gameLoop() {
    if (!isRunning) return;

    const now = Date.now();
    const deltaTime = now - lastTimeStamp;
    lastTimeStamp = now;

    requestAnimationFrame(gameLoop);

    engine.update(deltaTime);
    engine.render(scene);
}

setTimeout(gameLoop, 10);
