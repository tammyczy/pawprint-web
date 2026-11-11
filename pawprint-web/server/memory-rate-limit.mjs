// Per-user sliding window. Opportunistic periodic cleanup avoids retaining
// inactive accounts forever without creating one timer per account.
export function createMemoryRateLimit({now=Date.now,windowMs=60000,limit=10}={}){
 const attempts=new Map();
 let nextCleanup=0;
 return {
  take(key){
   const time=now();
   if(time>=nextCleanup){
    for(const [user,times] of attempts)if(!times.some(at=>time-at<windowMs))attempts.delete(user);
    nextCleanup=time+windowMs;
   }
   const recent=(attempts.get(key)||[]).filter(at=>time-at<windowMs);
   if(recent.length>=limit){attempts.set(key,recent);return false;}
   recent.push(time);attempts.set(key,recent);return true;
  },
  get size(){return attempts.size;}
 };
}
