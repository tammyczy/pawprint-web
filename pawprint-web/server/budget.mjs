// Keep reservations after failed/uncertain jobs until an operator reconciles billing.
export function reserveBudget(db,jobId,amount,limit){
 if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(limit)||limit<0||limit>1500)throw new Error('INVALID_BUDGET');
 db.exec('BEGIN IMMEDIATE');
 try{
  const existing=db.prepare('SELECT amount FROM budget_reservations WHERE job_id=?').get(jobId);
  if(existing){db.exec('COMMIT');return existing.amount;}
  const used=db.prepare('SELECT coalesce(sum(amount),0) AS total FROM budget_reservations').get().total;
  if(used+amount>limit)throw new Error('TEST_BUDGET_EXCEEDED');
  db.prepare('INSERT INTO budget_reservations(job_id,amount,created) VALUES(?,?,?)').run(jobId,amount,Date.now());db.exec('COMMIT');return amount;
 }catch(error){db.exec('ROLLBACK');throw error;}
}

// Completed provider charges consume the job's existing reservation. Never
// invent a zero cost when a completed stage has missing or invalid billing data.
export function remainingGenerationBudget(tasks={},reservation=100){
 if(!Number.isFinite(reservation)||reservation<=0)throw new Error('INVALID_BUDGET');
 let spent=0;
 for(const task of Object.values(tasks))if(task?.output){
  if(typeof task.credits!=='number'||!Number.isFinite(task.credits)||task.credits<0)throw new Error('BILLING_REVIEW_REQUIRED');
  spent+=task.credits;
 }
 if(spent>75||spent>reservation)throw new Error('BILLING_REVIEW_REQUIRED');
 return reservation-spent;
}

export async function ensureTaskFunding(client,tasks,key,reservation=100){
 // Querying a recorded task must not require another balance check or cause a
 // fresh submission. Funding is checked immediately before NEW submissions.
 if(tasks[key])return;
 const required=remainingGenerationBudget(tasks,reservation),account=await client.request('/account/balance');
 if(typeof account.balance!=='number'||!Number.isFinite(account.balance)||account.balance<required)throw Object.assign(new Error('API_BALANCE_BELOW_RESERVATION'),{code:'API_BALANCE_BELOW_RESERVATION'});
}
