import * as T from 'three';

import { input } from '@libraries/input';
input.initialize();

type IsometricCameraControllerOptions = {
    target?: T.Vector3;
    distance?: number;
    rotationHorizontal?: number;
    rotationVertical?: number;
    minDistance?: number;
    maxDistance?: number;
    minVerticalRotation?: number;
    maxVerticalRotation?: number;
    rotationSpeed?: number;
    zoomSpeed?: number;
    panSpeed?: number;
};

// Isometric Camera Controller for Three.js
export default class IsometricCameraController {
    #camera: T.Camera;
    #target: T.Vector3;
    #distance: number;
    #rotationHorizontal: number;
    #rotationVertical: number;
    #minDistance: number;
    #maxDistance: number;
    #minVerticalRotation: number;
    #maxVerticalRotation: number;
    #rotationSpeed: number;
    #zoomSpeed: number;
    #panSpeed: number;

    constructor(
        camera: T.Camera,
        options: IsometricCameraControllerOptions = {}
    ) {
        this.#camera = camera;

        // Focus point (where the camera is looking at)
        this.#target = options.target ?? new T.Vector3(0, 0, 0);

        // Distance from camera to target
        this.#distance = options.distance ?? 10;

        // Rotation angles (horizontal and vertical)
        this.#rotationHorizontal = options.rotationHorizontal ?? Math.PI / 4; // 45 degrees
        this.#rotationVertical = options.rotationVertical ?? Math.PI / 6; // 30 degrees

        // For isometric look: typically 45° horizontal rotation and ~35° vertical tilt

        // Constraints
        this.#minDistance = options.minDistance ?? 5;
        this.#maxDistance = options.maxDistance ?? 20;
        this.#minVerticalRotation = options.minVerticalRotation ?? Math.PI / 12; // Min tilt
        this.#maxVerticalRotation = options.maxVerticalRotation ?? Math.PI / 3; // Max tilt

        // Movement speed
        this.#rotationSpeed = options.rotationSpeed ?? 10.0;
        this.#zoomSpeed = options.zoomSpeed ?? 10.0;
        this.#panSpeed = options.panSpeed ?? 10.0;
    }

    rotate(delta: T.Vector2) {
        // Convert mouse movement to rotation angles
        this.#rotationHorizontal -= delta.x * 0.01 * this.#rotationSpeed;
        this.#rotationVertical -= delta.y * 0.01 * this.#rotationSpeed;

        // Clamp vertical rotation to avoid flipping
        this.#rotationVertical = Math.max(
            this.#minVerticalRotation,
            Math.min(this.#maxVerticalRotation, this.#rotationVertical)
        );
    }

    zoom(delta: number) {
        // Change distance between camera and target
        this.#distance += delta;
        this.#distance = Math.max(
            this.#minDistance,
            Math.min(this.#maxDistance, this.#distance)
        );
    }

    pan(delta: T.Vector3) {
        // Move the target point (and thus the camera)
        // We need to move in the camera's local XZ plane

        // Calculate right vector (X axis in camera space)
        let forward = new T.Vector3();
        forward = this.#camera.getWorldDirection(forward).normalize();
        const right = new T.Vector3();
        right.crossVectors(forward, this.#camera.up).normalize();

        // reset forward vector to be perpendicular to the ground
        forward.y = 0;
        forward.normalize();

        // Calculate movement vectors
        const moveRight = right
            .clone()
            .multiplyScalar(-delta.x * 0.01 * this.#panSpeed);

        const moveForward = forward
            .clone()
            .multiplyScalar(-delta.z * 0.01 * this.#panSpeed);

        // For vertical movement, we use a combination of up vector and forward vector
        // This ensures we move along the ground plane
        const upProjected = new T.Vector3(0, 1, 0);
        upProjected.projectOnPlane(forward).normalize();

        const moveUp = upProjected.multiplyScalar(
            -delta.y * 0.01 * this.#panSpeed
        );

        // Apply movement to target
        this.#target.add(moveRight);
        this.#target.add(moveForward);
        this.#target.add(moveUp);
    }

    update() {
        const directions: Array<[string, T.Vector3]> = [
            ['w', new T.Vector3(0, 0, -1)],
            ['s', new T.Vector3(0, 0, 1)],
            ['a', new T.Vector3(1, 0, 0)],
            ['d', new T.Vector3(-1, 0, 0)],
        ];

        let cameraMovement = new T.Vector3(0, 0, 0);
        directions.forEach(([key, vec]) => {
            if (input.isKeyDown(key)) {
                cameraMovement.add(vec);
            }
        });
        this.pan(cameraMovement);

        const rotationDirections: Array<[string, T.Vector2]> = [
            ['q', new T.Vector2(-1, 0)],
            ['ArrowLeft', new T.Vector2(-1, 0)],
            ['e', new T.Vector2(1, 0)],
            ['ArrowRight', new T.Vector2(1, 0)],
            ['ArrowUp', new T.Vector2(0, 1)],
            ['ArrowDown', new T.Vector2(0, -1)],
        ];

        let cameraRotation = new T.Vector2(0, 0);
        rotationDirections.forEach(([key, vec]) => {
            if (input.isKeyDown(key)) {
                cameraRotation.add(vec);
            }
        });
        this.rotate(cameraRotation);

        // Zoom with mouse wheel or space & shift
        let zoomDelta = Math.sign(input.getMouseWheelDelta()) * this.#zoomSpeed;
        if (input.isKeyDown('Shift')) {
            zoomDelta = -1 * this.#zoomSpeed;
        }
        if (input.isKeyDown(' ')) {
            zoomDelta = 1 * this.#zoomSpeed;
        }
        this.zoom(zoomDelta);

        // Position the camera based on spherical coordinates
        const x =
            this.#distance *
            Math.sin(this.#rotationVertical) *
            Math.cos(this.#rotationHorizontal);
        const y = this.#distance * Math.cos(this.#rotationVertical);
        const z =
            this.#distance *
            Math.sin(this.#rotationVertical) *
            Math.sin(this.#rotationHorizontal);

        // Set camera position relative to target
        this.#camera.position.set(
            this.#target.x + x,
            this.#target.y + y,
            this.#target.z + z
        );

        // Look at target
        this.#camera.lookAt(this.#target);

        // For true isometric projection, you would set the camera to orthographic
        // this.#camera.updateProjectionMatrix();
    }

    // Set the camera to a true isometric view
    setIsometricView() {
        // Standard isometric view is from an angle where all three axes appear equal
        this.#rotationHorizontal = Math.PI / 4; // 45 degrees
        this.#rotationVertical = Math.PI / 6; // ~35.264 degrees (arctan(1/√2))
        this.update();
    }

    changeTarget(newTarget: T.Vector3) {
        this.#target.copy(newTarget);
        this.update();
    }
}
