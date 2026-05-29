let _lastUploadedId: string | null = null;

export function setLastUploadedImageId(id: string) {
  _lastUploadedId = id;
}

export function consumeIfMatches(imageId: string): boolean {
  if (_lastUploadedId === imageId) {
    _lastUploadedId = null;
    return true;
  }
  return false;
}
