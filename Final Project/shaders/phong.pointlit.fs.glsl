precision mediump float;

uniform vec3 uLightPosition;
uniform vec3 uCameraPosition;
uniform sampler2D uTexture;
uniform float uAlpha;

varying vec2 vTexcoords;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(void) {
    // diffuse contribution
    vec3 lightDir = normalize(uLightPosition-vWorldPosition);
    vec3 normalizedWorldNormal = normalize(vWorldNormal);
    float lambertTerm = dot(lightDir, normalizedWorldNormal);

    vec3 albedo = texture2D(uTexture, vTexcoords).rgb;
    vec3 diffuseColor = albedo * lambertTerm;

    vec3 finalColor = diffuseColor;

    gl_FragColor = vec4(finalColor, uAlpha);
}

// EOF 00100001-10