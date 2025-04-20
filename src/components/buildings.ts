import * as T from 'three';

import { BUILDING_INCOME, BUILDING_SPEED } from '@/constants';
import { Timer, resetTimer, setTimer } from '@libraries/timing';
import { addMinerals } from '@/game_state';

export abstract class Building extends T.Mesh {
    abstract update(): void;
}

const mineGeometry = new T.BoxGeometry(1, 3.25, 1.5);
const mineMaterial = new T.MeshBasicMaterial({ color: 0x040404 });

export class Mine extends Building {
    incomeTimer: Timer;
    #income = BUILDING_INCOME.mine;

    constructor() {
        super(mineGeometry, mineMaterial);

        this.incomeTimer = setTimer(BUILDING_SPEED);
    }

    update() {
        if (this.incomeTimer.isDone) {
            resetTimer(this.incomeTimer);
            addMinerals(this.#income);
        }
    }
}
