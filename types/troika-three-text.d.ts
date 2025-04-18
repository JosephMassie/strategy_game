import * as T from 'three';

declare module 'troika-three-text' {
    export class Text extends T.Object3D {
        text: string;
        fontSize: number;
        color: number;
        anchorX: string;
        anchorY: string;
        textAlign: string;
        textIndent: number;
        sync(): void;
    }
}
