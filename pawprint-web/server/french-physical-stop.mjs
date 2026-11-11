// A narrowly scoped physical stop recognizer. It accepts whole clauses, not
// references to other people's instructions or commands to stop audio/talk.
// Stop words elsewhere in a message are not by themselves proof of intent.
export function isFrenchPhysicalStop(text){
 if(typeof text!=='string')return false;
 const value=text.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim()
  .replace(/[.!！?？。]+$/u,'').trim()
  .replace(/^(?:s'il te plaît|s'il vous plaît)\s*,?\s*/u,'')
  .replace(/\s*,?\s*(?:s'il te plaît|s'il vous plaît|je t'en prie|je vous en prie|merci)$/u,'').trim()
  .replace(/\s+(?:maintenant|immédiatement|tout de suite|un instant|un moment|pendant un (?:instant|moment)|du tout)$/u,'').trim();
 const direct=/^(?:(?:arrête|arrete|cesse)\s+de\s+(?:bouger|marcher|courir|sauter|te déplacer|te deplacer)|(?:arrête|arrete|stoppe)(?:-toi)?|(?:immobilise|immobilisez)-(?:toi|vous)|(?:cesse|arrête|arrete|stoppe)\s+(?:(?:tous|toutes)\s+)?(?:tes|vos|les)\s+(?:(?:petits|petites)\s+)?(?:mouvements?|pas)|stoppe\s+(?:le|ton|tes)\s+mouvement(?:s)?(?:\s+de\s+(?:tes|ton|vos|votre)\s+(?:pattes|corps))?|reste(?: ici)?\s+(?:(?:bien|parfaitement|complètement|completement|totalement)\s+)?(?:immobile|sans bouger)|ne\s+(?:bouge|marche|cours|saute)\s+(?:(?:absolument|vraiment)\s+)?(?:plus|pas))$/u;
 const polite=/^(?:est-ce que\s+)?(?:(?:tu peux|tu pourrais|tu veux bien)|(?:peux-tu|pourrais-tu))\s+(?:(?:t')?(?:arrêter|arreter|immobiliser|stopper)(?:\s+(?:de\s+(?:bouger|marcher|courir|sauter)|(?:(?:tous|toutes)\s+)?(?:tes|vos|les)\s+mouvements?(?:\s+de\s+(?:ton|tes|votre|vos)\s+(?:corps|pattes))?))?|cesser\s+(?:de\s+(?:bouger|marcher|courir|sauter)|(?:(?:tous|toutes)\s+)?(?:tes|vos|les)\s+mouvements?(?:\s+de\s+(?:ton|tes|votre|vos)\s+(?:corps|pattes))?)|rester\s+(?:(?:bien|parfaitement|complètement|totalement)\s+)?(?:immobile|sans bouger))$/u;
 const thanks=/^merci de\s+(?:rester\s+(?:immobile|sans bouger)|ne pas bouger|cesser de\s+(?:bouger|marcher|courir|sauter))$/u;
 const request=/^(?:je\s+(?:te|vous)\s+demande\s+de\s+ne\s+(?:plus|pas)\s+bouger|(?:je\s+(?:voudrais|souhaite)|j'aimerais)\s+que\s+tu\s+(?:arrêtes|arretes|cesses)\s+de\s+(?:bouger|marcher|courir|sauter))$/u;
 return direct.test(value)||polite.test(value)||thanks.test(value)||request.test(value);
}

// A prohibition of one movement does not mean an idle pet must begin a stop
// animation. "Ne bouge pas" is broader and explicitly asks to stay still.
export function canForceFrenchStop(text){
 if(!isFrenchPhysicalStop(text))return false;
 const value=String(text).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'");
 return !/\bne\s+(?:marche|cours|saute)\s+(?:(?:absolument|vraiment)\s+)?(?:plus|pas)\b/u.test(value);
}
