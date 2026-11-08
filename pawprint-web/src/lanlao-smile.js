import {Group, MathUtils, Matrix4, Mesh, MeshStandardMaterial, SphereGeometry} from 'three';

// The original face has no jaw morph. This localized coat shader gives the
// existing surface a small open-mouth expression without moving the skeleton.
export function createLanlaoSmile(model, {random = Math.random} = {}) {
 const amount = {value: 0};
 const tongueHeight = .012;
 let elapsed = 0;
 let duration = 0;
 const head = model.getObjectByName('Head');
 let tongue;
 if (head) {
  model.updateMatrixWorld(true);
  const anchor = new Group();
  anchor.matrixAutoUpdate = false;
  anchor.matrix.copy(new Matrix4().copy(head.matrixWorld).invert().multiply(model.matrixWorld));
  head.add(anchor);
  const tongueGeometry = new SphereGeometry(1, 24, 16);
  const positions = tongueGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
   positions.setZ(i, positions.getZ(i) * (0.82 - positions.getY(i) * 0.18));
  }
  tongueGeometry.computeVertexNormals();
  tongue = new Mesh(tongueGeometry, new MeshStandardMaterial({color: '#a4515c', roughness: .85}));
  tongue.position.set(-.474, .591, .025);
  tongue.scale.set(.006, tongueHeight, .013);
  tongue.visible = false;
  anchor.add(tongue);
 }
 model.traverse(mesh => {
  if (!mesh.isSkinnedMesh || !mesh.material || Array.isArray(mesh.material)) return;
  const material = mesh.material;
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = function(shader, renderer) {
   previousCompile.call(this, shader, renderer);
   shader.uniforms.lanlaoSmile = amount;
   shader.vertexShader = 'varying vec3 smilePosition;\n' + shader.vertexShader;
   shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
    #include <begin_vertex>
    smilePosition = position;
   `);
   shader.fragmentShader = 'uniform float lanlaoSmile; varying vec3 smilePosition;\n' + shader.fragmentShader;
   shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
    #include <map_fragment>
    vec3 smilePoint = smilePosition;
    // The lip corners rise toward the cheeks while the opening tapers.
    float across = (smilePoint.z - 0.025) / 0.056;
    float corner = min(abs(across), 1.0);
    float lipCenter = 0.593 + 0.022 * corner * corner;
    vec2 mouth = vec2(across, (smilePoint.y - lipCenter) / 0.013);
    float surface = 1.0 - smoothstep(-0.41, -0.36, smilePoint.x);
    float opening = (1.0 - smoothstep(0.82, 1.02, length(mouth))) * surface * lanlaoSmile;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.009, 0.011), opening);
   `);
  };
  material.customProgramCacheKey = () => previousKey + ':lanlao-smile-v3';
  material.needsUpdate = true;
 });
 return {
  trigger() {
   if (elapsed < duration || random() >= .4) return false;
   elapsed = 0;
   duration = 2.2 + random() * 1.3;
   return true;
  },
  update(dt, {visible = true, reduced = false} = {}) {
   if (!visible || reduced) {elapsed = duration; amount.value = 0; if (tongue) tongue.visible = false; return;}
   if (elapsed >= duration) {amount.value = 0; if (tongue) tongue.visible = false; return;}
   elapsed += dt;
   amount.value = MathUtils.smoothstep(elapsed, 0, .32) *
    (1 - MathUtils.smoothstep(elapsed, duration - .45, duration));
   if (tongue) {
    tongue.visible = amount.value > .02;
    tongue.scale.y = tongueHeight * amount.value;
   }
  }
 };
}
