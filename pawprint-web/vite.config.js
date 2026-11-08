import {defineConfig} from 'vite';
export default defineConfig({base:'./',server:{host:'127.0.0.1',port:5174,strictPort:true,proxy:{'/api':'http://127.0.0.1:8788'}},build:{chunkSizeWarningLimit:700,rollupOptions:{input:{landing:'index.html',app:'app.html',studio:'studio.html',pet:'pet.html',judge:'judge.html'}}}});
