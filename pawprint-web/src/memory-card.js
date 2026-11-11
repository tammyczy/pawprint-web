import {createMemoryDraftClient} from './memory-draft.js';

const copy={
 zh:{title:'留下一段回忆',sub:'写一点关于它的事，原文可以直接下载。',intro:'一件小事、一句话，或者暂时什么都不写，都可以。这里的文字只在当前页面中保留；刷新或关闭后不会自动保存。',label:'你想记住什么？',placeholder:'例如：她喜欢趴在窗边。',count:'最多 1200 个字符',raw:'下载我的原文',clear:'清空原文',privacy:'选择 AI 整理时，这段文字会发送给 OpenAI。删除本页文字不会自动删除服务商可能保留的数据。请只填写你愿意发送的内容。',consent:'我了解并同意将这段文字发送给 OpenAI。',generate:'用 AI 整理',cancel:'取消生成',busy:'正在整理，你可以随时取消。',success:'草稿已生成，请逐句核对。',failed:'AI 整理暂时不可用。你的原文仍在这里，可以直接下载或稍后再试。',edited:'你正在编辑草稿，请再次核对事实。',compare:'AI 草稿与原文',review:'引用只是核对线索，AI 仍可能改错或遗漏事实。请检查并修改后再使用。如需重新生成，请先下载需要保留的草稿，再丢弃当前草稿。',draftLabel:'可编辑的草稿',source:'对应的原文',discard:'丢弃草稿',download:'下载草稿',empty:'请先写一点想保存的回忆。',aborted:'已停止等待；已发送的文字仍可能由服务商处理。',stale:'原文已改变；之前的草稿和引用仍保留，下方引用不对应当前原文。',staleCompare:'之前的草稿与原文',staleReview:'原文已改变或清空，下方草稿和引用仍对应修改前的原文，不代表当前原文。你可以下载保留，或丢弃草稿（连同旧引用）后重新生成。',previousSource:'修改前的原文（非当前原文）'},
 en:{title:'Keep a memory',sub:'Write a little about them; you can download your own words.',intro:'A small moment, a sentence, or nothing for now: it is your choice. Text stays on this page only and is not automatically saved after a refresh or close.',label:'What would you like to remember?',placeholder:'For example: She liked to rest by the window.',count:'Up to 1,200 characters',raw:'Download my words',clear:'Clear my words',privacy:'If you choose AI, this text is sent to OpenAI. Deleting it here does not automatically delete data the provider may retain. Share only what you are comfortable sending.',consent:'I understand and agree to send this text to OpenAI.',generate:'Make an AI draft',cancel:'Cancel',busy:'Making a draft. You can cancel at any time.',success:'Draft ready. Please check each sentence.',failed:'AI drafting is unavailable. Your original words are still here; download them or try again later.',edited:'You are editing the draft. Please check the facts again.',compare:'AI draft and your words',review:'Sources are clues for your review; AI may change or omit facts. Please check and edit before using. To generate again, download the draft if you want to keep it, then discard it.',draftLabel:'Editable draft',source:'Your original words',discard:'Discard draft',download:'Download draft',empty:'Write a little memory first.',aborted:'Stopped waiting; text already sent may still be processed by the provider.',stale:'Your words changed; the previous draft and quotes remain, but no longer match the current text.',staleCompare:'Previous draft and original words',staleReview:'The original was changed or cleared. The draft and quotes below refer to the earlier text, not the current text. Download the draft to keep it, or discard it and its old quotes before generating again.',previousSource:'Earlier original words (not the current text)'},
 fr:{title:'Garder un souvenir',sub:'Écrivez quelques mots ; vous pouvez télécharger votre texte.',intro:'Un petit moment, une phrase, ou rien pour l’instant : à vous de choisir. Le texte reste sur cette page et n’est pas enregistré automatiquement après actualisation ou fermeture.',label:'Que souhaitez-vous garder en mémoire ?',placeholder:'Par exemple : Elle aimait se reposer près de la fenêtre.',count:'1 200 caractères maximum',raw:'Télécharger mon texte',clear:'Effacer mon texte',privacy:'Si vous choisissez l’IA, ce texte sera envoyé à OpenAI. Le supprimer ici n’efface pas automatiquement les données éventuellement conservées par le fournisseur. Ne partagez que ce que vous acceptez d’envoyer.',consent:'Je comprends et accepte d’envoyer ce texte à OpenAI.',generate:'Créer un brouillon IA',cancel:'Annuler',busy:'Création du brouillon. Vous pouvez annuler à tout moment.',success:'Brouillon prêt. Vérifiez chaque phrase.',failed:'Le brouillon IA est indisponible. Votre texte reste ici ; téléchargez-le ou réessayez plus tard.',edited:'Vous modifiez le brouillon. Vérifiez à nouveau les faits.',compare:'Brouillon IA et votre texte',review:'Les citations facilitent la vérification ; l’IA peut modifier ou omettre des faits. Vérifiez et corrigez avant utilisation. Pour recommencer, téléchargez le brouillon si vous souhaitez le garder, puis effacez-le.',draftLabel:'Brouillon modifiable',source:'Votre texte original',discard:'Effacer le brouillon',download:'Télécharger le brouillon',empty:'Écrivez d’abord un petit souvenir.',aborted:'Attente interrompue ; le texte déjà envoyé peut encore être traité par le fournisseur.',stale:'Votre texte a changé ; le brouillon et les citations précédents restent affichés, mais ne correspondent plus au texte actuel.',staleCompare:'Brouillon et texte précédents',staleReview:'Le texte original a été modifié ou effacé. Le brouillon et les citations ci-dessous correspondent au texte précédent, pas au texte actuel. Téléchargez le brouillon pour le conserver, ou effacez-le avec les anciennes citations avant de recommencer.',previousSource:'Texte original précédent (pas le texte actuel)'}
};

