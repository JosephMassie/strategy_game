const keyState: Record<string, boolean> = {};

function processKeyPress(event: KeyboardEvent) {
    keyState[event.key] = true;
    console.log('key state', keyState);
}

function processKeyRelease(event: KeyboardEvent) {
    keyState[event.key] = false;
    console.log('key state', keyState);
}

export type InputHanlder = {
    initialize: (target: HTMLElement) => void;
    isKeyDown: (key: string) => boolean;
};

export const input: InputHanlder = {
    initialize: (target: HTMLElement) => {
        target.addEventListener('keydown', processKeyPress);
        target.addEventListener('keyup', processKeyRelease);
    },

    isKeyDown: (key: string) => {
        return keyState[key] === true;
    },
};
