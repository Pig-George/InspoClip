const test = require('node:test');
const assert = require('node:assert/strict');
const { isSupportedVideoUrl, buildClientVideoUrl, uploadVideoBlob, pollVideoJob } = require('./video.js');

test('accepts HTTP video URLs and rejects blob URLs', () => {
  assert.equal(isSupportedVideoUrl('https://example.com/demo.mp4'), true);
  assert.equal(isSupportedVideoUrl('blob:https://example.com/123'), false);
});

test('builds the client detail URL', () => {
  assert.equal(buildClientVideoUrl('http://localhost:8080/', 'abc'), 'http://localhost:8080/?video=abc');
});

test('uploads a video blob with extension source', async () => {
  const calls = [];
  const fetchFn = async (url, options) => { calls.push([url, options]); return { ok: true, json: async () => ({ videoId: 'v', jobId: 'j', status: 'pending' }) }; };
  const result = await uploadVideoBlob(fetchFn, 'http://localhost:3001/', new Blob(['x'], { type: 'video/mp4' }), 'demo.mp4');
  assert.equal(result.videoId, 'v');
  assert.equal(calls[0][0], 'http://localhost:3001/api/videos');
  assert.equal(calls[0][1].body.get('source'), 'extension');
});

test('polling stops on completed status', async () => {
  let calls = 0;
  const fetchFn = async () => ({ ok: true, json: async () => ({ status: ++calls === 1 ? 'processing' : 'completed', progress: calls * 50 }) });
  const updates = [];
  const result = await pollVideoJob(fetchFn, 'http://localhost:3001', 'j', { intervalMs: 0, wait: async () => {}, onUpdate: (job) => updates.push(job.status) });
  assert.equal(result.status, 'completed');
  assert.deepEqual(updates, ['processing', 'completed']);
});
