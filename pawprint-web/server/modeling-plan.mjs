export const PHOTO_VIEWS = ['front', 'left', 'back', 'right'];
export const DEFAULT_TRIPO_MODEL = 'v3.1-20260211';
export const MODEL_PROFILES = ['standard', 'detail'];

export function modelingPlan(profile, mode, {legacyWalk = false} = {}) {
 const detail = profile === 'detail';
 const charges = {multiview: mode === 'generated_views' ? 10 : 0, generation: detail ? 60 : 30, rig_check: 0, rig: 25, walk: legacyWalk ? 10 : 0};
 const estimate = Object.values(charges).reduce((sum, charge) => sum + charge, 0);
 return {
  profile: detail ? 'detail' : 'standard',
  charges,
  estimate,
  spendLimit: detail ? estimate : 75,
  reservation: detail ? 125 : 100,
 };
}
