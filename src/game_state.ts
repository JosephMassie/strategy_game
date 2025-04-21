export enum ResourceTypes {
    MINERALS,
    FOOD,
}

const resources = {
    [ResourceTypes.MINERALS]: 50,
    [ResourceTypes.FOOD]: 10,
};

export const getResource = (type: ResourceTypes) => resources[type];
export const setResource = (type: ResourceTypes, value: number) => {
    resources[type] = value;
};
export const addResource = (type: ResourceTypes, value: number) => {
    resources[type] += value;
};
