import * as T from 'three';

import { randInt } from '@libraries/core';
import getGameEngine, { GameEngine } from '@libraries/game_engine';
import { loadMesh, addFileExtension } from '@libraries/resource_loader';

type MapCoords = [x: number, y: number];

export enum Terrain {
    GRASS,
    WATER,
    SAND,
    MOUNTAIN,
}
export type Tile = {
    terrain: Terrain;
    mesh: T.Mesh | null;
    position: T.Vector3;
};

type TerraFormer = {
    target: Terrain;
    facing: number;
    x: number;
    y: number;
    oldX: number;
    oldY: number;
};

type TerraFormOptions = {
    percentCoverage?: number;
    terraformerFactor?: number;
};

const sun = new T.DirectionalLight(0xffffff, 2.5);
sun.castShadow = true;
let tileSize = 12;

const PLACEHOLDER_GEOMETRY = new T.PlaneGeometry(tileSize, tileSize);
const PLACEHOLDER_MATERIALS = {
    [Terrain.GRASS]: new T.MeshBasicMaterial({ color: 0x00ff00 }),
    [Terrain.WATER]: new T.MeshBasicMaterial({ color: 0x0000ff }),
    [Terrain.SAND]: new T.MeshBasicMaterial({ color: 0xffff00 }),
    [Terrain.MOUNTAIN]: new T.MeshBasicMaterial({ color: 0x808080 }),
};

export default class LvlMap {
    #engine: GameEngine;

    #width: number;
    #height: number;
    #tiles: Tile[][];
    #hoveredTile: Tile | null = null;

    #modelPromise: Promise<Record<string, T.Mesh>>;
    // All models
    #grassModel: T.Mesh | null = null;
    #waterModel: T.Mesh | null = null;
    #sandModel: T.Mesh | null = null;
    #mountainModel: T.Mesh | null = null;

    constructor(
        width: number,
        height: number,
        startPos: T.Vector3 = new T.Vector3(0, 0, 0)
    ) {
        console.log(`generating ${width}x${height} map`);

        this.#engine = getGameEngine();
        this.#width = width;
        this.#height = height;
        this.#tiles = Array(height).fill([]);

        sun.position.set(0, 10, 0);

        // Initialize map with placeholder tiles
        for (let y = 0; y < height; y++) {
            if (this.#tiles[y].length === 0) {
                this.#tiles[y] = Array(width).fill(null);
            }

            for (let x = 0; x < width; x++) {
                if (this.#tiles[y][x] === null) {
                    const position = new T.Vector3(
                        x * tileSize,
                        0,
                        y * tileSize
                    );
                    position.add(startPos);
                    const mesh = new T.Mesh(
                        PLACEHOLDER_GEOMETRY,
                        PLACEHOLDER_MATERIALS[Terrain.GRASS]
                    );
                    mesh.rotateX(-Math.PI / 2); // Rotate plane to be horizontal
                    mesh.position.copy(position);

                    this.#tiles[y][x] = {
                        terrain: Terrain.GRASS,
                        mesh,
                        position,
                    };
                }
            }
        }

        console.log(`raising mountains`);
        this.#terraForm(Terrain.MOUNTAIN, { percentCoverage: 0.15 });

        console.log(`adding in water`);
        this.#terraForm(Terrain.WATER, { percentCoverage: 0.2 });

        console.log(`laying down sand`);
        this.#terraForm(Terrain.SAND, { percentCoverage: 0.1 });

