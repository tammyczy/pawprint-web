// Narrow, explicit questions about chat privacy get a fact-checked response.
// This is not a general intent detector. Anything outside these short patterns
// remains with the normal model and its existing safety handling.
import {detectDistress} from '../src/care-core.js';

const questions = [
 /^(?:你|网站|網站|平台|系统|系統|pawprint)(?:会|會|能|能不能|是否|是不是|可不可以)?(?:自动|自動|主动|主動|偷偷)?(?:把)?(?:我(?:们|們)?(?:的)?(?:说的话|說的話|对话|對話|聊天记录|聊天記錄|聊天|话|話|内容|內容|回忆|回憶)|这些话|這些話|这段对话|這段對話)(?:发送|發送|告诉|告訴|分享|转发|轉發|发|發|给|給)(?:(?:给|給)?(?:我(?:们|們)?(?:的)?)?)?(?:家人|父母|爸妈|爸媽|父亲|父親|母亲|母親)(?:吗|嗎|么|麼|呢)?$/iu,
 /^(?:你|网站|網站|平台|pawprint)(?:会|會|能|能不能|是否|是不是|可不可以)?(?:自动|自動|主动|主動|偷偷)?(?:告诉|告訴|通知)(?:我(?:的)?)?(?:家人|父母|爸妈|爸媽)(?:吗|嗎|么|麼|呢)?$/iu,
 /^(?:(?:will|would|can|do)\s+(?:you|pawprint)|(?:are|is)\s+(?:you|pawprint)\s+going\s+to)\s+(?:automatically\s+)?(?:tell|notify|send|share)(?:\s+(?:my|the|this|our|conversation|messages?|chat|chats|words|family|parents|mom|mum|dad|to|with|about|them)){1,12}(?:\s+i\s+talk\s+to\s+you)?$/iu,
 /^(?:is|are)\s+(?:this|my|our|the)\s+(?:chat|chats|conversation|messages?)\s+(?:private|confidential|secret)$/iu,
 /^(?:can|will|would)\s+you\s+keep\s+(?:this|it|our\s+conversation|my\s+messages?)\s+(?:private|confidential|secret)$/iu,
 /^(?:est[- ]ce que\s+)?(?:tu|vous)\s+(?:(?:vas|allez)\s+)?(?:le\s+)?(?:raconter|raconteras|dire|diras|envoyer|enverras|partager|partageras)(?:\s+(?:ma|mes|mon|notre|la|les|conversation|conversations|messages?|paroles|souvenirs|à|a|aux|parents|famille|mère|père|mere|pere|tes|vos|leur)){1,14}$/iu,
 /^(?:est[- ]ce que\s+)?(?:cette|notre|ma)\s+(?:conversation|discussion)\s+(?:est|reste)\s+(?:privée|privee|confidentielle|secrète|secrete)$/iu
];

export function privacyReply(text) {
 if(typeof text!=='string') return null;
 // Never swallow an additional statement, quoted passage or other question.
 // Semantically mixed messages go through the ordinary model/safety path.
 const value=text.trim().replace(/[?？!！。.]\s*$/u,'').trim().replace(/\s+/g,' ');
 if(!value||detectDistress(value)||/[?？!！。.,，;；:“”"'«»\n]/u.test(value))return null;
 if(!questions.some(pattern=>pattern.test(value)))return null;
 let caption;
 if(/[\u3400-\u9fff]/u.test(value)){
  const traditional=/[會網們說話對發告訴轉給麼嗎這記錄容憶親統]/u.test(value);
  caption=traditional?'Pawprint 不會自動把聊天發給家人。AI 文字對話會傳送給 OpenAI，服務供應商和網站營運者可能處理資料，因此無法保證絕對保密；你可以自己決定要向誰分享。':'Pawprint 不会自动把聊天发给家人。AI 文字对话会发送给 OpenAI，服务提供商和网站运营者可能处理数据，因此无法保证绝对保密；你可以自己决定向谁分享。';
 }else if(/^(?:est[- ]ce que|tu|vous|cette|notre|ma)\b/iu.test(value)){
  caption='Pawprint n’envoie pas automatiquement les conversations à ta famille. Les messages de chat IA sont envoyés à OpenAI et peuvent être traités par le fournisseur et l’exploitant du site : leur confidentialité absolue ne peut pas être garantie ; tu choisis à qui les partager.';
 }else{
  caption='Pawprint does not automatically send chats to your family. AI chat messages are sent to OpenAI and may be processed by the provider and site operator, so absolute confidentiality cannot be guaranteed; you choose whom to share with.';
 }
 return {caption,action:null,sound:null,source:'system-privacy'};
}
