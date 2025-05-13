import './style.css';

import * as T from 'three';
import { Text } from 'troika-three-text';

import GameEngine from '@libraries/game_engine';
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

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;

input.initialize(canvas);

const engine = new GameEngine(canvas, input, {
    autoResize: true,
    debug: false,
    useShaders: false,
});

// preload all the meshes
[...TILE_MESHES, ...BUILDING_MESHES].forEach((path) => {
    loadMesh(addFileExtension('gltf')(path));
});

const scene = engine.createScene();
engine.setActiveScene(scene);

const hudScene = engine.createScene();
engine.setActiveHudScene(hudScene);

const ambientLight = new T.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const rows = 100;
const columns = rows;
const tileSize = 12;
const width = rows * tileSize;

const map = new LvlMap(
    engine,
    rows,
    columns,
    new T.Vector3(-width / 2, 0, -width / 2)
);
map.addToScene();

canvas.focus();

const rmFontSize = 20;
const rmLineHeight = 1.2;
const resourceMonitor = new Text();
resourceMonitor.font = PIXEL_FONT;
resourceMonitor.text = `Minerals: ${getResource(
    ResourceTypes.MINERALS
)}\nFood: ${getResource(ResourceTypes.FOOD)}`;
resourceMonitor.fontSize = rmFontSize;
resourceMonitor.lineHeight = rmLineHeight;
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

const rmPadding = 5;
const rmWidth = 150 + rmPadding * 2;
const rmHeight = rmFontSize * rmLineHeight * 2 + rmPadding * 2;
const backdrop = new T.Mesh(
    new T.PlaneGeometry(rmWidth, rmHeight),
    new T.MeshBasicMaterial({ color: 0x1f1f1f })
);
backdrop.position.set(
    -window.innerWidth / 2 + 5 + rmWidth / 2,
    window.innerHeight / 2 - 5 - rmHeight / 2,
    0
);
backdrop.layers.set(1);
hudScene.add(backdrop);

// controls callout
const controlsText = new Text();
controlsText.font = PIXEL_FONT;
controlsText.text = `Controls:\nClick to build\nWASD to move\nQE and Arrow Keys to rotate\nSpace/Shift to zoom\n\n\nBuild MINES on mountains and FARMS on grass\nMINES costs 20 minerals\nFARMS cost 5 minerals\n builds also have an upkeep cost of 5 food`;
controlsText.fontSize = rmFontSize;
controlsText.lineHeight = rmLineHeight;
controlsText.anchorX = 'left';
controlsText.anchorY = 'bottom';
controlsText.position.set(
    -window.innerWidth / 2 + 10,
    -window.innerHeight / 2 + 10,
    0
);
controlsText.layers.set(1);
controlsText.sync();
hudScene.add(controlsText);

const ccWidth = 450 + rmPadding * 2;
const ccHeight = rmFontSize * rmLineHeight * 11 + rmPadding * 2;
const ccbackdrop = new T.Mesh(
    new T.PlaneGeometry(ccWidth, ccHeight),
    new T.MeshBasicMaterial({ color: 0x1f1f1f })
);
ccbackdrop.position.set(
    -window.innerWidth / 2 + 5 + ccWidth / 2,
    -window.innerHeight / 2 + 5 + ccHeight / 2,
    0
);
ccbackdrop.layers.set(1);
hudScene.add(ccbackdrop);

let buildings: Array<Building> = [];

let isRunning = true;
let lastTimeStamp: number = performance.now();
let lastFood = getResource(ResourceTypes.FOOD);
let lastMinerals = getResource(ResourceTypes.MINERALS);
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
    if (lastMinerals !== curMinerals || lastFood !== curFood) {
        lastMinerals = curMinerals;
        lastFood = curFood;
        resourceMonitor.text = `Minerals: ${curMinerals}\nFood: ${curFood}`;
        resourceMonitor.sync();
    }

    engine.render(deltaTime);

    requestAnimationFrame(gameLoop);
}

setTimeout(() => gameLoop(lastTimeStamp), 10);
