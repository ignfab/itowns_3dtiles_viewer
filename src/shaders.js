import { Color } from 'three';

// Monkey-patch the shader to add featureId hightlighting
export function patchShader(material,shader) {
    shader.uniforms = {
        featureId: { value: -1.0 },
        featureColor: { value: new Color('Red').convertSRGBToLinear() },
        ...shader.uniforms,
    };
    shader.vertexShader = `
        attribute float _feature_id_0;
        out float vFeatureId;
        ${shader.vertexShader.replace(
            /#include <uv_vertex>/,
            `
            vFeatureId = _feature_id_0;
            #include <uv_vertex>
            `
        )}
    `;
    shader.fragmentShader = `
        uniform float featureId;
        uniform vec3 featureColor;
        in float vFeatureId;
        ${shader.fragmentShader.replace(
            /vec4 diffuseColor = vec4\( diffuse, opacity \);/,
            `
            vec4 diffuseColor = featureId == vFeatureId ?
            vec4(featureColor, opacity) : vec4(diffuse, opacity);
            `
        )}
    `;
    material.userData.uniforms = shader.uniforms;
}

export function setFeatureId(material, id) {
    material.userData.uniforms.featureId.value = id;
}

export function setFeatureColor(material, color) {
    material.userData.uniforms.featureColor.value = color;
}