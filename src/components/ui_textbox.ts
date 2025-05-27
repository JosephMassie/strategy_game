import * as T from 'three';
import { generateUUID } from 'three/src/math/MathUtils.js';
import { Text } from 'troika-three-text';

import getGameEngine from '@/libraries/game_engine';
import { PIXEL_FONT } from '@/constants';

import Hud, { HudElement } from '@/libraries/hud';

type TextBoxOpts = {
    font?: string;
    textColor?: number;
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    anchor?: string;
    textAlign?: string;
    backDropColor: number;
    padding?: number;
    depth?: number;
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

export default class TextBox {
    #id: string;
    #engine = getGameEngine();
    #txtObj: Text;
    #backDrop: T.Mesh;
    #relScreenPos: T.Vector2;
    #depth: number;
    #padding: number;
    #width: number;
    #height: number;

    constructor(msg: string, position: T.Vector2, options?: TextBoxOpts) {
        this.#txtObj = new Text();
        this.#txtObj.text = msg;
        this.#txtObj.layers.set(1);

        this.#relScreenPos = position;

        const {
            font = PIXEL_FONT,
            textColor = 0xffffff,
            backDropColor,
            fontSize = 24,
            textAlign,
            lineHeight = 1.25,
            letterSpacing = 0,
            anchor = 'bottom left',
            padding = 10,
            depth = 0,
        } = { ...options };
        const [vertAnchor, horizAnchor] = anchor.split(' ');

        this.#id = generateUUID();
        this.#depth = depth;
        this.#padding = padding;

        this.#txtObj.font = font;
        this.#txtObj.color = textColor;
        this.#txtObj.lineHeight = lineHeight;
        this.#txtObj.letterSpacing = letterSpacing;
        this.#txtObj.fontSize = fontSize;
        if (textAlign) this.#txtObj.textAlign = textAlign;
        this.#txtObj.anchorY = vertAnchor;
        this.#txtObj.anchorX = horizAnchor;

        const [width, height] = this.#calcBdDimensions();
        this.#width = width;
        this.#height = height;

        this.#backDrop = new T.Mesh(
            new T.PlaneGeometry(width, height),
            new T.MeshBasicMaterial({ color: backDropColor })
        );
        this.#backDrop.layers.set(1);

        this.#setPosFromRel();
        this.#engine.whenResized(() => {
            this.#setPosFromRel();
        });

        this.#txtObj.sync();

        Hud.addToHud(this satisfies HudElement);
    }

    // returns [width, height] based on text data
    #calcBdDimensions(): [number, number] {
        const { text, fontSize, lineHeight, letterSpacing } = this.#txtObj;

        const lines = text.split('\n');
        const lineCount = lines.length;
        const longestLine = lines.reduce(
            (longest, l) => (l.length > longest ? l.length : longest),
            0
        );

        const width =
            longestLine * (fontSize / 2.5 + letterSpacing) + this.#padding * 2;
        const height = fontSize * lineHeight * lineCount + this.#padding * 2;

        return [width, height];
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
        const txtPosX = screenPos.x + this.#padding * posOrNeg(screenPos.x);
        const txtPosY = screenPos.y + this.#padding * posOrNeg(screenPos.y);
        this.#txtObj.position.set(txtPosX, txtPosY, this.#depth);
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

    addToHudScene(scene?: T.Scene) {
        const target = scene ?? this.#engine.getActiveHudScene();
        if (!target) {
            console.error(
                'failed to add textbox to scene, no scene provided or active scene available'
            );
            return;
        }

        target.add(this.#txtObj);
        if (this.#backDrop) {
            target.add(this.#backDrop);
        }
    }

    updateText(msg: string) {
        if (this.#txtObj.text !== msg) {
            this.#txtObj.text = msg;
            this.#txtObj.sync();

            const [width, height] = this.#calcBdDimensions();
            this.#width = width;
            this.#height = height;
            this.#backDrop.geometry.dispose();
            this.#backDrop.geometry = new T.PlaneGeometry(width, height);

            this.#setPosFromRel();
        }
    }

    dispose() {
        this.#txtObj.parent?.remove(this.#txtObj);
        this.#txtObj.dispose();
        this.#backDrop.parent?.remove(this.#backDrop);
        this.#backDrop.geometry.dispose();
        if (!Array.isArray(this.#backDrop.material)) {
            this.#backDrop.material.dispose();
        } else {
            this.#backDrop.material.forEach((mat) => mat.dispose());
        }
    }
}
