import {locale, tr} from './i18n.js';
import {modelingPlan, PHOTO_VIEWS} from '../server/modeling-plan.mjs';

const messages = {
 zh: {
  quality: '模型质量', standard: '标准', detail: '高细节',
  direct: '使用原照（1–4 张）', generated_views: '先补 AI 视角',
  estimate: '建模和四足绑定预计 {credits} Tripo 积分。蓝老动作在本机适配。',
  guideDirect: '尽量选同一只宠物以同样姿势站立的全身照。四条腿和尾巴清楚可见时，照片更适合用于建模。',
  guideGenerated: '上传一张正面照。系统会生成几个推测视角供你挑选，正面会始终使用原照。',
  fileLimits: 'JPEG、PNG 或 WebP。每张最多 10 MB，至少 256 × 256 像素。',
  front: '正面', left: '左侧', back: '背面', right: '右侧',
  photoCheck: '照片检查 · {used}/{total} 张真实参考图可用',
  duplicate: '与{match}完全相同，建模会使用该照片一次。',
  similar: '与{match}很接近。核对它是否确实展示了另一侧。',
  small: '分辨率偏低，短边建议至少 640 像素。',
  low_detail: '可见细节较少，核对对焦和取景。', dark: '整体偏暗，核对毛色是否清晰。', bright: '大片区域过亮，核对毛发细节。',
  inputReview: '核对参考图', original: '真实正面照', synthetic: 'AI 推测 · {view}', demoView: '示范 · {view}', useView: '采用{view}图', usedView: '已采用',
  reviewGuide: '对照真实正面照，勾选毛色、花纹和体型可信的侧面或背面。也可以直接用原照继续。',
  approveSelection: '使用原照和已选视角', approveOriginal: '使用原照继续',
  staticModel: '查看静态模型 ↗', animatedModel: '查看行走模型 ↗',
  invalid_base: '基础模型未通过文件检查，需要人工复核。',
  no_coat: '可预览静态模型。请检查缺失的毛色细节。',
  anatomy_review: '基础模型有疑似多余肢体。请旋转查看四只脚和尾巴。',
  rig_unavailable: '可预览彩色模型。骨骼检查未确认四足结构。',
  rig_failed: '四足绑定或行走未完成，可预览彩色基础模型。',
  invalid_walk: '行走模型未通过技术验收，可预览彩色基础模型。',
  motion_review: '蓝老动作与这个骨架的适配需要复核，可预览彩色基础模型。',
  lanlaoMotion: '已使用蓝老的动作模板。',
  animated: '文件、毛色数据和骨骼动作通过检查。请核对长相和行走表现。',
  meshFaces: '{faces} 个三角面', denseMesh: '面数较高，建议在手机上检查流畅度。',
 },
 en: {
  quality: 'Model detail', standard: 'Standard', detail: 'High detail',
  direct: 'Original photos (1–4 views)', generated_views: 'Suggest angles with AI',
  estimate: 'Modeling and rigging are estimated at {credits} Tripo credits. Lanlao’s movements are fitted locally.',
  guideDirect: 'Choose full-body photos of the same pet standing in a consistent pose. Use views that show all four legs and the tail where possible.',
  guideGenerated: 'Start with one front photo. You can choose which AI-suggested angles to add. We always use your real front photo.',
  fileLimits: 'JPEG, PNG or WebP. Up to 10 MB per photo. Minimum 256 × 256 pixels.',
  front: 'Front', left: 'Left', back: 'Back', right: 'Right',
  photoCheck: 'Photo check · {used}/{total} real views to use',
  duplicate: 'Identical to the {match} photo. This image is used once.',
  similar: 'Looks like the {match} photo. Check that this shows a different angle.',
  small: 'Low resolution. Aim for at least 640 pixels on the short side.',
  low_detail: 'Little detail is visible. Check focus and framing.', dark: 'Dark overall. Check that coat colors are visible.', bright: 'Large areas are very bright. Check that fur detail is visible.',
  inputReview: 'Review reference views', original: 'Real front photo', synthetic: 'AI estimate · {view}', demoView: 'Demo · {view}', useView: 'Use {view} view', usedView: 'Used',
  reviewGuide: 'Compare with your real photo. Select the side and back views that match the coat, markings and shape, or continue with the original alone.',
  approveSelection: 'Use original and selected views', approveOriginal: 'Continue with original photo',
  staticModel: 'View still model ↗', animatedModel: 'View walking model ↗',
  invalid_base: 'The base model needs manual review after failing the file check.',
  no_coat: 'A still model is available. Check the missing coat details.',
  anatomy_review: 'The base model may have an extra limb. Rotate the preview and check the four paws and tail.',
  rig_unavailable: 'The colored model is available. The rig check did not confirm a four-leg skeleton.',
  rig_failed: 'Rigging or walking could not finish. The colored base model is available.',
  invalid_walk: 'The walking model failed technical review. The colored base model is available.',
  motion_review: 'The fit of Lanlao’s movements needs review. The colored base model is available.',
  lanlaoMotion: 'Uses Lanlao’s movement template.',
  animated: 'File, coat data and skeleton animation passed the checks. Review likeness and gait.',
  meshFaces: '{faces} triangles', denseMesh: 'This model has many triangles. Check playback on a phone.',
 },
 fr: {
  quality: 'Détail du modèle', standard: 'Standard', detail: 'Haute définition',
  direct: 'Photos originales (1 à 4 vues)', generated_views: 'Angles suggérés par IA',
  estimate: 'La modélisation et le squelette sont estimés à {credits} crédits Tripo. Les mouvements de Lanlao sont adaptés localement.',
  guideDirect: 'Choisissez des photos en pied du même animal debout dans une posture similaire. Montrez les quatre pattes et la queue si possible.',
  guideGenerated: 'Commencez par une photo de face et choisissez les angles suggérés par l’IA. Votre photo de face est toujours utilisée.',
  fileLimits: 'JPEG, PNG ou WebP. 10 Mo maximum par photo. Taille minimale de 256 × 256 pixels.',
  front: 'Face', left: 'Gauche', back: 'Arrière', right: 'Droite',
  photoCheck: 'Vérification · {used}/{total} vues réelles utilisées',
  duplicate: 'Photo identique à la vue {match}. Elle est utilisée une seule fois.',
  similar: 'Cette photo ressemble à la vue {match}. Vérifiez que l’angle est différent.',
  small: 'Faible résolution. Visez au moins 640 pixels sur le côté le plus court.',
  low_detail: 'Peu de détails visibles. Vérifiez la mise au point et le cadrage.', dark: 'Photo sombre. Vérifiez que les couleurs du pelage se distinguent.', bright: 'Des zones sont très claires. Vérifiez les détails du pelage.',
  inputReview: 'Vérifier les vues de référence', original: 'Vraie photo de face', synthetic: 'Estimation IA · {view}', demoView: 'Démo · {view}', useView: 'Utiliser la vue {view}', usedView: 'Utilisée',
  reviewGuide: 'Comparez avec votre photo. Sélectionnez les vues qui respectent le pelage, les marques et la silhouette, ou continuez avec la photo originale seule.',
  approveSelection: 'Utiliser la photo et les vues sélectionnées', approveOriginal: 'Continuer avec la photo originale',
  staticModel: 'Voir le modèle fixe ↗', animatedModel: 'Voir le modèle en marche ↗',
  invalid_base: 'Le modèle de base doit être examiné après l’échec de la vérification du fichier.',
  no_coat: 'Un modèle fixe est disponible. Vérifiez les détails manquants du pelage.',
  anatomy_review: 'Le modèle de base pourrait présenter une patte en trop. Faites pivoter le modèle pour vérifier les quatre pattes et la queue.',
  rig_unavailable: 'Le modèle coloré est disponible. Le contrôle n’a pas confirmé un squelette à quatre pattes.',
  rig_failed: 'Le squelette ou la marche a échoué. Le modèle de base coloré est disponible.',
  invalid_walk: 'Le modèle en marche a échoué au contrôle technique. Le modèle de base coloré est disponible.',
  motion_review: 'L’adaptation des mouvements de Lanlao doit être vérifiée. Le modèle de base coloré est disponible.',
  lanlaoMotion: 'Utilise les mouvements de Lanlao.',
  animated: 'Fichier, données du pelage et animation du squelette contrôlés. Vérifiez la ressemblance et la marche.',
  meshFaces: '{faces} triangles', denseMesh: 'Ce modèle contient beaucoup de triangles. Vérifiez la fluidité sur téléphone.',
 },
};

