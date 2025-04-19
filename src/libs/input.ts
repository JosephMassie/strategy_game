import * as T from 'three';

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

export enum KeyStates {
    PRESSED = 0,
    HELD = 1,
    RELEASED = 2,
    NONE = 3,
}

type KeyStateRecord = Record<string, KeyStates>;

let canvas: HTMLCanvasElement | null = null;

let prevKeyState: KeyStateRecord | null = null;
let curKeyState: KeyStateRecord = {};

const mousePos = new T.Vector2(-Infinity, -Infinity);

function processKeyPress(event: KeyboardEvent) {
    if (!event.repeat) {
        curKeyState[event.key] = KeyStates.PRESSED;
        console.log(`key pressed`, event.key);
    } else {
        console.log(`key held`, event.key);
    }
}

function processKeyRelease(event: KeyboardEvent) {
    if (event.repeat === false) {
        curKeyState[event.key] = KeyStates.RELEASED;
        console.log(`key released`, event.key);
    }
}

function processMouseButtonPress(event: MouseEvent) {
    curKeyState[event.button] = KeyStates.PRESSED;
    console.log(`mouse clicked`, MouseButton[event.button]);
}
function processMouseButtonRelease(event: MouseEvent) {
    curKeyState[event.button] = KeyStates.RELEASED;
    console.log(`mouse released`, MouseButton[event.button]);
}
function processMouseMove(event: MouseEvent) {
    mousePos.set(event.clientX, event.clientY);
}

export type InputHandler = {
    initialize: (target: HTMLCanvasElement) => void;
    deInitialize: () => void;
    update: () => void;
    isKeyDown: (key: string) => boolean;
    wasKeyPressed: (key: string) => boolean;
    isMouseButtonDown: (button: MouseButton) => boolean;
    getMousePos: () => T.Vector2;
    toCanvasCoords: (
        browserScreenPos: T.Vector2,
        normalize?: boolean
    ) => T.Vector2;
};

export const input: InputHandler = {
    initialize: (target: HTMLCanvasElement) => {
        canvas = target;
        canvas.addEventListener('keydown', processKeyPress);
        canvas.addEventListener('keyup', processKeyRelease);
        canvas.addEventListener('mousedown', processMouseButtonPress);
        canvas.addEventListener('mouseup', processMouseButtonRelease);
        window.addEventListener('mousemove', processMouseMove);
    },

    deInitialize: () => {
        canvas?.removeEventListener('keydown', processKeyPress);
        canvas?.removeEventListener('keyup', processKeyRelease);
        canvas?.removeEventListener('mousedown', processMouseButtonPress);
        canvas?.removeEventListener('mouseup', processMouseButtonRelease);
        window.removeEventListener('mousemove', processMouseMove);
        canvas = null;

        for (const key in curKeyState) {
            curKeyState[key] = KeyStates.NONE;
        }
    },

    update: () => {
        // update key states if they differ from the previous state
        if (prevKeyState !== null) {
            for (const key in prevKeyState) {
                if (key in curKeyState) {
                    const curKey = curKeyState[key];
                    const prevKey = prevKeyState[key];

                    // If a key was pressed last frame update it to held
                    if (
                        curKey === KeyStates.PRESSED &&
                        prevKey === KeyStates.PRESSED
                    ) {
                        console.log(`updating ${key} to held`);
                        curKeyState[key] = KeyStates.HELD;
                    }

                    // If a key was released last frame update it to none
                    if (
                        curKey === KeyStates.RELEASED &&
                        prevKey === KeyStates.RELEASED
                    ) {
                        console.log(`updating ${key} to none`);
                        curKeyState[key] = KeyStates.NONE;
                    }
                }
            }
        }

        // store the current key state as the previous state
        prevKeyState = { ...curKeyState };
    },

    isKeyDown: (key: string) => {
        return (
            curKeyState[key] === KeyStates.PRESSED ||
            curKeyState[key] === KeyStates.HELD
        );
    },
    wasKeyPressed: (key: string) => {
        return curKeyState[key] === KeyStates.PRESSED;
    },

    isMouseButtonDown: (button: MouseButton) => {
        return (
            curKeyState[button] === KeyStates.PRESSED ||
            curKeyState[button] === KeyStates.HELD
        );
    },

    getMousePos: () => {
        return mousePos;
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
