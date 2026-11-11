import test from 'node:test';
import assert from 'node:assert/strict';
import {createPetLoadSupport} from './src/pet-load-fallback.js';
import {HELPLINE_URL,careText} from './src/care-core.js';
import {resourceCopy} from './src/pet-loss-resources.js';

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.textContent='';this.parent=null;}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
}
const documentImpl={createElement:tag=>new Element(tag)};

test('model failure support works independently of 3D and follows the chosen language',()=>{
 const container=new Element('div');let current='zh';
 const support=createPetLoadSupport({container,locale:()=>current,documentImpl});
 assert.equal(container.children.length,2);
 const details=container.children[0];
 assert.equal(details.tagName,'details');
 assert.equal(details.children[0].textContent,careText('zh','helpOpen'));
 const link=details.children[4];
 assert.equal(link.href,HELPLINE_URL);assert.equal(link.rel,'noopener noreferrer');assert.equal(link.target,'_blank');
 const resources=container.children[1], resourceLinks=resources.children[2].children.map(item=>item.children[0]);
 assert.deepEqual(resourceLinks.map(item=>item.href),[
  'https://bcbh.ca/grief-support/pet-loss-support/',
  'https://pettrust.ca/pet-loss-support/',
  'https://www.vet.cornell.edu/about-us/outreach/pet-loss-support-hotline'
 ]);
 assert.ok(resourceLinks.every(item=>item.rel==='noopener noreferrer'&&item.target==='_blank'));
 for(const lang of ['en','fr']){
  current=lang;support.render();assert.equal(details.children[0].textContent,careText(lang,'helpOpen'));assert.equal(link.textContent,careText(lang,'helpLink'));
  assert.equal(resources.children[0].textContent,resourceCopy[lang].open);
  assert.equal(resourceLinks[0].textContent,resourceCopy[lang].bc);
  assert.equal(resources.children[3].textContent,resourceCopy[lang].note);
 }
 support.destroy();assert.equal(container.children.length,0);
});
