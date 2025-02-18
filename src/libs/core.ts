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
