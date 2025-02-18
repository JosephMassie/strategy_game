import * as T from 'three';

import { randInt } from './libs/core';

type MapCoords = [x: number, y: number];

export enum Terrain {
    GRASS,
    WATER,
    SAND,
    MOUNTAIN,
}
export type Tile = {
    terrain: Terrain;
    mesh: T.Mesh;
    position: T.Vector3;
};

export type Map = {
    width: number;
    height: number;
    tiles: Tile[][];
    tileSize: number;
    addToScene(scene: T.Scene): void;
    getTile(coords: MapCoords): Tile;
};

type TerraFormer = {
    target: Terrain;
    facing: number;
    x: number;
    y: number;
    oldX: number;
    oldY: number;
};

const textureLoader = new T.TextureLoader();

const grassMat = new T.MeshStandardMaterial({
    map: textureLoader.load('/grass.png'),
});
const waterMat = new T.MeshStandardMaterial({
    map: textureLoader.load('/water.png'),
});
const sandMat = new T.MeshStandardMaterial({
    map: textureLoader.load('/sand.png'),
});
const mtnMat = new T.MeshStandardMaterial({
    map: textureLoader.load('/mountain.png'),
});

const changeTileType = (tile: Tile, type: Terrain) => {
    let nMaterial = grassMat;
    // change tille type
    switch (type) {
        case Terrain.GRASS:
            nMaterial = grassMat;
            break;
        case Terrain.MOUNTAIN:
            nMaterial = mtnMat;
            break;
        case Terrain.WATER:
            nMaterial = waterMat;
            break;
        case Terrain.SAND:
            nMaterial = sandMat;
            break;
        default:
            console.error(`invalid material to terraform`);
    }
    //console.log(`changing tile from ${tile.terrain} to ${type}`);
    tile.mesh.material = nMaterial;
    tile.terrain = type;
};

const makeBaseBox = (map: Map) =>
    new T.BoxGeometry(map.tileSize, 1, map.tileSize);

const isTerraformerPosValid = (map: Map, former: TerraFormer) =>
    !(
        former.x < 0 ||
        former.y < 0 ||
        former.x >= map.width ||
        former.y >= map.height ||
        map.getTile([former.x, former.y]).terrain != Terrain.GRASS
    );

const getNeighbors = (map: Map, coords: MapCoords): MapCoords[] => {
    const [x, y] = coords;
    const neighbors: MapCoords[] = [];

    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
        return neighbors;
    }

    for (let yy = -1; yy <= 1; yy++) {
        const ny = yy + y;
        if (ny >= 0 && ny < map.height) {
            for (let xx = -1; xx <= 1; xx++) {
                const nx = xx + x;
                if (nx >= 0 && nx < map.width) {
                    neighbors.push([nx, ny]);
                }
            }
        }
    }

    return neighbors;
};

const countNeighborsOfType = (
    map: Map,
    coords: MapCoords,
    target: Terrain
): number =>
    getNeighbors(map, coords).reduce((weight, nCoords) => {
        if (map.getTile(nCoords).terrain === target) {
            return weight + 1;
        }
        return weight;
    }, 0);

/* For all water tiles check its neighbors and either
 * fill in more water or change to the sand to represent
 * the coast
 */
function fillWater(map: Map, waterCoords: MapCoords[]) {
    const addedWater: MapCoords[] = [];

    waterCoords.forEach((coords) => {
        getNeighbors(map, coords).forEach((target) => {
            const tile = map.getTile(target);

            // If this neighbor is already water skip it
            if (tile.terrain === Terrain.WATER) return;

            /* based on the number of water tiles surrounding the target
             * determine if it should be water or coast
             */
            let waterWeight = countNeighborsOfType(map, target, Terrain.WATER);

            // If there is enough water change to water otherwise make it sand
            if (waterWeight >= 5) {
                changeTileType(tile, Terrain.WATER);
                addedWater.push(target);
            } else {
                changeTileType(tile, Terrain.SAND);
            }
        });
    });

    // recursively check all newly added water
    if (addedWater.length > 0) {
        console.log(`fill water making another pass on ${addedWater.length}`);
        fillWater(map, addedWater);
    } else {
        console.log(`done filling in water`);
    }
}

function fillInTerrain(
    map: Map,
    mtnCoords: MapCoords[],
    terrain: Terrain,
    factor: number = 5
) {
    const updatedTiles: MapCoords[] = [];

    mtnCoords.forEach((coords) => {
        getNeighbors(map, coords).forEach((target) => {
            const tile = map.getTile(target);

            // If this neighbor is already water skip it
            if (tile.terrain === terrain) return;

            /* based on the number of water tiles surrounding the target
             * determine if it should be water or coast
             */
            let mtnWeight = countNeighborsOfType(map, target, terrain);

            // If there is enough water change to water otherwise make it sand
            if (mtnWeight >= factor) {
                changeTileType(tile, terrain);
                updatedTiles.push(target);
            }
        });
    });

    // recursively check all newly added water
    if (updatedTiles.length > 0) {
        console.log(
            `making another pass filling in ${terrain} on ${updatedTiles.length} tiles`
        );
        fillInTerrain(map, updatedTiles, terrain, factor);
    } else {
        console.log(`done filling in ${terrain}`);
    }
}

