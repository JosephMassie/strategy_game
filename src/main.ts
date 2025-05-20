import './style.css';

import * as T from 'three';
import { preloadFont } from 'troika-three-text';

import getGameEngine from '@libraries/game_engine';
import LvlMap, { Terrain } from './map';
import { input, MouseButton } from '@libraries/input';
import { updateTimers } from '@libraries/timing';
import {
    Building,
    mineConstructor,
    farmConstructor,
} from '@components/buildings';
import { getResource, ResourceTypes } from './game_state';
import { loadMesh, addFileExtension } from '@libraries/resource_loader';
import { BUILDING_MESHES, PIXEL_FONT, TILE_MESHES } from './constants';
import TextBox from './components/ui_textbox';

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;

const loadingContainer = document.createElement('div');
loadingContainer.classList.add('loading_container');
loadingContainer.innerHTML = `<div class="loading_text">loading...</div>`;
const loadingWheel = document.createElement('div');
loadingWheel.classList.add('loading_wheel');
loadingContainer.prepend(loadingWheel);
canvas.insertAdjacentElement('afterend', loadingContainer);
input.initialize(canvas);

const engine = getGameEngine(canvas, {
    autoResize: true,
    debug: true,
    useShaders: true,
});

// preload all the meshes
const loadingResources: Array<Promise<any>> = [
    ...TILE_MESHES,
    ...BUILDING_MESHES,
].map((path) => loadMesh(addFileExtension('gltf')(path)));

loadingResources.push(
    new Promise((resolve) => {
        preloadFont(
            {
                font: PIXEL_FONT,
                characters: '1234567890abcdefghijklmnopqrstuvwxyz',
            },
            () => {
                console.log(`finished preloading font ${PIXEL_FONT}`);
                resolve('font loaded');
            }
        );
    })
);

const scene = engine.createScene();
engine.setActiveScene(scene);

const hudScene = engine.createScene();
engine.setActiveHudScene(hudScene);

engine.createToonShader();

const ambientLight = new T.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const rows = 100;
const columns = rows;
const tileSize = 12;
const width = rows * tileSize;

const map = new LvlMap(rows, columns, new T.Vector3(-width / 2, 0, -width / 2));
map.addToScene();

canvas.focus();

const resourceMonitor = new TextBox(
    `Minerals: ${getResource(ResourceTypes.MINERALS)}\nFood: ${getResource(
        ResourceTypes.FOOD
    )}`,
    new T.Vector2(-0.98, 0.98),
    {
        anchor: 'top left',
        backDropColor: 0x1f1f1f,
        letterSpacing: 0.05,
    }
);
resourceMonitor.addToHudScene();

// controls callout
const ctrlCallout = new TextBox(
    `Controls:
Click to build
    WASD to move
    QE and Arrow Keys to rotate
    Space/Shift to zoom


Build MINES on mountains and FARMS on grass
    MINES costs 20 minerals
    FARMS cost 5 minerals
    MINES also have an upkeep cost of 5 food`,
    new T.Vector2(-0.98, -0.98),
    { backDropColor: 0x1f1f1f, letterSpacing: 0.05 }
);
ctrlCallout.addToHudScene();

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
        console.log('Escape pressed, closing game');
        isRunning = false;
    }
    engine.update(deltaTime);
    map.update();

    buildings.forEach((building) => {
        building.update();
    });

    if (input.isMouseButtonPressed(MouseButton.LEFT)) {
        const focusedTile = map.getHoveredTile();
        if (focusedTile !== null) {
            switch (focusedTile.terrain) {
                case Terrain.MOUNTAIN:
                    if (mineConstructor.checkCost()) {
                        const mine = mineConstructor.build(
                            focusedTile.position
                        );
                        mine.addToScene(scene);
                        buildings.push(mine);
                    }
                    break;
                case Terrain.GRASS:
                    if (farmConstructor.checkCost()) {
                        const farm = farmConstructor.build(
                            focusedTile.position
                        );
                        farm.addToScene(scene);
                        buildings.push(farm);
                    }
                    break;
                case Terrain.WATER:
                    break;
                case Terrain.SAND:
                    break;
                default:
            }
        }
    }

    const curMinerals = getResource(ResourceTypes.MINERALS);
    const curFood = getResource(ResourceTypes.FOOD);
    resourceMonitor.updateText(`Minerals: ${curMinerals}\nFood: ${curFood}`);

    engine.render(deltaTime);

    requestAnimationFrame(gameLoop);
}

// Wait to start the game loop after all primary resources are loaded
Promise.all(loadingResources).then(() => {
    loadingContainer.style.display = 'none';
    gameLoop(lastTimeStamp);
});
