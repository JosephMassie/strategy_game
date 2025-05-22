import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const meshes = new Map<string, Promise<T.Mesh>>();
const loader = new GLTFLoader();

function loadModelPromise(url: string): Promise<T.Mesh> {
    return loader
        .loadAsync(url, console.log.bind(console, `loading...`))
        .then((gltf) => gltf.scene.children[0] as T.Mesh);
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
