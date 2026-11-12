// Development-only microphone trace. With the Vite dev server it posts each
// step to a local log file so a voice problem can be diagnosed from what the
// browser really did. It is compiled out of the production build.
export function micTrace(step,detail={}){
 if(!import.meta.env?.DEV)return;
 try{navigator.sendBeacon('/__mic-trace',JSON.stringify({t:new Date().toISOString(),step,...detail}));}catch{}
}
