import test from 'node:test';
import assert from 'node:assert/strict';
import {isImmediateStop} from './src/immediate-stop.js';

test('only clear standalone stop controls bypass a pending AI request',()=>{
 for(const text of ['停下','蓝老停下','蓝老，请现在停止移动','现在请停下来','不要动','stop','Please stop moving now',"don't move",'arrête-toi','arrête de bouger'])assert.equal(isImmediateStop(text),true,text);
 assert.equal(isImmediateStop('Milo, stop','Milo'),true);
 assert.equal(isImmediateStop('Milo, stop','Different'),false);
 for(const text of ['Arrête de courir','Arrête de marcher','Cesse de sauter','Ne bouge plus','Ne bouge vraiment plus','Cesse tes mouvements, merci','Reste ici sans bouger',"Pourrais-tu arrêter de bouger ?","Pourrais-tu arrêter tous tes mouvements ?","Je te demande de ne plus bouger.","Tu peux arrêter de bouger ?","Est-ce que tu peux t’arrêter de marcher ?","S’il te plaît, arrête-toi","Peux-tu t’arrêter ?"])assert.equal(isImmediateStop(text),true,text);
 for(const text of ["Pourrais-tu cesser tous les mouvements ?","Je voudrais que tu arrêtes de marcher maintenant.","Reste parfaitement immobile, s'il te plaît."])assert.equal(isImmediateStop(text),true,text);
 for(const text of ["Pourrais-tu cesser les mouvements de ton corps ?","Tu peux stopper tous tes mouvements ?","J’aimerais que tu cesses de courir tout de suite."])assert.equal(isImmediateStop(text),true,text);
 for(const text of ['不要停止','你还记得停下来吗','停止播放音乐','不要跑，过来','我想自杀，请停下来','我妈妈说，停下','我的朋友说，请停下','她说，stop','My mother said, stop',"don't stop",'please stop the music','Can you stop the reminders?','arrête la musique'])assert.equal(isImmediateStop(text),false,text);
 for(const text of ['Ne cours pas','Arrête la musique','Arrête de parler','Ne t’arrête pas','Je te demande de ne pas t’arrêter','Il a dit, arrête-toi','Tu veux arrêter de bouger ?'])assert.equal(isImmediateStop(text),false,text);
});
