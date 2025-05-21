import * as T from 'three';

export function randNum(min: number, max: number): number {
    const temp = Math.random() * (max - min) + min;
    return temp;
}

export function randInt(min: number, max: number): number {
    let base = randNum(min, max + 1);
    base = Math.floor(base);
    return base;
}

export const msToS = (ms: number) => ms / 1000;
export const sToMs = (s: number) => s * 1000;

export function vec3ToString(vec: T.Vector3, maxDecimal?: number) {
    const x = maxDecimal ? vec.x.toFixed(maxDecimal) : vec.x;
    const y = maxDecimal ? vec.y.toFixed(maxDecimal) : vec.y;
    const z = maxDecimal ? vec.z.toFixed(maxDecimal) : vec.z;

    return `[${x}, ${y}, ${z}]`;
}

export function vec2ToString(vec: T.Vector2, maxDecimal?: number) {
    const x = maxDecimal ? vec.x.toFixed(maxDecimal) : vec.x;
    const y = maxDecimal ? vec.y.toFixed(maxDecimal) : vec.y;

    return `[${x}, ${y}]`;
}

export type ShaderUniform = Record<string, { value: any }>;

export const shaderUniforms = (
    uniforms: Record<string, any>
): ShaderUniform => {
    const output: ShaderUniform = {};

    for (const key in uniforms) {
        output[key] = uniforms[key];
    }

    return output;
};