export function createMemoryCard({container,locale,fetchImpl=fetch,requestTimeoutMs=25000}){
 if(!container)return {render(){}};
 const client=createMemoryDraftClient({fetchImpl,timeoutMs:requestTimeoutMs});
 // This skeleton is static; user and provider text are assigned via .value or .textContent.
 container.innerHTML='<details><summary><span class="memory-title"></span><span class="memory-sub"></span></summary><div class="memory-content"><p class="memory-intro"></p><label class="memory-label" for="memory-original"></label><textarea id="memory-original" rows="5" maxlength="1200"></textarea><small class="memory-count"></small><div class="memory-actions"><button class="memory-raw" type="button"></button><button class="memory-clear" type="button"></button></div><div class="memory-ai"><p class="memory-privacy"></p><label class="memory-consent"><input type="checkbox"><span></span></label><div class="memory-actions"><button class="memory-generate" type="button"></button><button class="memory-cancel" type="button" hidden></button></div><p class="memory-status" role="status" aria-live="polite"></p></div><section class="memory-result" hidden><h3></h3><p class="memory-review"></p><div class="memory-rows"></div><div class="memory-actions"><button class="memory-download" type="button"></button><button class="memory-discard" type="button"></button></div></section></div></details>';
 const el=s=>container.querySelector(s),details=el('details'),original=el('#memory-original'),consent=el('.memory-consent input'),generate=el('.memory-generate'),cancel=el('.memory-cancel'),raw=el('.memory-raw'),result=el('.memory-result'),rows=el('.memory-rows'),download=el('.memory-download'),status=el('.memory-status');
 let busy=false,statusKey='',sentences=[],draftStale=false,ticket=0,lastLocale=locale();
 const t=()=>copy[locale()]||copy.en;
 function enabled(){raw.disabled=!original.value.trim();el('.memory-clear').disabled=!original.value;generate.disabled=busy||!original.value.trim()||!consent.checked||sentences.length>0;cancel.hidden=!busy;download.disabled=!sentences.some((_,i)=>rows.querySelector(`#memory-draft-${i}`)?.value.trim());}
 function clearDraft(){sentences=[];draftStale=false;rows.replaceChildren();result.hidden=true;}
 function stop(key){ticket++;client.cancel();busy=false;if(key)statusKey=key;render();}
 function save(text,filename){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text+'\n'],{type:'text/plain;charset=utf-8'}));link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
 function drawRows(){
  rows.replaceChildren();
  sentences.forEach((sentence,index)=>{
   const row=document.createElement('div');row.className='memory-row';
   const draft=document.createElement('div'),label=document.createElement('label'),textarea=document.createElement('textarea');label.htmlFor=textarea.id=`memory-draft-${index}`;label.className='memory-row-label';label.textContent=t().draftLabel;textarea.rows=3;textarea.maxLength=600;textarea.value=sentence.text;
   textarea.addEventListener('input',()=>{statusKey='edited';renderStatus();enabled();});draft.append(label,textarea);
   const source=document.createElement('div'),sourceLabel=document.createElement('span'),quote=document.createElement('blockquote');sourceLabel.className='memory-row-label';sourceLabel.textContent=t().source;quote.textContent=sentence.source;source.append(sourceLabel,quote);row.append(draft,source);rows.append(row);
  });
 }
 function renderStatus(){status.textContent=statusKey?t()[statusKey]:'';}
 function render(){
  if(lastLocale!==locale()){lastLocale=locale();if(busy){ticket++;client.cancel();busy=false;statusKey='aborted';}}
  const c=t();container.setAttribute('aria-label',c.title);
  for(const [selector,key] of [['.memory-title','title'],['.memory-sub','sub'],['.memory-intro','intro'],['.memory-label','label'],['.memory-count','count'],['.memory-raw','raw'],['.memory-clear','clear'],['.memory-privacy','privacy'],['.memory-consent span','consent'],['.memory-generate','generate'],['.memory-cancel','cancel'],['.memory-result h3','compare'],['.memory-review','review'],['.memory-download','download'],['.memory-discard','discard']])el(selector).textContent=c[key];
  original.placeholder=c.placeholder;
  if(draftStale){el('.memory-result h3').textContent=c.staleCompare;el('.memory-review').textContent=c.staleReview;}
  rows.querySelectorAll('.memory-row').forEach(row=>{row.querySelector('label').textContent=c.draftLabel;row.querySelector('.memory-row-label:not(label)').textContent=draftStale?c.previousSource:c.source;});
  renderStatus();enabled();
 }
 function changedOriginal(){const wasBusy=busy;ticket++;client.cancel();busy=false;consent.checked=false;if(sentences.length){draftStale=true;statusKey='stale';}else statusKey=wasBusy?'aborted':'';render();}
 original.addEventListener('input',changedOriginal);
 el('.memory-clear').addEventListener('click',()=>{original.value='';changedOriginal();original.focus();});
 consent.addEventListener('change',()=>{if(!consent.checked&&busy)stop('aborted');else enabled();});
 details.addEventListener('toggle',()=>{if(!details.open&&busy)stop('aborted');});
 raw.addEventListener('click',()=>{if(original.value.trim())save(original.value.trim(),'pawprint-memory-original.txt');});
 el('.memory-discard').addEventListener('click',()=>{clearDraft();statusKey='';render();});
 download.addEventListener('click',()=>{const text=sentences.map((_,i)=>rows.querySelector(`#memory-draft-${i}`).value.trim()).filter(Boolean).join('\n');if(text)save(text,'pawprint-memory-draft.txt');});
 cancel.addEventListener('click',()=>stop('aborted'));
 generate.addEventListener('click',async()=>{
  if(!original.value.trim()){statusKey='empty';render();return;}if(!consent.checked||busy||sentences.length)return;
  busy=true;statusKey='busy';const current=++ticket;render();
  try{const output=await client.generate(original.value,locale());if(current!==ticket||!output)return;sentences=output;drawRows();result.hidden=false;statusKey='success';}
  catch{if(current===ticket)statusKey='failed';}
  finally{if(current===ticket){busy=false;render();}}
 });
 clearDraft();render();return {render};
}
