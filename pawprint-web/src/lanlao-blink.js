import {Matrix4, SRGBColorSpace, TextureLoader} from 'three';

export function createLanlaoBlink(model, textureUrl) {
 let face;
 model.traverse(node => {
  if (node.isSkinnedMesh && node.morphTargetDictionary?.Original_Coat_Sway !== undefined) face = node;
 });
 const closure = {value: 0};
 if (!face?.isSkinnedMesh) return closure;

 model.updateMatrixWorld(true);
 const rest = new Matrix4().multiplyMatrices(face.skeleton.bones[0].matrixWorld, face.skeleton.boneInverses[0]);
 let loaded = false;
 const coat = new TextureLoader().load(textureUrl, () => {loaded = true;});
 coat.colorSpace = SRGBColorSpace;
 const material = face.material;
 const amount = {get value() {return loaded ? closure.value : 0;}};
 material.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, {lanlaoClosure: amount, lanlaoCoat: {value: coat}, lanlaoRest: {value: rest}});
  shader.vertexShader = `
   uniform mat4 lanlaoRest;
   varying vec3 lanlaoFace;

  ` + shader.vertexShader.replace('#include <begin_vertex>', `
   #include <begin_vertex>
   lanlaoFace = (lanlaoRest * vec4(position, 1.0)).xyz;
  `);
  shader.fragmentShader = `
   uniform float lanlaoClosure;
   uniform sampler2D lanlaoCoat;
   varying vec3 lanlaoFace;

   float lanlaoEyeSurface(vec3 coatColor) {
    if (lanlaoFace.x > -0.32) return 0.0;
    vec2 pixel = vec2(lanlaoFace.z * 700.0 + 240.0, (0.88 - lanlaoFace.y) * 700.0);
    bool right = pixel.x > 260.0;
    vec2 center = right ? vec2(299.0, 114.0) : vec2(222.0, 115.0);
    vec2 radii = right ? vec2(11.5, 13.0) : vec2(15.0, 14.0);
    float area = 1.0 - smoothstep(0.76, 1.04, length((pixel - center) / radii));
    float dark = 1.0 - smoothstep(0.028, 0.10, dot(coatColor, vec3(0.2126, 0.7152, 0.0722)));
    return area * dark * (1.0 - smoothstep(0.0, 0.65, lanlaoClosure));
   }

   vec3 lanlaoRelaxedEyeCoat(vec3 coatColor) {
    if (lanlaoFace.x > -0.32) return coatColor;
    vec2 pixel = vec2(lanlaoFace.z * 700.0 + 240.0, (0.88 - lanlaoFace.y) * 700.0);
    bool right = pixel.x > 260.0;
    vec2 center = right ? vec2(299.0, 114.0) : vec2(222.0, 115.0);
    vec2 radii = right ? vec2(11.5, 13.0) : vec2(15.0, 14.0);
    float distance = length((pixel - center) / radii);
    float orbit = smoothstep(0.92, 1.12, distance) * (1.0 - smoothstep(1.45, 1.85, distance));
    float luminance = dot(coatColor, vec3(0.2126, 0.7152, 0.0722));
    float fur = smoothstep(0.045, 0.12, luminance) * (1.0 - smoothstep(0.32, 0.55, luminance));
    return coatColor + vec3(0.025, 0.021, 0.016) * orbit * fur;
   }

   vec3 lanlaoLids(vec3 openCoat) {
    if (lanlaoClosure <= 0.0 || lanlaoFace.x > -0.32) return openCoat;

    // Frontal projection in rest space, aligned with the sampled coat texture.
    vec2 pixel = vec2(lanlaoFace.z * 700.0 + 240.0, (0.88 - lanlaoFace.y) * 700.0);
    bool right = pixel.x > 260.0;
    vec2 center = right ? vec2(299.0, 114.0) : vec2(222.0, 115.0);
    vec2 radii = right ? vec2(11.5, 13.0) : vec2(15.0, 14.0);
    vec2 eye = (pixel - center) / radii;
    float edge = 1.0 - smoothstep(0.88, 1.14, length(eye));
    if (edge <= 0.0) return openCoat;

    float seam = 0.26 + (right ? 0.13 : -0.17) * eye.x - 0.20 * eye.x * eye.x;
    float aperture = sqrt(max(0.0, 1.0 - eye.x * eye.x));
    float upper = mix(-aperture - 0.14, seam, lanlaoClosure);
    float lower = mix(aperture + 0.14, seam, lanlaoClosure);
    float cover = max(1.0 - smoothstep(upper - 0.08, upper + 0.06, eye.y),
      smoothstep(lower - 0.06, lower + 0.08, eye.y));
    vec2 samplePixel = pixel;
    samplePixel.y = eye.y <= seam
      ? center.y - radii.y - 3.0 + clamp((eye.y - upper) * 4.0, -10.0, 0.0)
      : center.y + radii.y + 5.0 + clamp((eye.y - lower) * 4.0, 0.0, 8.0);
    vec2 uv = (samplePixel - vec2(192.0, 64.0)) / vec2(128.0, 72.0);
    vec3 lid = texture2D(lanlaoCoat, vec2(uv.x, 1.0 - uv.y)).rgb;
    float lash = (1.0 - smoothstep(0.02, 0.12, abs(eye.y - seam))) * smoothstep(0.8, 1.0, lanlaoClosure);
    lid *= mix(1.0, 0.38, lash);
    return mix(openCoat, lid, edge * cover * smoothstep(0.0, 0.18, lanlaoClosure));
   }
  ` + shader.fragmentShader.replace('#include <map_fragment>', `
   #include <map_fragment>
   diffuseColor.rgb = lanlaoLids(lanlaoRelaxedEyeCoat(diffuseColor.rgb));
  `).replace('#include <roughnessmap_fragment>', `
   #include <roughnessmap_fragment>
   // The corneal surface catches the scene lights while the coat stays matte.
   roughnessFactor = mix(roughnessFactor, 0.24, lanlaoEyeSurface(diffuseColor.rgb));
  `);
 };
 material.customProgramCacheKey = () => 'lanlao-eyelid-eye-surface-v2';
 material.needsUpdate = true;
 return closure;
}
