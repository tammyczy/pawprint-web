const copy={
 zh:{webgl:'此浏览器暂时无法显示 3D。请尝试启用硬件加速或更换浏览器。',context:'3D 显示中断了，请重新加载页面。',timeout:'蓝老的模型加载长时间没有进展，请检查网络后重试。',model:'蓝老暂时无法加载。请检查网络连接，或稍后重新加载页面。',animation:'蓝老的动作暂时无法加载，请稍后重新加载页面。',note:'刷新会清除尚未下载的回忆原文和草稿，请先下载需要保留的内容。',retry:'重新加载页面',state:'3D 暂不可用'},
 en:{webgl:'This browser cannot display 3D right now. Try enabling hardware acceleration or using another browser.',context:'The 3D display was interrupted. Please reload the page.',timeout:'Lanlao’s model has stopped making progress. Check your connection and try again.',model:'Lanlao could not load right now. Check your connection or reload the page later.',animation:'Lanlao’s movements could not load right now. Please reload the page later.',note:'Reloading clears memory text and drafts that have not been downloaded. Download anything you want to keep first.',retry:'Reload page',state:'3D unavailable'},
 fr:{webgl:'Ce navigateur ne peut pas afficher la 3D pour le moment. Activez l’accélération matérielle ou essayez un autre navigateur.',context:'L’affichage 3D a été interrompu. Actualisez la page.',timeout:'Le chargement du modèle de Lanlao ne progresse plus. Vérifiez votre connexion et réessayez.',model:'Lanlao ne peut pas être chargé pour le moment. Vérifiez votre connexion ou actualisez la page plus tard.',animation:'Les mouvements de Lanlao ne peuvent pas être chargés pour le moment. Actualisez la page plus tard.',note:'L’actualisation efface les souvenirs et brouillons non téléchargés. Téléchargez d’abord ce que vous souhaitez garder.',retry:'Actualiser la page',state:'3D indisponible'}
};

// The failure overlay is separate from the memory card, which stays usable.
export function createLanlaoViewerFailure({loading,state,locale,reload,document}){
 let code=null;
 function render(){
  if(!code)return;
  const text=copy[locale()]||copy.en;
  const title=document.createElement('b'),note=document.createElement('span'),button=document.createElement('button');
  title.textContent=text[code]||text.model;note.textContent=text.note;button.textContent=text.retry;
  button.type='button';button.onclick=reload;
  loading.classList.remove('hidden');loading.setAttribute('role','alert');loading.replaceChildren(title,note,button);
  state.textContent=text.state;
 }
 return {show(value){code=value;render();},render};
}

// Recognition may deliver a final result after an abort; reject it before any side effects.
export function guardLanlaoInput({isAvailable,handle}){
 return (...args)=>{if(!isAvailable())return;return handle(...args);};
}
