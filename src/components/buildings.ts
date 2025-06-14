import * as T from 'three';

import { Timer, setTimer } from '@libraries/timing';
import { ResourceTypes, addResource, getResource } from '@/game_state';
import { Terrain } from '@/map';
import { getLoadedMesh, addFileExtension } from '@/libraries/resource_loader';

type ResourceList = Array<[ResourceTypes, number]>;

// An interface defining base constructors for all building types
type BuildingConstructor = Readonly<{
    // The resource cost to construct one of these buildings
    readonly cost: ResourceList;
    // Terrain types that this building can be placed on
    readonly validTerrain: Terrain[];
    // Checks the players current resources to see if they can afford the building
    checkCost: () => boolean;
    // Subtract the cost of the building from the player's resources and
    // return a new instance of the building
    build: (position: T.Vector3) => Building;
}>;

const addGltf = addFileExtension('gltf');

export abstract class Building {
    protected incomeTimer: Timer;
    protected income: ResourceList = [[ResourceTypes.MINERALS, 0]];
    protected speed: number = 1500;

    protected mesh: T.Mesh;

    protected isActive: boolean = true;
    protected exclamationMesh: T.Mesh | null = null;

    constructor(mesh: T.Mesh, position: T.Vector3) {
        this.mesh = mesh;
        this.mesh.position.copy(position);

        this.incomeTimer = setTimer(this.speed);

        this.exclamationMesh = getLoadedMesh(addGltf('exclamation')).clone();

        this.exclamationMesh.visible = !this.isActive;
        this.exclamationMesh.scale.set(1.5, 1.5, 1.5);
        this.exclamationMesh.position.copy(position);
        this.exclamationMesh.position.add(new T.Vector3(0, 20, 0));

        if (this.mesh.parent) {
            this.mesh.parent.add(this.exclamationMesh);
        }
    }
    update() {
        if (this.incomeTimer.isDone()) {
            this.incomeTimer.reset();
            updateResources(this.income);
        }
    }
    addToScene(scene: T.Scene) {
        scene.add(this.mesh);
        if (this.exclamationMesh !== null) {
            scene.add(this.exclamationMesh);
        }
    }

    protected setActive(active: boolean) {
        this.isActive = active;
        if (this.exclamationMesh !== null) {
            this.exclamationMesh.visible = !this.isActive;
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
        const mineMesh = getLoadedMesh(addGltf('mine'));
        super(mineMesh.clone(), position);

        this.income = [[ResourceTypes.MINERALS, 10]];
    }

    update(): void {
        // Only update income if the player has enough food to maintain the mine
        if (this.incomeTimer.isDone()) {
            if (this.#isProcessing) {
                this.#isProcessing = false;
                super.update();
            } else {
                if (checkCost(this.#upkeepCost)) {
                    this.#isProcessing = true;
                    updateResources(this.#upkeepCost, -1);
                    this.setActive(true);
                } else {
                    this.setActive(false);
                }
                this.incomeTimer.reset();
            }
        }
    }
}

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
        const farmMesh = getLoadedMesh(addGltf('farm'));
        super(farmMesh.clone(), position);

        this.income = [[ResourceTypes.FOOD, 1]];
    }
}
