import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Resource<T> = {
    name: string;
    request: Promise<T>;
    result?: T;
};

export const addFileExtension = (extension: string) => (path: string) =>
    `${path}.${extension}`;

const meshes = new Map<string, Resource<T.Mesh>>();
const meshLoader = new GLTFLoader();

export const loadMesh = async (path: string) => {
    if (meshes.has(path)) {
        return meshes.get(path)!.request;
    }

    const request = meshLoader
        .loadAsync(`/meshes/${path}`, (progress) => {
            console.log(`loading mesh ${path}`, progress);
        })
        .then((gltf) => {
            const mesh = gltf.scene.children[0] as T.Mesh;

            const resource = meshes.get(path)!;
            meshes.set(path, { ...resource, result: mesh });

            return mesh;
        });

    meshes.set(path, { name: path, request });

    return request;
};

export const getLoadedMesh = (path: string) => {
    if (meshes.has(path)) {
        const mesh = meshes.get(path)!.result;
        if (!mesh) {
            throw Error(`${path} issue loading mesh`);
        }
        return mesh;
    }

    throw Error(`${path} mesh not yet loaded`);
};

const textures = new Map<string, Resource<T.Texture>>();
const textureLoader = new T.TextureLoader();

export const loadTexture = (path: string) => {
    if (textures.has(path)) {
        return textures.get(path)!.request;
    }
    console.log('loading texture');

    const request = textureLoader
        .loadAsync(`/textures/${path}`, (progress) => {
            console.log(`loading texture ${path}`, progress);
        })
        .then((texture) => {
            const resource = textures.get(path)!;
            textures.set(path, { ...resource, result: texture });
            return texture;
        });

    textures.set(path, { name: path, request });

    return request;
};

export const getLoadedTexture = (path: string) => {
    if (textures.has(path)) {
        const texture = textures.get(path)!.result;
        if (!texture) {
            throw Error(`${path} issue loading texture`);
        }
        return texture;
    }

    throw Error(`${path} texture not yet loaded`);
};
