export type Timer = {
    reset: () => void;
    getId: () => string;
    isDone: () => boolean;
    update: (deltaTime: number) => void;
};

class TimerClass implements Timer {
    private id: string;
    private elapsed: number = 0;
    private duration: number;
    private active: boolean = true;

    constructor(duration: number) {
        this.id = crypto.randomUUID();
        this.duration = duration;
    }

    reset() {
        this.elapsed = 0;
        this.active = true;
    }

    update(deltaTime: number) {
        if (!this.active) return;

        this.elapsed += deltaTime;

        if (this.elapsed >= this.duration) {
            this.active = false;
        }
    }

    getId() {
        return this.id;
    }

    isDone() {
        return !this.active;
    }

    toString() {
        return `Timer[${this.id}]: ${this.elapsed}/${
            this.duration
        } - ${this.isDone()}`;
    }
}

let timers = new Map<string, Timer>();

/* Sets a timer for the given duration in milliseconds
 * and returns a reference to the timer object.
 * The timer is automatically added to the list of active timers
 * and handled by the updateTimers function.
 */
export function setTimer(duration: number) {
    const timer = new TimerClass(duration);

    timers.set(timer.getId(), timer);

    return timer;
}

/* Updates all active timers cleaning up those that
 * haved reached their duration on the next frame.
 * This should be the first update call in the game loop
 */
export function updateTimers(deltaTime: number) {
    if (timers.size === 0) return;

    timers.forEach((timer) => {
        timer.update(deltaTime);
    });
}

export function removeTimer(timer: Timer): boolean {
    const id = timer.getId();
    if (!timers.has(id)) {
        console.warn(`Timer with id ${id} not found`);
        return false;
    }

    timers.delete(id);
    return true;
}

window.checkTimers = () => {
    console.log(`checking timers: ${timers.size}`);
    timers.forEach((timer) => {
        console.log(timer.toString());
    });
};
