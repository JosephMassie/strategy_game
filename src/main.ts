import './style.css';

import * as T from 'three';
import { Text } from 'troika-three-text';

import GameEngine from '@libraries/game_engine';
import LvlMap from './map';
import { input, MouseButton } from '@libraries/input';
import { updateTimers } from '@libraries/timing';
import { Mine, Building } from './components/buildings';
import { BUILDING_COSTS } from './constants';
import { addMinerals, getMinerals } from './game_state';

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;

input.initialize(canvas);

const engine = new GameEngine(canvas, input, {
    autoResize: true,
    debug: false,
});
engine.enableOrbitCtrls();

const scene = engine.createScene();
engine.setActiveScene(scene);

const hudScene = engine.createScene();
engine.setActiveHudScene(hudScene);

const ambientLight = new T.AmbientLight(0xffffff);
scene.add(ambientLight);

const rows = 100;
const columns = rows;
const tileSize = 4;
const width = rows * tileSize;

const map = new LvlMap(
    engine,
    rows,
    columns,
    tileSize,
    new T.Vector3(-width / 2, 0, -width / 2)
);
map.addToScene();

canvas.focus();

const resourceMonitor = new Text();
resourceMonitor.text = `Minerals: ${getMinerals()}`;
resourceMonitor.fontSize = 16;
resourceMonitor.anchorX = 'left';
resourceMonitor.anchorY = 'top';
resourceMonitor.position.set(
    -window.innerWidth / 2 + 10,
    window.innerHeight / 2 - 10,
    0
);
resourceMonitor.layers.set(1);
resourceMonitor.sync();
hudScene.add(resourceMonitor);

let buildings: Array<Building> = [];

let isRunning = true;
let lastTimeStamp: number = performance.now();
function gameLoop(now: number) {
    if (!isRunning) return;

    if (lastTimeStamp === undefined) lastTimeStamp = now;

    const deltaTime = now - lastTimeStamp;
    lastTimeStamp = now;

    updateTimers(deltaTime);
    input.update();

    if (input.isKeyPressed('Escape')) {
        console.log('Escape pressed');
        isRunning = false;
    }
    engine.update(deltaTime);
    map.update();

    buildings.forEach((building) => {
        building.update();
    });

    if (input.wasMouseButtonPressedButNotHeld(MouseButton.LEFT)) {
        const focusedTile = map.getHoveredTile();
        console.log(`looking at tile: ${focusedTile?.terrain}`);
        if (focusedTile !== null && getMinerals() >= BUILDING_COSTS.mine) {
            addMinerals(-BUILDING_COSTS.mine);
            const mine = new Mine();
            mine.position.copy(focusedTile.position);
            mine.position.y += 1;
            scene.add(mine);
            buildings.push(mine);
        }
    }

    resourceMonitor.text = `Minerals: ${getMinerals()}`;
    resourceMonitor.sync();

    engine.render(deltaTime);

    requestAnimationFrame(gameLoop);
}

setTimeout(() => gameLoop(lastTimeStamp), 10);