type TerraFormOptions = {
    percentCoverage?: number;
    terraformerFactor?: number;
};

function terraForm(
    map: Map,
    terrainTarget: Terrain,
    options?: TerraFormOptions
) {
    const { percentCoverage = 0.2, terraformerFactor = 0.02 } = options ?? {};
    /* Determine how many terraformers and iterations are needed
     * on the map size and other optional parameters
     */
    let numFormers = 0;
    let numIterations = 0;
    // percentage of the map to be covered with the new tile type
    let percent = map.width * map.height * percentCoverage;
    numFormers = Math.round(percent * terraformerFactor);
    numIterations = Math.round(percent / numFormers);

    console.log(
        `terraforming ${terrainTarget} with ${numFormers} terraformers over ${numIterations} iterations`
    );

    // if the map is too small don't run
    if (numFormers <= 0) {
        return;
    }

    // Initialize all terraformers
    const terraformers = Array(numFormers)
        .fill(null)
        .map(() => {
            return {
                x: 0,
                y: 0,
                oldX: 0,
                oldY: 0,
                facing: 0,
                target: terrainTarget,
            } as TerraFormer;
        });

    // find random starting positions that are Grass for each
    terraformers.forEach((former) => {
        do {
            former.x = randInt(0, map.width - 1);
            former.y = randInt(0, map.height - 1);
        } while (!isTerraformerPosValid(map, former));
    });

    // track all newly adjusted tile coordinates
    const newTerrain: MapCoords[] = [];

    // perform first pass of random terrain placement via moving terraformers
    for (let i = 0; i < numIterations; i++) {
        terraformers.forEach((former) => {
            // choose a random facing
            former.facing = randInt(0, 7);

            // save old pos
            former.oldX = former.x;
            former.oldY = former.y;

            switch (former.facing) {
                case 0:
                    former.x--;
                    former.y--;
                    break;
                case 1:
                    former.y--;
                    break;
                case 2:
                    former.x++;
                    former.y--;
                    break;
                case 3:
                    former.x++;
                    break;
                case 4:
                    former.x--;
                    break;
                case 5:
                    former.x--;
                    former.y++;
                    break;
                case 6:
                    former.y++;
                    break;
                case 7:
                    former.x++;
                    former.y++;
                    break;
                default:
            }

            if (isTerraformerPosValid(map, former)) {
                newTerrain.push([former.x, former.y]);
                changeTileType(
                    map.getTile([former.x, former.y]),
                    terrainTarget
                );
            } else {
                // reset position
                former.x = former.oldX;
                former.y = former.oldY;
            }
        });
    }

    // Perform a second pass of adjustments specific to target terrain type
    switch (terrainTarget) {
        case Terrain.MOUNTAIN:
            fillInTerrain(map, newTerrain, Terrain.MOUNTAIN);
            break;
        case Terrain.SAND:
            fillInTerrain(map, newTerrain, Terrain.SAND, 6);
            break;
        case Terrain.WATER:
            fillWater(map, newTerrain);
            break;
        default:
            console.error(`invalid terrain type`);
            break;
    }
}

export function generateMap(
    width: number,
    height: number,
    tileSize: number = 4,
    startPos: T.Vector3 = new T.Vector3(0, 0, 0)
) {
    const map: Map = {
        width,
        height,
        tileSize,
        tiles: Array(height).fill([]),
        getTile([x, y]: MapCoords) {
            return this.tiles[y][x];
        },
        addToScene: function (scene: T.Scene) {
            this.tiles.forEach((row) => {
                row.forEach((tile) => {
                    scene.add(tile.mesh);
                });
            });
        },
    };

    const baseTileGeo = makeBaseBox(map);

    console.log(`generating map of ${width}x${height}`);

    for (let y = 0; y < height; y++) {
        if (map.tiles[y].length === 0) {
            map.tiles[y] = Array(width).fill(null);
        }

        for (let x = 0; x < width; x++) {
            if (map.tiles[y][x] === null) {
                const position = new T.Vector3(x * tileSize, 0, y * tileSize);
                position.add(startPos);
                const mesh = new T.Mesh(baseTileGeo, grassMat);
                mesh.position.add(position);

                map.tiles[y][x] = {
                    terrain: Terrain.GRASS,
                    mesh,
                    position,
                };
            }
        }
    }

    console.log(`adding in water`);
    terraForm(map, Terrain.WATER, { percentCoverage: 0.3 });

    console.log(`raising mountains`);
    terraForm(map, Terrain.MOUNTAIN);

    console.log(`laying down sand`);
    terraForm(map, Terrain.SAND, { percentCoverage: 0.1 });

    return map;
}
