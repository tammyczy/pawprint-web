import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {softenLanlaoEarColor} from './src/lanlao-ear-color.js';

test('ear color keeps the existing face and fur shader behavior', () => {
 const root = new THREE.Group();
 const materials = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
 for (const [index, material] of materials.entries()) {
  material.onBeforeCompile = shader => { shader.fragmentShader += `\n// existing-${index}`; };
  material.customProgramCacheKey = () => `existing-${index}`;
  root.add(new THREE.SkinnedMesh(new THREE.BoxGeometry(), material));
 }
 softenLanlaoEarColor(root);
 for (const [index, material] of materials.entries()) {
  const shader = {vertexShader: '#include <begin_vertex>', fragmentShader: '#include <map_fragment>'};
  material.onBeforeCompile(shader, null);
  assert.match(shader.fragmentShader, new RegExp(`existing-${index}`));
  assert.match(shader.fragmentShader, /lanlaoCoatPosition/);
  assert.match(shader.vertexShader, /lanlaoCoatPosition = position/);
  assert.equal(material.customProgramCacheKey(), `existing-${index}:lanlao-ear-v2`);
 }
});
