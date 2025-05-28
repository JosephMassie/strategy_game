import * as T from 'three';
import { generateUUID } from 'three/src/math/MathUtils.js';
import { Text } from 'troika-three-text';

import getGameEngine from '@/libraries/game_engine';
import Hud, { HudElement } from '@/libraries/hud';
import { MouseButton } from '@/libraries/input';

type ButtonOptions = {
    width: number;
    height: number;
    relativeScreenPos: T.Vector2;
    text?: string;
};

function relScreenToActual(rel: T.Vector2, depth: number = -1): T.Vector3 {
    const halfScreenWidth = innerWidth / 2;
    const halfScreenHeight = innerHeight / 2;

    return new T.Vector3(
        halfScreenWidth * rel.x,
        halfScreenHeight * rel.y,
        depth
    );
}

const posOrNeg = (num: number): number => (num > 0 ? -1 : 1);

export default class Button implements HudElement {
    #id: string;
    #engine = getGameEngine();
    #txtObj: Text;
    #backDrop: T.Mesh;
    #relScreenPos: T.Vector2;
    #depth = 1;
    #width: number;
    #height: number;

    onHover: undefined | ((isHovered?: boolean) => void);
    onClick: undefined | ((mbutton: MouseButton) => void);

    constructor(options: ButtonOptions) {
        this.#id = generateUUID();

        const { width, height, relativeScreenPos, text = 'text' } = options;

        this.#width = width;
        this.#height = height;
        this.#relScreenPos = relativeScreenPos.clone();

        this.#backDrop = new T.Mesh(
            new T.PlaneGeometry(width, height),
            new T.MeshBasicMaterial({ color: 0x444444 })
        );
        this.#backDrop.layers.set(1);

        this.#txtObj = new Text();
        this.#txtObj.text = text;
        this.#txtObj.anchorX = 'center';
        this.#txtObj.anchorY = 'middle';
        this.#txtObj.color = 0xffffff;
        this.#txtObj.lineHeight = 1;
        this.#txtObj.fontSize = 24;
        this.#txtObj.textAlign = 'center';

        this.#setPosFromRel();
        this.#txtObj.position.copy(this.#backDrop.position);
        this.#txtObj.layers.set(1);
        this.#txtObj.sync();

        const scene = this.#engine.getActiveHudScene()!;
        scene.add(this.#backDrop);
        scene.add(this.#txtObj);
        Hud.addToHud(this);
    }

    #setPosFromRel() {
        const screenPos = relScreenToActual(this.#relScreenPos, this.#depth);

        this.#backDrop.position.copy(screenPos);
        this.#backDrop.position.add(
            new T.Vector3(
                (this.#width / 2) * posOrNeg(screenPos.x),
                (this.#height / 2) * posOrNeg(screenPos.y),
                0
            )
        );
    }

    getId() {
        return this.#id;
    }

    getBoundingRect() {
        const rect = {
            top: Infinity,
            bottom: Infinity,
            left: Infinity,
            right: Infinity,
        };

        if (this.#backDrop) {
            const pos = this.#backDrop.position.clone();
            const halfWidth = this.#width / 2;
            const halfHeight = this.#height / 2;
            const topRight = new T.Vector2(halfWidth, halfHeight).add(pos);
            const bottomLeft = new T.Vector2(-halfWidth, -halfHeight).add(pos);

            rect.top = topRight.y;
            rect.bottom = bottomLeft.y;
            rect.left = bottomLeft.x;
            rect.right = topRight.x;
        }

        return rect;
    }

    hoverAction(isHovered: boolean = true) {
        if (Array.isArray(this.#backDrop.material)) {
            console.error(`had unknown excess materials`);
        } else {
            this.#backDrop.material.dispose();
            this.#backDrop.material = new T.MeshBasicMaterial({
                color: isHovered ? 0x222200 : 0x444444,
            });
            if (this.onHover) this.onHover(isHovered);
        }
    }

    clickAction(mbutton: MouseButton) {
        console.log(`clicked button`, { id: this.#id, mbutton });
        if (this.onClick) this.onClick(mbutton);
    }
}
