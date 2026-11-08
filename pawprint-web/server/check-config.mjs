import 'dotenv/config';
import {Tripo} from './tripo.mjs';
import {providerMessage} from './worker.mjs';
if(process.env.TRIPO_MOCK==='true')console.log('提示：TRIPO_MOCK=true 时加工进程走示范模式，不调用 Tripo、不扣费，产出的是内置示例模型。');
if(!process.env.TRIPO_API_KEY){console.log('请填写 .env 的 TRIPO_API_KEY。');process.exitCode=1;}
else{try{const result=await new Tripo(process.env.TRIPO_API_KEY).request('/account/balance');console.log(JSON.stringify({keyValid:true,availableCredits:result.balance,frozenCredits:result.frozen,enoughForOneJob:typeof result.balance==='number'&&result.balance>=100,configuredTestBudget:Number(process.env.TEST_BUDGET_CREDITS||0),paidGenerationEnabled:process.env.ALLOW_PAID_GENERATION==='true'},null,2));if(!(result.balance>=100))console.log(providerMessage({code:'API_BALANCE_BELOW_RESERVATION'}));}
 catch(error){console.log(`无法验证 API 余额：${error.code?providerMessage(error):'请检查密钥和网络。'} 不显示密钥或原始响应。`);process.exitCode=1;}}
