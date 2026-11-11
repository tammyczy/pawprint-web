// A configuration check does not prove that the provider can answer.
// A late health response must not overwrite a more recent chat result.
export function createConversationStatus() {
 let state = 'checking';
 return {
  get key() {
   return {
    checking: 'conversationChecking',
    configured: 'conversationConfigured',
    unconfigured: 'conversationUnconfigured',
    ready: 'conversationReady',
    privacy: 'conversationPrivacy',
    action: 'conversationAction',
    local: 'conversationLocal',
    unavailable: 'conversationUnavailable'
   }[state];
  },
  health(configured) { if (state === 'checking') state = configured ? 'configured' : 'unconfigured'; },
  healthFailed() { if (state === 'checking') state = 'unavailable'; },
  succeeded(source) { state = source === 'system-privacy' ? 'privacy' : source === 'system-action' ? 'action' : 'ready'; },
  local() { state = 'local'; },
  failed() { state = 'unavailable'; }
 };
}
