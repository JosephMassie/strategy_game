import { input, MouseButton } from './input';
//import getGameEngine, { GameEngine } from './game_engine';

export type HudElement = {
    getId: () => string;
    getBoundingRect: () => {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    hoverAction?: () => void;
    clickAction?: (button: MouseButton) => void;
};

//let engine: GameEngine;
const elements = new Map<string, HudElement>();

const Hud = {
    initialize() {
        //engine = getGameEngine();
    },
    update() {
        let intersected = false;
        const mpos = input.toCanvasCoords(undefined, false);

        elements.forEach((element) => {
            const { top, bottom, left, right } = element.getBoundingRect();

            if (
                mpos.x >= Math.min(left, right) &&
                mpos.x <= Math.max(left, right) &&
                mpos.y >= Math.min(bottom, top) &&
                mpos.y <= Math.max(bottom, top)
            ) {
                intersected = true;

                if (element.clickAction) {
                    Object.values(MouseButton)
                        .filter((v) => typeof v === 'number')
                        .forEach((btn) => {
                            if (input.isMouseButtonPressed(btn)) {
                                element.clickAction!(btn);
                            }
                        });
                }
            }
        });

        return intersected;
    },
    addToHud(element: HudElement) {
        const id = element.getId();
        console.log(`adding hud element`, element, id);

        if (elements.has(id)) return;

        elements.set(id, element);
    },
};

export default Hud;
