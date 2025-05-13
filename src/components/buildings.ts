import * as T from 'three';

import { Timer, resetTimer, setTimer } from '@libraries/timing';
import { ResourceTypes, addResource, getResource } from '@/game_state';
import { Terrain } from '@/map';
import { loadMesh } from '@/libraries/resource_loader';

type ResourceList = Array<[ResourceTypes, number]>;

// An interface defining base constructors for all building types
type BuildingConstructor = {
    // The resource cost to construct one of these buildings
    readonly cost: ResourceList;
    // Terrain types that this building can be placed on
    readonly validTerrain: Terrain[];
    // Checks the players current resources to see if they can afford the building
    checkCost: () => boolean;
    // Subtract the cost of the building from the player's resources and
    // return a new instance of the building
    build: (position: T.Vector3) => Building;
};

export abstract class Building {
    protected incomeTimer: Timer;
    protected income: ResourceList = [[ResourceTypes.MINERALS, 0]];
    protected speed: number = 1000;
    protected mesh: T.Mesh;

    constructor(mesh: T.Mesh, position: T.Vector3) {
        this.mesh = mesh;
        this.mesh.position.copy(position);

        this.incomeTimer = setTimer(this.speed);
    }
    update() {
        if (this.incomeTimer.isDone) {
            resetTimer(this.incomeTimer);
            updateResources(this.income);
        }
    }
    addToScene(scene: T.Scene) {
        scene.add(this.mesh);
    }
}

const checkCost = (costs: ResourceList) =>
    costs.every(([type, amount]) => getResource(type) - amount >= 0);
// update the player's resources based on the provided resource list and the given modifier
const updateResources = (costs: ResourceList, modifier: number = 1) => {
    costs.forEach(([type, amount]) => {
        addResource(type, amount * modifier);
    });
};

// Mines

export const mineConstructor: BuildingConstructor = {
    cost: [[ResourceTypes.MINERALS, 20]],
    validTerrain: [Terrain.MOUNTAIN],
    checkCost() {
        return checkCost(this.cost);
    },
    build(position: T.Vector3) {
        updateResources(this.cost, -1);
        return new Mine(position);
    },
};

export class Mine extends Building {
    #isProcessing = false;
    #upkeepCost: ResourceList = [[ResourceTypes.FOOD, 5]];

    constructor(position: T.Vector3) {
        super(
            new T.Mesh(
                new T.BoxGeometry(10, 10, 10),
                new T.MeshBasicMaterial({ color: 0x00ff00 })
            ),
            position
        );

        loadMesh('/mine.gltf').then((model) => {
            const scene = this.mesh.parent;
            scene?.remove(this.mesh);
            this.mesh = model.clone();
            scene?.add(this.mesh);
            this.mesh.position.copy(position);
        });

        this.income = [[ResourceTypes.MINERALS, 10]];
    }

    update(): void {
        // Only update income if the player has enough food to maintain the mine
        if (this.incomeTimer.isDone) {
            if (this.#isProcessing) {
                this.#isProcessing = false;
                super.update();
            } else {
                if (checkCost(this.#upkeepCost)) {
                    this.#isProcessing = true;
                    updateResources(this.#upkeepCost, -1);
                }
                resetTimer(this.incomeTimer);
            }
        }
    }
}

// Farms
const farmGeometry = new T.BoxGeometry(4, 3.25, 8.5);
const farmMaterial = new T.MeshBasicMaterial({ color: 0xf0f000 });

export const farmConstructor: BuildingConstructor = {
    cost: [[ResourceTypes.MINERALS, 5]],
    validTerrain: [Terrain.GRASS],
    checkCost() {
        return checkCost(this.cost);
    },
    build(position: T.Vector3) {
        updateResources(this.cost, -1);
        return new Farm(position);
    },
};

export class Farm extends Building {
    constructor(position: T.Vector3) {
        super(new T.Mesh(farmGeometry, farmMaterial), position);

        loadMesh('/farm.gltf').then((model) => {
            const scene = this.mesh.parent;
            scene?.remove(this.mesh);
            this.mesh = model.clone();
            scene?.add(this.mesh);
            this.mesh.position.copy(position);
        });

        this.income = [[ResourceTypes.FOOD, 1]];
    }
}
