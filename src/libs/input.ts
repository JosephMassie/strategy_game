import * as T from 'three';

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

let canvas: HTMLCanvasElement | null = null;
const keyState: Record<string, boolean> = {};
const mousePos = new T.Vector2(-Infinity, -Infinity);

function processKeyPress(event: KeyboardEvent) {
    keyState[event.key] = true;
}

function processKeyRelease(event: KeyboardEvent) {
    keyState[event.key] = false;
}

function processMouseButtonPress(event: MouseEvent) {
    keyState[event.button] = true;
    console.log(`mouse clicked`, MouseButton[event.button]);
}
function processMouseButtonRelease(event: MouseEvent) {
    keyState[event.button] = false;
    console.log(`mouse released`, MouseButton[event.button]);
}
function processMouseMove(event: MouseEvent) {
    mousePos.set(event.clientX, event.clientY);
}

export type InputHandler = {
    initialize: (target: HTMLCanvasElement) => void;
    cleanUp: () => void;
    isKeyDown: (key: string) => boolean;
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

    cleanUp: () => {
        canvas?.removeEventListener('keydown', processKeyPress);
        canvas?.removeEventListener('keyup', processKeyRelease);
        canvas?.removeEventListener('mousedown', processMouseButtonPress);
        canvas?.removeEventListener('mouseup', processMouseButtonRelease);
        window.removeEventListener('mousemove', processMouseMove);
        canvas = null;

        for (const key in keyState) {
            keyState[key] = false;
        }
    },

    isKeyDown: (key: string) => {
        return keyState[key] === true;
    },

    isMouseButtonDown: (button: MouseButton) => {
        return keyState[button] === true;
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
     */
    toCanvasCoords: (
        browserScreenPos?: T.Vector2,
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
