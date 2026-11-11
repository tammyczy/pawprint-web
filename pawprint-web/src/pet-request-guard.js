// Explicit actions supersede any dialogue response still on its way.
export function createPetRequestGuard(){
 let revision=0;
 return {
  begin(){const current=++revision;return ()=>current===revision;},
  invalidate(){revision++;}
 };
}
