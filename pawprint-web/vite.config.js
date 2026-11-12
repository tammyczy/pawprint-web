import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {appendFileSync} from 'node:fs';
// Dev server only: saves the page's microphone trace (see src/mic-trace.js) to a local file.
const micTrace=()=>({name:'mic-trace',apply:'serve',configureServer(server){server.middlewares.use('/__mic-trace',(req,res)=>{let body='';req.on('data',c=>{if(body.length<4000)body+=c;});req.on('end',()=>{try{appendFileSync(process.env.MIC_TRACE_FILE||'mic-trace.log',body.replace(/\n/g,' ')+'\n');}catch{}res.statusCode=204;res.end();});});}});
// React is used only by the home page (src/home); the 3D pages stay framework-free.
export default defineConfig({base:'./',plugins:[react(),micTrace()],server:{host:'127.0.0.1',port:5174,strictPort:true,proxy:{'/api':'http://127.0.0.1:8788'}},build:{chunkSizeWarningLimit:700,rollupOptions:{input:{landing:'index.html',app:'app.html',studio:'studio.html',pet:'pet.html',judge:'judge.html'}}}});
