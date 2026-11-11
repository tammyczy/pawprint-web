import {parseCommand} from './commands.js';

// Only whole, unambiguous commands bypass conversation and its safety checks.
export function directPetCommand(text){
 if(typeof text!=='string')return null;
 const value=text.normalize('NFKC').toLowerCase().trim().replace(/^(?:lanlao|蓝老|藍老)[\s,，:：]+/u,'').replace(/[.!！。?？]+$/u,'').trim();
 if(!/^(?:please\s+)?(?:come(?: here| closer| over| to me)?|walk(?: with me| around| slowly)?|take a walk|go for a walk|run(?: fast| with me| around)?|jump(?: once| for me| up)?|wag(?: your| the)? tail|wag|sit(?: down)?|lie down|lay down|down|stand(?: up)?)(?:\s+please)?$/u.test(value))return null;
 return parseCommand(value,{postures:true});
}
