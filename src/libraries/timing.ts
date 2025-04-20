export type Timer = {
    elapsed: number;
    duration: number;
    isDone: boolean;
};

let timers: Array<Timer> = [];

/* Sets a timer for the given duration in milliseconds
 * and returns a reference to the timer object.
 * The timer is automatically added to the list of active timers
 * and handled by the updateTimers function.
 */
export function setTimer(duration: number) {
    const timer: Timer = {
        elapsed: 0,
        duration,
        isDone: false,
    };
    timers.push(timer);
    return timer;
}

/* Updates all active timers cleaning up those that
 * haved reached their duration on the next frame.
 * This should be the first update call in the game loop
 */
export function updateTimers(deltaTime: number) {
    if (timers.length === 0) return;

    timers = timers.filter((timer) => {
        // remove all timers that have already reached their duration
        if (timer.isDone) return false;

        timer.elapsed += deltaTime;
        // Update a timer's isDone state but don't remove it this frame
        if (timer.elapsed >= timer.duration) {
            timer.isDone = true;
        }
        return true;
    });
}

export function resetTimer(timer: Timer) {
    timer.elapsed = 0;
    timer.isDone = false;
    return timer;
}

export function removeTimer(timer: Timer) {
    timers = timers.filter((t) => t !== timer);
}
