import * as T from 'three';

type PreloadFontOptions = {
    font: string;
    characters: string;
};

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
        letterSpacing: number;
        sync(): void;
        dispose(): void;
    }
    export function preloadFont(
        opts: PreloadFontOptions,
        callback?: () => void
    );
}
