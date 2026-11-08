const preservedStates=new Set(['SUBMISSION_UNCERTAIN','PAUSED_NETWORK','FAILED','CANCELLED','DELETED']);

export function shouldMarkWorkerFailed(status,error){
 if(!status||preservedStates.has(status))return false;
 // Only an intentional funding pause keeps WAITING_APPROVAL after an error.
 if(status==='WAITING_APPROVAL'&&error?.code==='API_BALANCE_BELOW_RESERVATION')return false;
 return true;
}