export function modelingText(key, values = {}) {
 return (messages[locale()][key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

export function attachModelingInputs({form, photoHost, notify}) {
 const fileHint = form.querySelector('.hint');
 const controls = document.createElement('div');
 controls.className = 'modeling-controls';
 const addSelect = (name, options) => {
  const label = document.createElement('label'), title = document.createElement('span');
  const select = document.createElement('select');
  select.name = name;
  for (const value of options) select.add(new Option('', value));
  label.append(title, select);
  controls.append(label);
  return {title, select};
 };
 const {title: routeTitle, select: route} = addSelect('mode', ['direct', 'generated_views']);
 const {title: qualityTitle, select: quality} = addSelect('modelProfile', ['standard', 'detail']);
 const guide = document.createElement('p'), estimate = document.createElement('output');
 guide.className = 'modeling-guide';
 estimate.className = 'modeling-estimate';
 estimate.setAttribute('aria-live', 'polite');
 controls.append(guide, estimate);
 photoHost.before(controls);

 const photos = PHOTO_VIEWS.map(view => {
  const box = document.createElement('label'), title = document.createElement('b');
  const input = document.createElement('input'), thumbnail = document.createElement('img');
  box.className = 'photo';
  input.type = 'file';
  input.name = view;
  input.accept = 'image/png,image/jpeg,image/webp';
  input.required = view === 'front';
  thumbnail.hidden = true;
  thumbnail.alt = '';
  let url;
  const clear = () => {
   if (url) URL.revokeObjectURL(url);
   url = undefined;
   thumbnail.removeAttribute('src');
   thumbnail.hidden = true;
  };
  input.addEventListener('change', () => {
   clear();
   const file = input.files[0];
   if (!file) return;
   if (file.size > 10 * 1024 * 1024) {
    notify(tr('tooLarge'));
    input.value = '';
    return;
   }
   url = URL.createObjectURL(file);
   thumbnail.src = url;
   thumbnail.hidden = false;
  });
  box.append(title, input, thumbnail);
  photoHost.append(box);
  return {view, box, title, input, clear};
 });

 function render() {
  const generated = route.value === 'generated_views';
  routeTitle.textContent = tr('route');
  for (const option of route.options) option.textContent = modelingText(option.value);
  qualityTitle.textContent = modelingText('quality');
  for (const option of quality.options) option.textContent = modelingText(option.value);
  guide.textContent = modelingText(generated ? 'guideGenerated' : 'guideDirect');
  fileHint.textContent = modelingText('fileLimits');
  estimate.textContent = modelingText('estimate', {credits: modelingPlan(quality.value, route.value).estimate});
  for (const {view, box, title, input} of photos) {
   title.textContent = tr(view);
   box.hidden = input.disabled = generated && view !== 'front';
  }
 }
 route.addEventListener('change', render);
 quality.addEventListener('change', render);
 form.addEventListener('reset', () => {
  for (const photo of photos) photo.clear();
  queueMicrotask(render);
 });
 return {render};
}

export function photoReviewDetails(review, open = false) {
 const details = document.createElement('details'), summary = document.createElement('summary');
 const entries = Object.entries(review.views);
 details.className = 'modeling-review';
 details.open = open && entries.some(([, photo]) => photo.issues.length);
 summary.textContent = modelingText('photoCheck', {used: review.usedViews.length, total: entries.length});
 const list = document.createElement('ul');
 for (const [view, photo] of entries) {
  const row = document.createElement('li'), label = document.createElement('b');
  label.textContent = modelingText(view);
  const warnings = photo.issues.map(issue => modelingText(issue, {match: modelingText(photo.matches ?? '').toLowerCase()}));
  row.append(label, ` · ${photo.width} × ${photo.height}${warnings.length ? ` · ${warnings.join(' ')}` : ''}`);
  list.append(row);
 }
 details.append(summary, list);
 return details;
}

export function syntheticReview(job, selection, approveButton) {
 const section = document.createElement(approveButton ? 'section' : 'details');
 section.className = 'modeling-review';
 const heading = document.createElement(approveButton ? 'h4' : 'summary');
 heading.textContent = modelingText('inputReview');
 section.append(heading);
 if (approveButton) {
  const guide = document.createElement('p');
  guide.textContent = modelingText('reviewGuide');
  section.append(guide);
 }
 const gallery = document.createElement('div');
 gallery.className = 'modeling-views';
 const base = `/api/jobs/${encodeURIComponent(job.id)}`;
 function appendView(title, url, view) {
  const figure = document.createElement('figure'), link = document.createElement('a');
  const photo = document.createElement('img'), caption = document.createElement('figcaption');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  photo.src = url;
  photo.alt = title;
  photo.loading = 'lazy';
  caption.textContent = title;
  link.append(photo);
  figure.append(link, caption);
  if (view && view !== 'front' && approveButton) {
   const label = document.createElement('label'), checkbox = document.createElement('input');
   checkbox.type = 'checkbox';
   checkbox.value = view;
   checkbox.checked = selection.has(view);
   checkbox.addEventListener('change', () => {
    if (checkbox.checked) selection.add(view);
    else selection.delete(view);
    approveButton.textContent = modelingText(selection.size ? 'approveSelection' : 'approveOriginal');
   });
   label.append(checkbox, ` ${modelingText('useView', {view: modelingText(view).toLowerCase()})}`);
   figure.append(label);
  } else if (view && job.approvedSyntheticViews?.includes(view)) {
   const used = document.createElement('small');
   used.textContent = modelingText('usedView');
   figure.append(used);
  }
  gallery.append(figure);
 }
 appendView(modelingText('original'), `${base}/photo/front`);
 for (const view of PHOTO_VIEWS.filter(view => job.generatedViews?.includes(view))) {
  appendView(modelingText(job.mock ? 'demoView' : 'synthetic', {view: modelingText(view)}), `${base}/generated-view/${view}`, view);
 }
 section.append(gallery);
 if (approveButton) section.append(approveButton);
 return section;
}

export function modelReviewText(job) {
 if (!job.modelReview) return '';
 const text = [modelingText(job.modelReview.result)];
 if (job.report?.motionTemplate === 'lanlao') text.push(modelingText('lanlaoMotion'));
 if (job.report?.triangles) text.push(modelingText('meshFaces', {faces: new Intl.NumberFormat(locale()).format(job.report.triangles)}));
 if (job.modelReview.issues.includes('dense_mesh')) text.push(modelingText('denseMesh'));
 return text.join(' ');
}
