import {HELPLINE_URL,careText} from './care-core.js';
import {createPetLossResources} from './pet-loss-resources.js';

// Available independently of 3D initialization. The usual care controls take
// over if the model later loads, so the page never offers duplicate help cards.
export function createPetLoadSupport({container,locale,documentImpl=document}){
 const details=documentImpl.createElement('details');details.className='pet-load-support';
 const summary=documentImpl.createElement('summary');summary.className='care-link';
 const title=documentImpl.createElement('h3');
 const body=documentImpl.createElement('p'),urgent=documentImpl.createElement('p'),link=documentImpl.createElement('a');
 link.href=HELPLINE_URL;link.target='_blank';link.rel='noopener noreferrer';
 details.append(summary,title,body,urgent,link);container.append(details);
 const resources=createPetLossResources({container,locale,documentImpl});
 function render(){
  const t=key=>careText(locale(),key);
  summary.textContent=t('helpOpen');title.textContent=t('helpTitle');body.textContent=t('helpBody');
  urgent.textContent=t('helpUrgent');link.textContent=t('helpLink');
  resources.render();
 }
 render();
 return {render,destroy:()=>{details.remove();resources.destroy();}};
}
