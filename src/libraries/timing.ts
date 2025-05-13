export type Timer = {
    id: string;
    elapsed: number;
    duration: number;
    isDone: boolean;
};

let timers = new Map<string, Timer>();

/* Sets a timer for the given duration in milliseconds
 * and returns a reference to the timer object.
 * The timer is automatically added to the list of active timers
 * and handled by the updateTimers function.
 */
export function setTimer(duration: number) {
    const timer: Timer = {
        id: crypto.randomUUID(),
        elapsed: 0,
        duration,
        isDone: false,
    };

    timers.set(timer.id, timer);

    return timer;
}

/* Updates all active timers cleaning up those that
 * haved reached their duration on the next frame.
 * This should be the first update call in the game loop
 */
export function updateTimers(deltaTime: number) {
    if (timers.size === 0) return;

    timers.forEach((timer) => {
        // remove all timers that have already reached their duration
        if (!timer.isDone) {
            timer.elapsed += deltaTime;
            // Update a timer's isDone state but don't remove it this frame
            if (timer.elapsed >= timer.duration) {
                timer.isDone = true;
            }
        }
    });
}

export function resetTimer(timer: Timer) {
    timer.elapsed = 0;
    timer.isDone = false;

    return timer;
}

export function removeTimer(timer: Timer) {
    if (timers.has(timer.id)) {
        timers.delete(timer.id);
    } else {
        console.warn(`Timer with id ${timer.id} not found`);
    }
}

window.checkTimers = () => {
    console.log(`checking timers: ${timers.size}`);
    timers.forEach((timer) => {
        console.log(
            `Timer[${timer.id}]: ${timer.elapsed}/${timer.duration} - ${timer.isDone}`
        );
    });
};
