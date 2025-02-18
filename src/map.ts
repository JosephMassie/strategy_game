import * as T from 'three';

import { randInt } from './libs/core';

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

const makeBaseBox = (map: Map) =>
    new T.BoxGeometry(map.tileSize, 1, map.tileSize);

const isTerraformerPosValid = (map: Map, former: TerraFormer) =>
    !(
        former.x < 0 ||
        former.y < 0 ||
        former.x >= map.width ||
        former.y >= map.height ||
        map.tiles[former.y][former.x]?.terrain != Terrain.GRASS
    );

function terraForm(map: Map, terrainTarget: Terrain) {
    //const newTerrain = [];
    //const tempNeighbors = [];
    //const nonTarget = [];

    let numFormers = 0;
    let numIterations = 0;
    //let augment = 0.0;

    let percent = map.width * map.height * 0.2;
    numFormers = Math.round(percent * 0.02);
    numIterations = Math.round(percent / numFormers);

    if (numFormers <= 0) {
        numIterations = 0;
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

    for (let i = 0; i < numIterations; i++) {
        terraformers.forEach((former) => {
            // choose a random facing
            former.facing = randInt(0, 7);

            //if (former.facing < 0) former.facing += 15;
            //if (former.facing > 15) former.facing -= 15;

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
                let nMaterial = grassMat;
                // change tille type
                switch (terrainTarget) {
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

                map.tiles[former.y][former.x].mesh.material = nMaterial;
            } else {
                // reset position
                former.x = former.oldX;
                former.y = former.oldY;
            }
        });
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
        addToScene: function (scene: T.Scene) {
            this.tiles.forEach((row) => {
                row.forEach((tile) => {
                    scene.add(tile.mesh);
                });
            });
        },
        tiles: Array(height).fill([]),
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

    terraForm(map, Terrain.MOUNTAIN);
    terraForm(map, Terrain.SAND);
    terraForm(map, Terrain.WATER);

    return map;
}
