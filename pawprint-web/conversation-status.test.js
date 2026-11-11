import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationStatus} from './src/conversation-status.js';

test('configuration is not presented as a successful provider reply', () => {
 const status=createConversationStatus();
 assert.equal(status.key,'conversationChecking');
 status.health(true);
 assert.equal(status.key,'conversationConfigured');
 status.succeeded();
 assert.equal(status.key,'conversationReady');
 status.failed();
 assert.equal(status.key,'conversationUnavailable');
 status.succeeded();
 assert.equal(status.key,'conversationReady');
});

test('a late health check cannot replace a real chat result', () => {
 const succeeded=createConversationStatus();
 succeeded.succeeded();
 succeeded.health(false);
 assert.equal(succeeded.key,'conversationReady');
 const failed=createConversationStatus();
 failed.failed();
 failed.health(true);
 assert.equal(failed.key,'conversationUnavailable');
 const unconfigured=createConversationStatus();
 unconfigured.health(false);
 assert.equal(unconfigured.key,'conversationUnconfigured');
 const offline=createConversationStatus();
 offline.healthFailed();
 assert.equal(offline.key,'conversationUnavailable');
});

test('a system privacy response is distinct from an AI-authored reply',()=>{
 const status=createConversationStatus();
 status.succeeded('system-privacy');
 assert.equal(status.key,'conversationPrivacy');
 status.health(true);assert.equal(status.key,'conversationPrivacy');
 status.succeeded('system-action');assert.equal(status.key,'conversationAction');
 status.succeeded();assert.equal(status.key,'conversationReady');
});

test('a local stop or safety response replaces an older AI status and resists late health checks',()=>{
 const status=createConversationStatus();
 status.succeeded('system-action');status.local();
 assert.equal(status.key,'conversationLocal');
 status.health(true);assert.equal(status.key,'conversationLocal');
 status.succeeded();assert.equal(status.key,'conversationReady');
});
