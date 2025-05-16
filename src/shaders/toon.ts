import * as T from 'three';

export const ToonShader = {
    uniforms: {
        tDiffuse: { value: null }, // Input texture from previous pass
        tNormal: { value: null }, // Normal texture
        tDepth: { value: null }, // Depth texture
        lightPosition: { value: new T.Vector3(1, 1, 1) },
        steps: { value: 4.0 },
    },

    vertexShader: /* glsl */ `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec3 lightPosition;
        uniform float steps;
        
        varying vec2 vUv;

        void main() {
            // Get the base color from the rendered scene
            vec4 texel = texture2D(tDiffuse, vUv);
            
            // Calculate lighting
            float intensity = dot(normalize(lightPosition), vec3(0.0, 0.0, 1.0));
            
            // Quantize the intensity to create toon steps
            intensity = ceil(intensity * steps) / steps;
            
            // Apply toon shading
            vec3 toonColor = texel.rgb * intensity;
            
            // Add outline
            float outline = 1.0;
            vec2 pixelSize = vec2(1.0) / vec2(textureSize(tDiffuse, 0));
            float neighbors = 0.0;
            
            // Sample neighboring pixels for edge detection
            for(float i = -1.0; i <= 1.0; i++) {
                for(float j = -1.0; j <= 1.0; j++) {
                    if(i == 0.0 && j == 0.0) continue;
                    vec2 offset = vec2(i, j) * pixelSize;
                    neighbors += length(texture2D(tDiffuse, vUv + offset).rgb);
                }
            }
            
            // Create outline based on neighbor difference
            if(abs(length(texel.rgb) * 8.0 - neighbors) > 0.1) {
                outline = 0.0;
            }
            
            gl_FragColor = vec4(toonColor * outline, texel.a);
        }
    `,
};

// Create a custom shader pass
export default ToonShader;