        // Start loading actual models
        this.#modelPromise = this.#loadModels();
        this.#modelPromise.then(() => {
            this.#initializeModels();
        });
    }

    async #loadModels(): Promise<Record<string, T.Mesh>> {
        const extend = addFileExtension('gltf');

        const grass = await loadMesh(extend('grass'));
        const water = await loadMesh(extend('water'));
        const sand = await loadMesh(extend('sand'));
        const mountain = await loadMesh(extend('mountain'));

        return {
            grass,
            water,
            sand,
            mountain,
        };
    }

    async #initializeModels() {
        try {
            const models = await this.#modelPromise;
            console.log('all map tile models loaded');

            this.#grassModel = models.grass;
            this.#waterModel = models.water;
            this.#sandModel = models.sand;
            this.#mountainModel = models.mountain;

            // Update the tile size based on the loaded model
            const size = new T.Vector3(0, 0, 0);
            const box = new T.Box3().setFromObject(models.grass);
            box.getSize(size);
            const oldTileSize = tileSize;
            tileSize = size.x;
            console.log(`tile size is ${tileSize}`);

            const start = performance.mark('load tile meshes start');
            // Replace placeholder meshes with actual models
            this.#tiles.flat().forEach((tile) => {
                if (!tile.mesh) return;

                const scene = tile.mesh.parent;
                if (!scene) return;

                scene.remove(tile.mesh);
                tile.mesh.geometry.dispose();
                if (Array.isArray(tile.mesh.material)) {
                    tile.mesh.material.forEach((material) => {
                        material.dispose();
                    });
                } else {
                    tile.mesh.material.dispose();
                }

                let newMesh: T.Mesh | null = null;
                switch (tile.terrain) {
                    case Terrain.GRASS:
                        newMesh = this.#grassModel?.clone() ?? null;
                        break;
                    case Terrain.WATER:
                        newMesh = this.#waterModel?.clone() ?? null;
                        break;
                    case Terrain.SAND:
                        newMesh = this.#sandModel?.clone() ?? null;
                        break;
                    case Terrain.MOUNTAIN:
                        newMesh = this.#mountainModel?.clone() ?? null;
                        break;
                }

                if (newMesh) {
                    // reposition tile based on the new tile size
                    const newPos = tile.position
                        .clone()
                        .divideScalar(oldTileSize);
                    newPos.multiplyScalar(tileSize);
                    newMesh.position.copy(newPos);
                    scene.add(newMesh);
                    tile.mesh = newMesh;
                    tile.position.copy(newPos);
                }
            });
            console.log(
                `finsihed replacing tile meshes`,
                performance.measure('load tile meshes', start.name)
            );
        } catch (err) {
            console.error('Failed to load tile models:', err);
        }
    }

    // All base tile manipulation methods
    getTile([x, y]: MapCoords): Tile {
        return this.#tiles[y][x];
    }
    getNeighbors(coords: MapCoords): MapCoords[] {
        const [x, y] = coords;
        const neighbors: MapCoords[] = [];

        if (x < 0 || x >= this.#width || y < 0 || y >= this.#height) {
            return neighbors;
        }

        for (let yy = -1; yy <= 1; yy++) {
            const ny = yy + y;
            if (ny >= 0 && ny < this.#height) {
                for (let xx = -1; xx <= 1; xx++) {
                    const nx = xx + x;
                    if (nx >= 0 && nx < this.#width) {
                        neighbors.push([nx, ny]);
                    }
                }
            }
        }

        return neighbors;
    }
    countNeighborsOfType(coords: MapCoords, target: Terrain): number {
        return this.getNeighbors(coords).reduce((weight, nCoords) => {
            if (this.getTile(nCoords).terrain === target) {
                return weight + 1;
            }
            return weight;
        }, 0);
    }

    // All terrain generation methods
    changeTileType(tile: Tile, type: Terrain) {
        let newMesh: T.Mesh | null = null;

        // Try to use actual model if available
        switch (type) {
            case Terrain.GRASS:
                newMesh = this.#grassModel?.clone() ?? null;
                break;
            case Terrain.MOUNTAIN:
                newMesh = this.#mountainModel?.clone() ?? null;
                break;
            case Terrain.WATER:
                newMesh = this.#waterModel?.clone() ?? null;
                break;
            case Terrain.SAND:
                newMesh = this.#sandModel?.clone() ?? null;
                break;
        }

        // If no model is available, use placeholder
        if (!newMesh) {
            newMesh = new T.Mesh(
                PLACEHOLDER_GEOMETRY,
                PLACEHOLDER_MATERIALS[type]
            );
            newMesh.rotateX(-Math.PI / 2);
        }

        if (tile.mesh?.parent) {
            tile.mesh.parent.remove(tile.mesh);
            tile.mesh.parent.add(newMesh);
        }

        tile.terrain = type;
        tile.mesh = newMesh;
        tile.mesh.position.copy(tile.position);
    }
    #isTerraformerPosValid(former: TerraFormer): boolean {
        return !(
            former.x < 0 ||
            former.y < 0 ||
            former.x >= this.#width ||
            former.y >= this.#height ||
            this.getTile([former.x, former.y]).terrain != Terrain.GRASS
        );
    }
    #terraForm(terrainTarget: Terrain, options?: TerraFormOptions) {
        const { percentCoverage = 0.2, terraformerFactor = 0.02 } =
            options ?? {};
        /* Determine how many terraformers and iterations are needed
         * on the map size and other optional parameters
         */
        let numFormers = 0;
        let numIterations = 0;
        // percentage of the map to be covered with the new tile type
        let percent = this.#width * this.#height * percentCoverage;
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
                former.x = randInt(0, this.#width - 1);
                former.y = randInt(0, this.#height - 1);
            } while (!this.#isTerraformerPosValid(former));
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

                if (this.#isTerraformerPosValid(former)) {
                    newTerrain.push([former.x, former.y]);
                    this.changeTileType(
                        this.getTile([former.x, former.y]),
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
                this.fillInTerrain(newTerrain, Terrain.MOUNTAIN, 4);
                break;
            case Terrain.SAND:
                this.fillInTerrain(newTerrain, Terrain.SAND);
                break;
            case Terrain.WATER:
                this.fillWater(newTerrain);
                break;
            default:
                console.error(`invalid terrain type`);
                break;
        }
    }
    /* For all water tiles check its neighbors and either
     * fill in more water or change to the sand to represent
     * the coast
     */
    fillWater(waterCoords: MapCoords[]) {
        const addedWater: MapCoords[] = [];

        waterCoords.forEach((coords) => {
            this.getNeighbors(coords).forEach((target) => {
                const tile = this.getTile(target);

                // Only change tiles that are not already water or mountain
                if (
                    tile.terrain === Terrain.WATER ||
                    tile.terrain === Terrain.MOUNTAIN
                )
                    return;

                /* based on the number of water tiles surrounding the target
                 * determine if it should be water or coast
                 */
                let waterWeight = this.countNeighborsOfType(
                    target,
                    Terrain.WATER
                );

                // If there is enough water change to water otherwise make it sand
                if (waterWeight >= 5) {
                    this.changeTileType(tile, Terrain.WATER);
                    addedWater.push(target);
                } else {
                    this.changeTileType(tile, Terrain.SAND);
                }
            });
        });

        // recursively check all newly added water
        if (addedWater.length > 0) {
            console.log(
                `fill water making another pass on ${addedWater.length}`
            );
            this.fillWater(addedWater);
        } else {
            console.log(`done filling in water`);
        }
    }
    fillInTerrain(
        mtnCoords: MapCoords[],
        terrain: Terrain,
        factor: number = 5,
        maxPasses: number = 1,
        passes: number = 0
    ) {
        if (passes >= maxPasses) {
            console.log(`done filling in ${terrain} after ${passes} passes`);
            return;
        }

        const updatedTiles: MapCoords[] = [];

        mtnCoords.forEach((coords) => {
            this.getNeighbors(coords).forEach((target) => {
                const tile = this.getTile(target);

                // If this neighbor is already water skip it
                if (tile.terrain === terrain) return;

                /* based on the number of water tiles surrounding the target
                 * determine if it should be water or coast
                 */
                let mtnWeight = this.countNeighborsOfType(target, terrain);

                // If there is enough water change to water otherwise make it sand
                if (mtnWeight >= factor) {
                    this.changeTileType(tile, terrain);
                    updatedTiles.push(target);
                }
            });
        });

        // recursively check all newly added water
        if (updatedTiles.length > 0) {
            console.log(
                `making another pass filling in ${terrain} on ${updatedTiles.length} tiles`
            );
            this.fillInTerrain(
                updatedTiles,
                terrain,
                factor,
                maxPasses,
                passes + 1
            );
        } else {
            console.log(`done filling in ${terrain}`);
        }
    }

    // All rendering methods

    // Add all tiles to the provided or active scene
    addToScene(scene?: T.Scene) {
        this.#modelPromise
            .then(() => {
                const targetScene = scene ?? this.#engine.getActiveScene();
                if (targetScene === null) {
                    console.error(
                        `failed to add map to scene, no scene provided or active scene found`
                    );
                    return;
                }

                this.#tiles.flat().forEach((tile) => {
                    if (tile.mesh !== null) targetScene.add(tile.mesh);
                });

                targetScene.add(sun);
            })
            .catch((err) => {
                console.error(
                    `failed to add map to scene, tile models failed to load`,
                    err
                );
            });
    }

    // All logic methods
    update() {
        const caster = this.#engine.getMouseRaycaster();
        let tempTile: Tile | undefined;

        this.#tiles.flat().forEach((tile) => {
            if (tile.mesh === null) return;
            const isHovered = caster.intersectObject(tile.mesh).length > 0;
            if (isHovered) {
                tempTile = tile;
            }
        });

        if (tempTile !== undefined) {
            this.#hoveredTile = tempTile;
        }
    }

    getHoveredTile(): Tile | null {
        return this.#hoveredTile;
    }
}
