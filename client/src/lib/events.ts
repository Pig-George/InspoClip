let _lastUploadedId: string | null = null;

export function setLastUploadedImageId(id: string) {
  console.log('[Events] setLastUploadedImageId:', id);
  _lastUploadedId = id;
}

export function consumeIfMatches(imageId: string): boolean {
  console.log('[Events] consumeIfMatches:', imageId, 'last:', _lastUploadedId);
  if (_lastUploadedId === imageId) {
    _lastUploadedId = null;
    return true;
  }
  return false;
}
