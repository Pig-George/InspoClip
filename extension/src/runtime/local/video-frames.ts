export type VideoFrame = {
  dataUrl: string
  timestamp: number
}

export type VideoFrameExtractionResult = {
  duration: number
  frames: VideoFrame[]
}
