import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHARED_APP_URL,
  isDevSandboxOrigin,
  isLocalOrigin,
  normalizeCustomShareUrl,
  resolveSiteShareUrl,
} from './share';

test('isLocalOrigin correctly identifies localhost and public domains', () => {
  assert.equal(isLocalOrigin('http://localhost:3000'), true);
  assert.equal(isLocalOrigin('http://127.0.0.1:3000'), true);
  assert.equal(isLocalOrigin('https://jolum.manas.kg'), false);
  assert.equal(isLocalOrigin(DEFAULT_SHARED_APP_URL), false);
});

test('isDevSandboxOrigin detects ais-dev hostnames', () => {
  assert.equal(
    isDevSandboxOrigin('https://ais-dev-abprhnvnpkuc7fghmqx3wi-899415044006.asia-east1.run.app'),
    true
  );
  assert.equal(isDevSandboxOrigin(DEFAULT_SHARED_APP_URL), false);
});

test('resolveSiteShareUrl never returns localhost when running locally', () => {
  const res = resolveSiteShareUrl({
    currentOrigin: 'http://localhost:3000',
    envAppUrl: '',
  });
  assert.equal(res.url, DEFAULT_SHARED_APP_URL);
  assert.equal(res.source, 'shared-fallback');
  assert.equal(res.isLocalPreview, true);
});

test('resolveSiteShareUrl prefers live public origin when deployed', () => {
  const res = resolveSiteShareUrl({
    currentOrigin: 'https://jolum.manas.kg/',
    envAppUrl: '',
  });
  assert.equal(res.url, 'https://jolum.manas.kg');
  assert.equal(res.source, 'public-origin');
  assert.equal(res.isLocalPreview, false);
});

test('resolveSiteShareUrl maps ais-dev preview to public shared URL for mobile QR scans', () => {
  const res = resolveSiteShareUrl({
    currentOrigin: 'https://ais-dev-abprhnvnpkuc7fghmqx3wi-899415044006.asia-east1.run.app',
  });
  assert.equal(res.url, DEFAULT_SHARED_APP_URL);
  assert.equal(res.source, 'shared-fallback');
  assert.equal(res.isLocalPreview, false);
});

test('normalizeCustomShareUrl validates and normalizes user URLs', () => {
  assert.equal(normalizeCustomShareUrl('jolum.manas.kg/'), 'https://jolum.manas.kg');
  assert.equal(normalizeCustomShareUrl('https://example.kg/map'), 'https://example.kg/map');
  assert.equal(normalizeCustomShareUrl('localhost'), null);
  assert.equal(normalizeCustomShareUrl('not a url'), null);
});
