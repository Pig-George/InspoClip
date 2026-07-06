(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InspoClipVideo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function trimBase(url) { return String(url || '').replace(/\/+$/, ''); }
  function isSupportedVideoUrl(value) {
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; }
    catch { return false; }
  }
  function buildClientVideoUrl(appUrl, videoId) {
    const url = new URL(trimBase(appUrl) + '/');
    url.searchParams.set('video', videoId);
    return url.toString();
  }
  async function responseJson(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }
  async function uploadVideoBlob(fetchFn, serverUrl, blob, filename) {
    const form = new FormData();
    form.append('video', blob, filename || 'video.mp4');
    form.append('source', 'extension');
    return responseJson(await fetchFn(`${trimBase(serverUrl)}/api/videos`, { method: 'POST', body: form }));
  }
  async function uploadVideoUrl(fetchFn, serverUrl, videoUrl) {
    if (!isSupportedVideoUrl(videoUrl)) throw new Error('Blob or protected video URLs must be downloaded and uploaded as a local file');
    const response = await fetchFn(videoUrl);
    if (!response.ok) throw new Error('Unable to download this video; save it locally and upload the file');
    const blob = await response.blob();
    const name = new URL(videoUrl).pathname.split('/').pop() || 'web-video.mp4';
    return uploadVideoBlob(fetchFn, serverUrl, blob, name);
  }
  async function pollVideoJob(fetchFn, serverUrl, jobId, options) {
    const config = options || {};
    const wait = config.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const intervalMs = config.intervalMs === undefined ? 1500 : config.intervalMs;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const job = await responseJson(await fetchFn(`${trimBase(serverUrl)}/api/video-jobs/${jobId}`));
      if (config.onUpdate) config.onUpdate(job);
      if (job.status === 'completed' || job.status === 'failed') return job;
      await wait(intervalMs);
    }
    throw new Error('Video analysis timed out');
  }
  return { isSupportedVideoUrl, buildClientVideoUrl, uploadVideoBlob, uploadVideoUrl, pollVideoJob };
});
