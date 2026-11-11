// Web Speech error codes describe recognition failures, not necessarily their cause.
const messages={
 en:{'not-allowed':'Microphone permission was not granted. Check browser and device permissions, then try again or type.','audio-capture':'The microphone could not be accessed. Check that a microphone is connected and available, or type.','network':'Speech recognition could not connect. Check your connection or type instead.','no-speech':'No speech was detected. Try again or type instead.','service-not-allowed':'The speech recognition service is unavailable or not permitted. Type instead.','aborted':'Listening stopped.','unsupported':'This browser does not support speech recognition. Please type or use a button.','start':'Speech recognition could not start. Try again or type instead.','timeout':'Speech recognition did not finish in time. Try again or type instead.','unknown':'Speech recognition is unavailable. Try again or type instead.'},
 zh:{'not-allowed':'未获得麦克风权限。请检查浏览器和设备权限后重试，或输入文字。','audio-capture':'无法使用麦克风。请检查麦克风是否已连接且可用，或输入文字。','network':'语音识别无法连接。请检查网络，或输入文字。','no-speech':'没有检测到语音。请重试，或输入文字。','service-not-allowed':'语音识别服务不可用或未获允许，请输入文字。','aborted':'已停止聆听。','unsupported':'当前浏览器不支持语音识别，请输入文字或使用按钮。','start':'语音识别无法启动，请重试或输入文字。','timeout':'语音识别等待时间过长，已停止。请重试或输入文字。','unknown':'语音识别暂不可用，请重试或输入文字。'},
 fr:{'not-allowed':'L’accès au microphone n’a pas été autorisé. Vérifiez les autorisations du navigateur et de l’appareil, puis réessayez ou écrivez.','audio-capture':'Impossible d’utiliser le microphone. Vérifiez qu’un microphone est connecté et disponible, ou écrivez.','network':'La reconnaissance vocale ne peut pas se connecter. Vérifiez votre connexion ou écrivez.','no-speech':'Aucune parole détectée. Réessayez ou écrivez.','service-not-allowed':'Le service de reconnaissance vocale est indisponible ou non autorisé. Écrivez plutôt.','aborted':'Écoute arrêtée.','unsupported':'Ce navigateur ne prend pas en charge la reconnaissance vocale. Écrivez ou utilisez un bouton.','start':'Impossible de démarrer la reconnaissance vocale. Réessayez ou écrivez.','timeout':'La reconnaissance vocale a expiré. Réessayez ou écrivez.','unknown':'La reconnaissance vocale est indisponible. Réessayez ou écrivez.'}
};
export function recognitionStatus(code,locale='en'){
 const words=messages[locale]||messages.en;
 return words[code]||words.unknown;
}
export function bindRecognitionErrors(recognition,{locale,onError}){
 recognition.onerror=event=>{
  const code=event?.error||'unknown';
  onError(code,recognitionStatus(code,locale()));
 };
}
export function createRecognitionWatchdog(recognition,{onTimeout,delay=20000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer=null,expired=false;
 return {
  get expired(){return expired;},
  start(){timer=setTimer(()=>{timer=null;expired=true;onTimeout();try{recognition.abort();}catch{}},delay);},
  cancel(){if(timer!==null){clearTimer(timer);timer=null;}}
 };
}
