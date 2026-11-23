import validator from 'gltf-validator';
import {readGLB, summarizeGLB} from './glb.mjs';
import {extraGroundContacts} from './model-anatomy.mjs';

// Extensions supported by the companion's Three.js loader without extra decoders.
const previewExtensions = new Set([
 'EXT_materials_bump', 'EXT_mesh_gpu_instancing', 'EXT_meshopt_compression', 'EXT_texture_avif', 'EXT_texture_webp',
 'KHR_lights_punctual', 'KHR_materials_anisotropy', 'KHR_materials_clearcoat', 'KHR_materials_dispersion',
 'KHR_materials_emissive_strength', 'KHR_materials_ior', 'KHR_materials_iridescence', 'KHR_materials_sheen',
 'KHR_materials_specular', 'KHR_materials_transmission', 'KHR_materials_unlit', 'KHR_materials_volume',
 'KHR_mesh_quantization', 'KHR_meshopt_compression', 'KHR_texture_transform',
]);

function sceneSurfaces(document) {
 const pending = [...document.scenes?.[document.scene ?? 0]?.nodes ?? []];
 const visited = new Set(), joints = new Set();
 let triangles = 0, coat = false;
 while (pending.length) {
  const index = pending.pop();
  if (visited.has(index)) continue;
  visited.add(index);
  const node = document.nodes[index];
  for (const child of node.children ?? []) pending.push(child);
  for (const primitive of document.meshes?.[node.mesh]?.primitives ?? []) {
   const mode = primitive.mode ?? 4;
   const count = document.accessors[primitive.indices ?? primitive.attributes.POSITION]?.count ?? 0;
   if (count < 3 || mode < 4 || primitive.attributes.POSITION === undefined) continue;
   triangles += mode === 4 ? Math.floor(count / 3) : count - 2;
   const material = document.materials?.[primitive.material];
   coat ||= material?.pbrMetallicRoughness?.baseColorTexture !== undefined || primitive.attributes.COLOR_0 !== undefined;
   if (node.skin !== undefined && primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined) {
    for (const joint of document.skins[node.skin].joints) joints.add(joint);
   }
  }
 }
 return {triangles, coat, joints};
}

function hasWalkingClip(document, joints) {
 const animations = document.animations ?? [];
 const candidates = animations.length === 1 ? animations : animations.filter(animation => /walk/i.test(animation.name ?? ''));
 return candidates.some(animation => animation.channels.some(channel => {
  if (!joints.has(channel.target.node) || !['rotation', 'translation'].includes(channel.target.path)) return false;
  const input = document.accessors[animation.samplers[channel.sampler].input];
  return input.count > 1 && input.max?.[0] > input.min?.[0];
 }));
}

export async function assessModel(bytes, {walking = false, checkGround = false} = {}) {
 const report = {bytes: bytes.length, renderable: false, coat: false, walkable: false, issues: []};
 let glb;
 try {
  glb = readGLB(bytes);
 } catch {
  report.issues.push('invalid_container');
  return report;
 }
 const {document} = glb;

 let result;
 try {
  result = await validator.validateBytes(bytes, {maxIssues: 200});
 } catch {
  report.issues.push('validation_incomplete');
  return report;
 }
 const {numErrors, numWarnings, truncated, messages} = result.issues;
 report.validation = {
  errors: numErrors,
  warnings: numWarnings,
  truncated,
  errorCodes: [...new Set(messages.filter(issue => issue.severity === 0).map(issue => issue.code))],
 };
 if (numErrors || truncated) {
  report.issues.push(numErrors ? 'invalid_gltf' : 'validation_incomplete');
  return report;
 }
 if (document.extensionsRequired?.some(extension => !previewExtensions.has(extension))) {
  report.issues.push('unsupported_extension');
  return report;
 }

 const {triangles, coat, joints} = sceneSurfaces(document);
 Object.assign(report, summarizeGLB(document), {triangles, coat, renderable: triangles > 0, walkable: hasWalkingClip(document, joints)});
 if (!report.renderable) report.issues.push('no_mesh');
 if (!coat) report.issues.push('no_coat');
 if (walking && !report.walkable) report.issues.push('no_walk');
 if (checkGround && report.renderable) {
  report.extraGroundContacts = extraGroundContacts(glb);
  if (report.extraGroundContacts) report.issues.push('extra_ground_contacts');
 }
 if (triangles > 100_000) report.issues.push('dense_mesh');
 return report;
}
