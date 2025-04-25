import * as T from 'three';

import { INPUT_TAP_COOLDOWN } from '@/constants';
import { Timer, removeTimer, resetTimer, setTimer } from '@libraries/timing';

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

export enum InputStates {
    PRESSED = 0,
    HELD = 1,
    RELEASED = 2,
    NONE = 3,
}

type InputStateRecord = Record<string, InputStates>;

let canvas: HTMLCanvasElement | null = null;

let prevInputState: InputStateRecord | null = null;
let curInputState: InputStateRecord = {};
let inputTimers: Record<string, Timer> = {};

let isInitialized = false;

const mousePos = new T.Vector2(-Infinity, -Infinity);
let mouseWheelDelta = 0;
let scrollTimer: Timer | null = null;

function processKeyPress(event: KeyboardEvent) {
    if (!event.repeat) {
        curInputState[event.key] = InputStates.PRESSED;
    }
}

function processKeyRelease(event: KeyboardEvent) {
    if (event.repeat === false) {
        curInputState[event.key] = InputStates.RELEASED;
    }
}

function processMouseButtonPress(event: MouseEvent) {
    curInputState[event.button] = InputStates.PRESSED;
}
function processMouseButtonRelease(event: MouseEvent) {
    curInputState[event.button] = InputStates.RELEASED;
}
function processMouseMove(event: MouseEvent) {
    mousePos.set(event.clientX, event.clientY);
}
function processMouseWheel(event: WheelEvent) {
    mouseWheelDelta = event.deltaY;
    if (!scrollTimer) {
        scrollTimer = setTimer(INPUT_TAP_COOLDOWN);
    } else {
        resetTimer(scrollTimer);
    }
}

export type InputHandler = {
    initialize: (target?: HTMLCanvasElement) => void;
    deInitialize: () => void;
    update: () => void;
    isKeyDown: (key: string) => boolean;
    isKeyPressed: (key: string) => boolean;
    isKeyReleased: (key: string) => boolean;
    wasKeyPressedButNotHeld: (key: string) => boolean;
    isMouseButtonDown: (button: MouseButton) => boolean;
    isMouseButtonPressed: (button: MouseButton) => boolean;
    isMouseButtonReleased: (button: MouseButton) => boolean;
    wasMouseButtonPressedButNotHeld: (button: MouseButton) => boolean;
    getMouseWheelDelta: () => number;
    getMousePos: () => T.Vector2;
    toCanvasCoords: (
        browserScreenPos: T.Vector2,
        normalize?: boolean
    ) => T.Vector2;
};

