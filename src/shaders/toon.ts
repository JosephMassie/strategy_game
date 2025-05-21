import * as T from 'three';

export const ToonShader = {
    uniforms: {
        tDiffuse: { value: null }, // Input texture from previous pass
        lightPosition: { value: new T.Vector3(1, 1, 1) },
        steps: { value: 4.0 },
        outlineMultiplier: { value: 2.0 },
        outlineThreshold: { value: 0.5 },
        samplingRadius: { value: 0.75 },
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
        uniform float samplingRadius;
        uniform float outlineMultiplier;
        uniform float outlineThreshold;
        
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
            float maxOffset = 2.0 * samplingRadius;
            float sampleCount = 0.0;
            for(float i = -maxOffset; i <= maxOffset; i++) {
                for(float j = -maxOffset; j <= maxOffset; j++) {
                    if(i == 0.0 && j == 0.0) continue;
                    vec2 point = vec2(i, j);
                    if (length(point) <= samplingRadius * 2.0) {
                        vec2 offset = point * pixelSize;
                        neighbors += length(texture2D(tDiffuse, vUv + offset).rgb);
                        sampleCount += 1.0;
                    }
                }
            }
            
            // Normalize neighbors by sample count
            neighbors = neighbors / max(sampleCount, 1.0);
            
                // Create outline based on normalized neighbor difference
            float centerIntensity = length(texel.rgb);
            if(abs(centerIntensity * outlineMultiplier - neighbors * outlineMultiplier) > outlineThreshold) {
                outline = 0.0;
            }
            
            gl_FragColor = vec4(toonColor * outline, texel.a);
        }`,
};

// Create a custom shader pass
export default ToonShader;
