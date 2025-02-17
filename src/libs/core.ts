function randNum(min: number, max: number): number {
    const factor = 100;
    let temp = (Math.random() % (max + 1 - min)) * factor + min * factor;
    return temp / factor;
}

export default {
    randNum,
};
