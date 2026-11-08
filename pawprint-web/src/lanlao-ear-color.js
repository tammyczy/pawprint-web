export function softenLanlaoEarColor(model) {
 model.traverse(mesh => {
  if (!mesh.isSkinnedMesh || !mesh.material || Array.isArray(mesh.material)) return;
  const material = mesh.material;
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
   previousCompile.call(this, shader, renderer);
   shader.vertexShader = 'varying vec3 lanlaoCoatPosition;\n' + shader.vertexShader;
   shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
    #include <begin_vertex>
    lanlaoCoatPosition = position;
   `);
   shader.fragmentShader = 'varying vec3 lanlaoCoatPosition;\n' + shader.fragmentShader;
   shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
    #include <map_fragment>
    vec3 p = lanlaoCoatPosition;
    float earSide = smoothstep(0.108, 0.145, abs(p.z));
    float earHeight = smoothstep(0.53, 0.60, p.y) * (1.0 - smoothstep(0.80, 0.85, p.y));
    float earFront = smoothstep(-0.46, -0.36, p.x) * (1.0 - smoothstep(-0.09, 0.02, p.x));
    float warmth = smoothstep(0.015, 0.09, diffuseColor.r - diffuseColor.b);
    float ear = earSide * earHeight * earFront * warmth;
    float luminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 softened = mix(diffuseColor.rgb, vec3(luminance) * vec3(1.12, 1.02, 0.91), 0.38);
    softened += vec3(0.045, 0.045, 0.035);
    diffuseColor.rgb = mix(diffuseColor.rgb, softened, ear * 0.85);
   `);
  };
  material.customProgramCacheKey = () => previousKey + ':lanlao-ear-v2';
  material.needsUpdate = true;
 });
}
