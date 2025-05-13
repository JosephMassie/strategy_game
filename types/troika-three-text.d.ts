import * as T from 'three';

declare module 'troika-three-text' {
    export class Text extends T.Object3D {
        font: string;
        text: string;
        fontSize: number;
        color: number;
        anchorX: string;
        anchorY: string;
        textAlign: string;
        textIndent: number;
        lineHeight: number;
        sync(): void;
    }
}
