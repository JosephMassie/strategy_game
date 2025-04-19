import * as T from 'three';
import { Text } from 'troika-three-text';

import { randInt } from './libs/core';
import GameEngine from './libs/game_engine';
//import { OutlinePass } from 'three/examples/jsm/Addons.js';

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

export default class LvlMap {
    #engine: GameEngine;
    //#outlineShader: OutlinePass;

    #width: number;
    #height: number;
    #tileSize: number;
    #tiles: Tile[][];
    #hoveredTile: Tile | null = null;
    #hoverText: Text;

    constructor(
        engine: GameEngine,
        width: number,
        height: number,
        tileSize: number = 4,
        startPos: T.Vector3 = new T.Vector3(0, 0, 0)
    ) {
        const baseTileGeo = this.#makeBaseTile();

        console.log(`generating ${width}x${height} map`);

        this.#engine = engine;
        /* this.#outlineShader = engine.createOutlineShader()!;
        this.#outlineShader.edgeGlow = 1;
        this.#outlineShader.edgeStrength = 8;
        this.#outlineShader.edgeThickness = 8;
        this.#outlineShader.pulsePeriod = 3;
        this.#outlineShader.visibleEdgeColor = new T.Color(
            'hsl(295, 98.30%, 52.90%)'
        );
        this.#outlineShader.visibleEdgeColor = new T.Color(
            'hsl(295, 98.30%, 52.90%)'
        ); */

        this.#width = width;
        this.#height = height;
        this.#tileSize = tileSize;
        this.#tiles = Array(height).fill([]);

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
                    const mesh = new T.Mesh(baseTileGeo, grassMat);
                    mesh.position.add(position);

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

        const hoverText = new Text();
        this.#hoverText = hoverText;
        hoverText.fontSize = 20;
        hoverText.anchorX = 'left';
        hoverText.anchorY = 'top';
        hoverText.position.set(
            -window.innerWidth / 2 + 10,
            window.innerHeight / 2 - 10,
            2
        );
        hoverText.layers.set(1);
        hoverText.text = 'Currently hovering over: ...';

        const hud = engine.getActiveHudScene();
        if (hud !== null) {
            hud.add(hoverText);
            hoverText.sync();
        }
        engine.whenResized((width, height) => {
            hoverText.position.set(-width / 2 + 10, height / 2 - 10, 2);
            hoverText.sync();
        });
    }

    // internal only helpers
    #makeBaseTile(): T.BoxGeometry {
        const box = new T.BoxGeometry(this.#tileSize, 0.1, this.#tileSize);
        return box;
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
        const targetScene = scene ?? this.#engine.getActiveScene();
        if (targetScene === null) {
            console.error(
                `failed to add map to scene, no scene provided or active scene found`
            );
            return;
        }

        this.#tiles.flat().forEach((tile) => {
            targetScene.add(tile.mesh);
        });
    }

    // All logic methods
    update() {
        const caster = this.#engine.getMouseRaycaster();
        let tempTile: Tile | undefined;

        this.#tiles.flat().forEach((tile) => {
            const isHovered = caster.intersectObject(tile.mesh).length > 0;
            if (isHovered) {
                tempTile = tile;
            }
        });

        if (tempTile !== undefined) {
            this.#hoveredTile = tempTile;
            const terrainType = Terrain[this.#hoveredTile.terrain];
            this.#hoverText.text = `Currently hovering over: ${terrainType}`;
        } else {
            this.#hoveredTile = null;
            this.#hoverText.text = `Currently hovering over: ...`;
        }
        this.#hoverText.sync();
    }
}
