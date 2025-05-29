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
        .loadAsync(
            `/meshes/${path}`,
            console.log.bind(console, `loading mesh ${path}...`)
        )
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
            throw Error(`${path} issue loading resource`);
        }
        return mesh;
    }

    throw Error(`${path} resource not yet loaded`);
};
