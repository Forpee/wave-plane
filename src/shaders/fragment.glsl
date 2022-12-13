uniform float uTime;
uniform sampler2D uTexture;
varying float vWave;

varying vec2 vUv;

void main()
{
    float wave = vWave * 0.2;
    
    float r = texture2D(uTexture, vUv).r;
    float g = texture2D(uTexture, vUv).g;
    float b = texture2D(uTexture, vUv + wave).b;

    vec3 texture = vec3(r, g, b);
    
    gl_FragColor = vec4(texture2D, 1.0);
}