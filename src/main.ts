import './style.css';

import * as THREE from 'three';

import GameEngine from './game_engine';

const canvas = document.querySelector(
    'canvas#background'
)! as HTMLCanvasElement;
const engine = new GameEngine(canvas, true);

const scene = engine.createScene();

const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
const material = new THREE.MeshStandardMaterial({
    color: 0x6af5d9,
});
const torus = new THREE.Mesh(geometry, material);

const ambientLight = new THREE.AmbientLight(0xffffff);

scene.add(ambientLight);
scene.add(torus);

function addStar(s: THREE.Scene) {
    const geo = new THREE.SphereGeometry(0.25, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geo, mat);

    const [x, y, z] = Array(3)
        .fill(null)
        .map(() => THREE.MathUtils.randFloatSpread(100));
    star.position.set(x, y, z);
    s.add(star);
}

Array(200)
    .fill(null)
    .map(() => addStar(scene));

engine.enableOrbitCtrls();

function animate() {
    requestAnimationFrame(animate);

    torus.rotation.x += 0.01;
    torus.rotation.y += 0.01;
    torus.rotation.z += 0.01;

    engine.update();
    engine.render(scene);
}

animate();
