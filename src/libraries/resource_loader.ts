import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const meshes = new Map<string, Promise<T.Mesh>>();
const loader = new GLTFLoader();

function loadModelPromise(url: string): Promise<T.Mesh> {
    return new Promise<T.Mesh>((resolve, reject) => {
        loader.load(
            url,
            (gltf) => {
                resolve(gltf.scene.children[0] as T.Mesh);
            },
            undefined,
            (err) => {
                reject(err);
            }
        );
    });
}

export const addFileExtension = (extension: string) => (path: string) =>
    `/${path}.${extension}`;

export const loadMesh = async (path: string) => {
    if (meshes.has(path)) {
        return meshes.get(path)!;
    }

    const request = loadModelPromise(path);
    meshes.set(path, request);

    return request;
};
