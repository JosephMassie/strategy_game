export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

const keyState: Record<string, boolean> = {};

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

export type InputHanlder = {
    initialize: (target: HTMLElement) => void;
    isKeyDown: (key: string) => boolean;
    isMouseButtonDown: (button: MouseButton) => boolean;
};

export const input: InputHanlder = {
    initialize: (target: HTMLElement) => {
        target.addEventListener('keydown', processKeyPress);
        target.addEventListener('keyup', processKeyRelease);
        target.addEventListener('mousedown', processMouseButtonPress);
        target.addEventListener('mouseup', processMouseButtonRelease);
    },

    isKeyDown: (key: string) => {
        return keyState[key] === true;
    },

    isMouseButtonDown: (button: MouseButton) => {
        return keyState[button] === true;
    },
};
