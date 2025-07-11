// A file containing most generic game constants

export const INPUT_TAP_COOLDOWN = 200;

export const SUN_POS: Readonly<[number, number, number]> = [5, 15, 5];

// resource paths
export const PIXEL_FONT = '/PixgamerRegular-OVD6A.ttf';

export const TILE_MESHES: ReadonlyArray<string> = [
    'grass',
    'sand',
    'mountain',
    'water',
];
export const BUILDING_MESHES: ReadonlyArray<string> = ['farm', 'mine'];
export const OTHER_MESHES: ReadonlyArray<string> = ['exclamation'];

export const BTN_TEXTURES: ReadonlyArray<string> = ['farm_btn', 'mine_btn'];
