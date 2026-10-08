import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, pbkdf2Sync, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import { ACCESS_DURATION, readAccessGrant, validateAccessConfig, verifyAccessPassword } from '../lib/access.mjs';

// Disposable credential exists only in test memory and is unrelated to the public configuration.
const password = randomBytes(32).toString('base64');
const salt = randomBytes(16);
const configuration = { algorithm:'PBKDF2', hash:'SHA-256', iterations:600000, length:256,
  salt:salt.toString('base64'), verifier:pbkdf2Sync(password,salt,600000,32,'sha256').toString('base64'), version:randomUUID() };

test('Web Crypto and native PBKDF2 agree; incorrect password is rejected', async () => {
  assert.equal(await verifyAccessPassword(password,configuration,webcrypto.subtle),true);
  assert.equal(await verifyAccessPassword(password + '!',configuration,webcrypto.subtle),false);
});
test('configuration rejects absent, malformed, unsupported and extra secret fields', () => {
  assert.deepEqual(validateAccessConfig(configuration),configuration);
  for (const value of [null,{}, {...configuration,password:'forbidden'}, {...configuration,iterations:1},
    {...configuration,hash:'SHA-1'}, {...configuration,salt:'invalid'}, {...configuration,verifier:'invalid'},
    {...configuration,version:'old'}]) assert.equal(validateAccessConfig(value),null);
});
test('absolute eight-hour grant rejects expiry, old version and malformed records', () => {
  const now = Date.now();
  const value = {version:configuration.version,expiresAt:now+ACCESS_DURATION};
  assert.deepEqual(readAccessGrant(JSON.stringify(value),configuration,now),value);
  for (const raw of [null,'{','{}',JSON.stringify({...value,expiresAt:now}),JSON.stringify({...value,expiresAt:now+ACCESS_DURATION+1}),
    JSON.stringify({...value,version:randomUUID()}),JSON.stringify({...value,password:'forbidden'})]) {
    assert.equal(readAccessGrant(raw,configuration,now),null);
  }
  assert.equal(readAccessGrant(JSON.stringify(value),configuration,value.expiresAt),null);
});
test('published configuration contains only permitted derived fields', () => {
  // An absent configuration deliberately keeps development locked; publishing requires one.
  if (fs.existsSync('public/access-config.json')) assert.ok(validateAccessConfig(JSON.parse(fs.readFileSync('public/access-config.json','utf8'))));
});