export const input: InputHandler = {
    initialize: (target?: HTMLCanvasElement) => {
        if (isInitialized) return;
        isInitialized = true;

        canvas = target ?? document.querySelector('canvas') ?? null;
        if (!canvas) {
            throw new Error("can't initialize input handler without canvas");
        }
        canvas.addEventListener('keydown', processKeyPress);
        canvas.addEventListener('keyup', processKeyRelease);
        canvas.addEventListener('mousedown', processMouseButtonPress);
        canvas.addEventListener('mouseup', processMouseButtonRelease);
        canvas.addEventListener('wheel', processMouseWheel);
        window.addEventListener('mousemove', processMouseMove);
    },

    deInitialize: () => {
        canvas?.removeEventListener('keydown', processKeyPress);
        canvas?.removeEventListener('keyup', processKeyRelease);
        canvas?.removeEventListener('mousedown', processMouseButtonPress);
        canvas?.removeEventListener('mouseup', processMouseButtonRelease);
        canvas?.removeEventListener('wheel', processMouseWheel);
        window.removeEventListener('mousemove', processMouseMove);
        canvas = null;

        for (const key in curInputState) {
            curInputState[key] = InputStates.NONE;
        }
    },

    update: () => {
        // update key states if they differ from the previous state
        if (prevInputState !== null) {
            for (const key in prevInputState) {
                if (key in curInputState) {
                    const curKey = curInputState[key];
                    const prevKey = prevInputState[key];

                    // If a key was pressed last frame update it to held
                    if (
                        curKey === InputStates.PRESSED &&
                        prevKey === InputStates.PRESSED
                    ) {
                        curInputState[key] = InputStates.HELD;
                    }

                    // If a key was released last frame update it to none
                    if (
                        curKey === InputStates.RELEASED &&
                        prevKey === InputStates.RELEASED
                    ) {
                        curInputState[key] = InputStates.NONE;
                    }
                }
            }
        }

        // store the current key state as the previous state
        prevInputState = { ...curInputState };

        // reset the mouse wheel delta when a user stops scrolling
        if (scrollTimer?.isDone) {
            mouseWheelDelta = 0;
        }
    },

    isKeyDown: (key: string) => {
        return (
            curInputState[key] === InputStates.PRESSED ||
            curInputState[key] === InputStates.HELD
        );
    },
    isKeyPressed: (key: string) => {
        return curInputState[key] === InputStates.PRESSED;
    },
    isKeyReleased: (key: string) => {
        return curInputState[key] === InputStates.RELEASED;
    },
    wasKeyPressedButNotHeld(key: string): boolean {
        if (this.isKeyPressed(key)) {
            console.log('button pressed');
            if (key in inputTimers) {
                resetTimer(inputTimers[key]);
            } else {
                inputTimers[key] = setTimer(INPUT_TAP_COOLDOWN);
            }
            return false;
        }

        if (this.isKeyReleased(key)) {
            if (key in inputTimers) {
                const timer = inputTimers[key];
                removeTimer(timer);
                if (!timer.isDone) {
                    return true;
                }
                delete inputTimers[key];
            }
        }

        if (key in inputTimers) {
            const timer = inputTimers[key];
            if (timer.isDone) {
                delete inputTimers[key];
                return !this.isKeyDown(key);
            }
        }

        return false;
    },

    isMouseButtonDown: (button: MouseButton) => {
        return (
            curInputState[button] === InputStates.PRESSED ||
            curInputState[button] === InputStates.HELD
        );
    },
    isMouseButtonPressed: (button: MouseButton) => {
        return curInputState[button] === InputStates.PRESSED;
    },
    isMouseButtonReleased: (button: MouseButton) => {
        return curInputState[button] === InputStates.RELEASED;
    },
    wasMouseButtonPressedButNotHeld(button: MouseButton): boolean {
        if (this.isMouseButtonPressed(button)) {
            if (button in inputTimers) {
                resetTimer(inputTimers[button]);
            } else {
                inputTimers[button] = setTimer(INPUT_TAP_COOLDOWN);
            }
            return false;
        }

        if (this.isMouseButtonReleased(button)) {
            if (button in inputTimers) {
                const timer = inputTimers[button];
                removeTimer(timer);
                delete inputTimers[button];
                return true;
            }
        }

        if (button in inputTimers) {
            const timer = inputTimers[button];
            if (timer.isDone) {
                delete inputTimers[button];
                return !this.isMouseButtonDown(button);
            }
        }

        return false;
    },

    getMousePos: () => {
        return mousePos;
    },
    getMouseWheelDelta: () => {
        return mouseWheelDelta;
    },

    /* converts normal web browser screen coordinates
     * where [0, 0] is the top left corner to a normalized
     * coordinate system where [0, 0] is the center of the
     * screen and [-1, -1] is the bottom left corner
     *
     * This can be converterd to HUD coordinates by passing
     * normalize = false
     *
     * @param browserScreenPos - the position to convert
     *     defaults to the current mouse position if not
     *     provided or null
     * @param normalize - whether to normalize the coordinates
     *     defaults to true
     * @return the normalized coordinates
     *
     * @throws Error if the canvas is not initialized
     */
    toCanvasCoords: (
        browserScreenPos?: T.Vector2 | null,
        normalize = true
    ): T.Vector2 => {
        if (!canvas) {
            throw new Error('Canvas is not initialized');
        }

        const target = browserScreenPos ?? mousePos;
        const worldPos = target.clone();

        worldPos.x = (worldPos.x / canvas.width) * 2 - 1;
        worldPos.y = (worldPos.y / canvas.height) * -2 + 1;

        if (normalize === false) {
            worldPos.multiply(
                new T.Vector2(canvas.width / 2, canvas.height / 2)
            );
        }

        return worldPos;
    },
};
