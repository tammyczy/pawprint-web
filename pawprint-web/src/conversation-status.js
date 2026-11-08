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
    unavailable: 'conversationUnavailable'
   }[state];
  },
  health(configured) { if (state === 'checking') state = configured ? 'configured' : 'unconfigured'; },
  healthFailed() { if (state === 'checking') state = 'unavailable'; },
  succeeded() { state = 'ready'; },
  failed() { state = 'unavailable'; }
 };
}
