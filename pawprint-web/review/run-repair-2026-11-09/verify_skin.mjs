import fs from 'node:fs/promises';
import {compareLanlaoSkinMotion} from '../../test-support/lanlao-skin-review.mjs';
const results=await compareLanlaoSkinMotion(process.argv[2]);
console.log(JSON.stringify(results,null,2));
await fs.writeFile(new URL('./skin-holdout.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
