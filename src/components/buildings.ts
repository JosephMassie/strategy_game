import * as T from 'three';

import { Timer, resetTimer, setTimer } from '@libraries/timing';
import { ResourceTypes, addResource, getResource } from '@/game_state';
import { Terrain } from '@/map';

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
    build: () => Building;
};

export abstract class Building extends T.Mesh {
    protected incomeTimer: Timer;
    protected income: ResourceList = [[ResourceTypes.MINERALS, 0]];
    protected speed: number = 1000;

    constructor(geometry: T.BufferGeometry, material: T.Material) {
        super(geometry, material);

        this.incomeTimer = setTimer(this.speed);
    }
    update() {
        if (this.incomeTimer.isDone) {
            resetTimer(this.incomeTimer);
            updateResources(this.income);
        }
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
const mineGeometry = new T.BoxGeometry(1, 3.25, 1.5);
const mineMaterial = new T.MeshBasicMaterial({ color: 0x040404 });
const mineInactiveMaterial = new T.MeshBasicMaterial({ color: 0x888888 });

export const mineConstructor: BuildingConstructor = {
    cost: [[ResourceTypes.MINERALS, 20]],
    validTerrain: [Terrain.MOUNTAIN],
    checkCost() {
        return checkCost(this.cost);
    },
    build() {
        updateResources(this.cost, -1);
        return new Mine();
    },
};

export class Mine extends Building {
    #isProcessing = false;
    #upkeepCost: ResourceList = [[ResourceTypes.FOOD, 5]];
    constructor() {
        super(mineGeometry, mineMaterial);

        this.income = [[ResourceTypes.MINERALS, 10]];
    }

    update(): void {
        // Only update income if the player has enough food to maintain the mine
        if (this.incomeTimer.isDone) {
            if (this.#isProcessing) {
                this.#isProcessing = false;
                super.update();

                if (!checkCost(this.#upkeepCost)) {
                    this.material = mineInactiveMaterial;
                }
            } else {
                if (checkCost(this.#upkeepCost)) {
                    this.#isProcessing = true;
                    updateResources(this.#upkeepCost, -1);
                    this.material = mineMaterial;
                } else {
                    // If the player doesn't have enough food, set the mine to inactive
                    this.material = mineInactiveMaterial;
                }
                resetTimer(this.incomeTimer);
            }
        }
    }
}

// Farms
const farmGeometry = new T.BoxGeometry(2, 1.25, 3.5);
const farmMaterial = new T.MeshBasicMaterial({ color: 0xf0f000 });

export const farmConstructor: BuildingConstructor = {
    cost: [[ResourceTypes.MINERALS, 5]],
    validTerrain: [Terrain.GRASS],
    checkCost() {
        return checkCost(this.cost);
    },
    build() {
        updateResources(this.cost, -1);
        return new Farm();
    },
};

export class Farm extends Building {
    constructor() {
        super(farmGeometry, farmMaterial);

        this.income = [[ResourceTypes.FOOD, 1]];
    }
}
