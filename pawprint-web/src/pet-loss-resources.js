// Independent organizations; listing them does not imply a partnership.
const resources=[
 {href:'https://bcbh.ca/grief-support/pet-loss-support/',key:'bc'},
 {href:'https://pettrust.ca/pet-loss-support/',key:'ovc'},
 {href:'https://www.vet.cornell.edu/about-us/outreach/pet-loss-support-hotline',key:'cornell'}
];

export const resourceCopy={
 zh:{open:'宠物离世后，可以去哪里寻找支持？',intro:'每个人的感受和需要都不同。你可以找信任的人聊聊，也可以看看这些独立机构提供的资料和支持。',note:'以下网页主要为英文。服务时间、费用、资格和可用性可能变化，请以机构官网为准；这些链接通向外部机构。信息核对：2026 年 11 月。',bc:'加拿大卑诗省 · PAWS：宠物离世线上支持小组，面向 BC 省 18 岁以上人士；建议捐助 150 加元，可申请补贴。开班时间请查官网。',ovc:'加拿大 · OVC Pet Trust：宠物离世指南、视频和其他资源；兽医社会工作服务面向 OVC 客户。',cornell:'美国 · Cornell 兽医学院：宠物离世资料、其他支持组织和由受训兽医学生志愿者提供的电话支持；服务时间请查官网。'},
 en:{open:'Where can I find support after pet loss?',intro:'Everyone’s experience is different. You may want to talk to someone you trust or explore these independent organizations.',note:'The linked pages are mainly in English. Hours, costs, eligibility and availability may change; please check each organization’s website. These links lead to external organizations. Checked November 2026.',bc:'Canada, British Columbia · PAWS: an online pet-loss group for adults 18+ in BC; a $150 contribution is requested, with subsidies available. Check the website for the next group.',ovc:'Canada · OVC Pet Trust: pet-loss guides, videos and other resources; veterinary social work is for OVC clients.',cornell:'United States · Cornell College of Veterinary Medicine: pet-loss information, other support organizations and a telephone service staffed by trained veterinary student volunteers. Check the website for current hours.'},
 fr:{open:'Où trouver du soutien après la perte d’un animal ?',intro:'Chaque expérience est différente. Tu peux parler à une personne de confiance ou consulter ces organismes indépendants.',note:'Les pages proposées sont principalement en anglais. Les horaires, frais, conditions et disponibilités peuvent changer ; consulte les sites des organismes. Ces liens mènent vers des organismes externes. Informations vérifiées en novembre 2026.',bc:'Canada, Colombie-Britannique · PAWS : groupe de soutien en ligne pour les adultes de 18 ans et plus vivant en C.-B. Une contribution de 150 $ est demandée, avec des subventions possibles. Consulte le site pour la prochaine session.',ovc:'Canada · OVC Pet Trust : guides, vidéos et autres ressources sur la perte d’un animal ; le service de travail social vétérinaire s’adresse aux clients de l’OVC.',cornell:'États-Unis · Faculté vétérinaire de Cornell : informations, autres organismes de soutien et écoute téléphonique assurée par des étudiants vétérinaires bénévoles formés. Consulte le site pour les horaires actuels.'}
};

export function createPetLossResources({container,locale,documentImpl=document}){
 const root=documentImpl.createElement('details');root.className='pet-loss-resources';
 const summary=documentImpl.createElement('summary');summary.className='care-link';
 const intro=documentImpl.createElement('p'),list=documentImpl.createElement('ul'),note=documentImpl.createElement('p');
 note.className='pet-loss-note';
 const links=resources.map(({href,key})=>{
  const item=documentImpl.createElement('li'),link=documentImpl.createElement('a');
  link.href=href;link.target='_blank';link.rel='noopener noreferrer';
  item.append(link);list.append(item);return {key,link};
 });
 root.append(summary,intro,list,note);container.append(root);
 function render(){
  const copy=resourceCopy[locale()]||resourceCopy.en;
  summary.textContent=copy.open;intro.textContent=copy.intro;note.textContent=copy.note;
  for(const {key,link} of links)link.textContent=copy[key];
 }
 render();return {render,destroy:()=>root.remove()};
}
