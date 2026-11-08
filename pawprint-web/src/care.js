import './care.css';

// Grief-care safeguards: a fixed help card for serious distress, a goodbye ritual, and a gentle break reminder.
// Everything here runs in the browser; letters are never sent to a server or an AI model.

import {HELPLINE_URL,detectDistress,careText,readFarewell,saveFarewell,createBreakTimer,safeStorage} from './care-core.js';
export {detectDistress} from './care-core.js';

function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;}

export function createCare({locale,petName,petKey,controls,stage,onGoodbye=()=>{},storage=safeStorage(),now=()=>Date.now()}){
 const t=(key,vars={})=>careText(locale(),key,{name:petName(),...vars});
 const breakDue=createBreakTimer({now});

 const row=element('div','care-row');
 const goodbyeButton=element('button','care-link');goodbyeButton.type='button';
 const helpButton=element('button','care-link');helpButton.type='button';
 row.append(goodbyeButton,helpButton);controls.append(row);

 const card=element('section','care-card');card.hidden=true;card.tabIndex=-1;card.setAttribute('role','region');card.setAttribute('aria-live','polite');
 const cardTitle=element('h2','care-card-title');cardTitle.id='care-card-title';card.setAttribute('aria-labelledby',cardTitle.id);
 const cardBody=element('p','care-card-body');const cardUrgent=element('p','care-card-urgent');
 const cardLink=element('a','care-card-link');cardLink.href=HELPLINE_URL;cardLink.target='_blank';cardLink.rel='noopener noreferrer';
 const cardClose=element('button','care-card-close');cardClose.type='button';cardClose.onclick=()=>{card.hidden=true;};
 card.append(cardTitle,cardBody,cardUrgent,cardLink,cardClose);document.body.append(card);
 let cardKind='help';

 const dialog=element('dialog','care-dialog');dialog.setAttribute('aria-labelledby','care-dialog-title');
 const form=element('form');form.method='dialog';
 const dialogTitle=element('h2');dialogTitle.id='care-dialog-title';const dialogIntro=element('p','care-dialog-intro');
 const letterLabel=element('label','care-letter-label');const letter=element('textarea','care-letter');letter.rows=6;letter.maxLength=4000;letterLabel.append(document.createElement('span'),letter);
 const actions=element('div','care-dialog-actions');
 const save=element('button','care-secondary');save.type='button';const cancel=element('button','care-secondary');cancel.type='button';const confirm=element('button','care-primary');confirm.type='submit';confirm.value='goodbye';
 actions.append(save,cancel,confirm);form.append(dialogTitle,dialogIntro,letterLabel,actions);dialog.append(form);document.body.append(dialog);

 const veil=element('div','care-veil');veil.hidden=true;const veilBox=element('div','care-veil-box');const veilTitle=element('h2');const veilBody=element('p');
 const veilStay=element('button','care-secondary');veilStay.type='button';const veilHome=element('a','care-primary');veilHome.href='/';
 veilBox.append(veilTitle,veilBody,veilStay,veilHome);veil.append(veilBox);(stage||document.body).append(veil);
 veilStay.onclick=()=>{veil.hidden=true;};

 const banner=element('div','care-banner');banner.hidden=true;banner.setAttribute('role','status');const bannerText=element('span');const bannerClose=element('button','care-secondary');bannerClose.type='button';banner.append(bannerText,bannerClose);
 bannerClose.onclick=()=>{banner.hidden=true;};controls.prepend(banner);
 let farewellDate=readFarewell(storage,petKey);

 function showCard(kind){
  cardKind=kind;render();card.classList.toggle('care-card-break',kind==='break');card.hidden=false;card.focus({preventScroll:true});
 }
 function downloadLetter(){
  const text=`${t('letterHeader')}\n${new Date(now()).toLocaleDateString(locale())}\n\n${letter.value.trim()}\n`;
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  link.download=`${t('letterHeader').replace(/[\\/:*?"<>|]+/g,' ').trim()}.txt`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
 }
 save.onclick=downloadLetter;cancel.onclick=()=>dialog.close('cancel');
 goodbyeButton.onclick=()=>{render();dialog.returnValue='';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');letter.focus();};
 helpButton.onclick=()=>showCard('help');
 dialog.addEventListener('close',()=>{
  if(dialog.returnValue!=='goodbye')return;
  const date=new Date(now());saveFarewell(storage,petKey,date);farewellDate=date.toISOString();letter.value='';
  onGoodbye(t('farewellLine'));veil.hidden=false;veilStay.focus({preventScroll:true});render();
 });

 function render(){
  goodbyeButton.textContent=t('goodbyeOpen');helpButton.textContent=t('helpOpen');
  if(cardKind==='break'){cardTitle.textContent=t('breakTitle');cardBody.textContent=t('breakBody');cardUrgent.hidden=true;cardLink.hidden=true;cardClose.textContent=t('breakClose');}
  else{cardTitle.textContent=t('helpTitle');cardBody.textContent=t('helpBody');cardUrgent.hidden=false;cardUrgent.textContent=t('helpUrgent');cardLink.hidden=false;cardLink.textContent=`${t('helpLink')} ↗`;cardClose.textContent=t('helpClose');}
  dialogTitle.textContent=t('goodbyeTitle');dialogIntro.textContent=t('goodbyeIntro');letterLabel.firstChild.textContent=t('goodbyeLabel');save.textContent=t('goodbyeSave');cancel.textContent=t('goodbyeCancel');confirm.textContent=t('goodbyeConfirm');
  veilTitle.textContent=t('veilTitle');veilBody.textContent=t('veilBody');veilStay.textContent=t('veilStay');veilHome.textContent=t('veilHome');
  if(farewellDate){bannerText.textContent=t('returnBanner',{date:new Date(farewellDate).toLocaleDateString(locale())});bannerClose.textContent=t('returnDismiss');}
 }
 if(farewellDate)banner.hidden=false;
 render();

 return {
  // Returns a fixed caption when the message needs real-world support instead of an AI reply.
  check(text){if(!detectDistress(text))return null;showCard('help');return t('reply');},
  noteActivity(){if(breakDue()&&card.hidden)showCard('break');},
  render
 };
}
