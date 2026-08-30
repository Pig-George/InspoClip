import { RuntimeFailure } from "../errors"

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type UploadPolicy = {
  policy: string
  signature: string
  upload_dir: string
  upload_host: string
  max_file_size_mb: string | number
  oss_access_key_id: string
  x_oss_object_acl: string
  x_oss_forbid_overwrite: string
}

type UploadInput = {
  apiKey: string
  endpoint: string
  model: string
  blob: Blob
  filename: string
  fetchFn?: FetchLike
}

const MAX_TEMPORARY_FILE_BYTES = 1024 * 1024 * 1024

export function isBailianEndpoint(endpoint: string): boolean {
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase()
    return hostname === "dashscope.aliyuncs.com" || hostname === "dashscope-intl.aliyuncs.com"
  } catch {
    return false
  }
}

export async function uploadBailianTemporaryFile(input: UploadInput): Promise<string> {
  const fetchFn = input.fetchFn || fetch
  const uploadApi = new URL("/api/v1/uploads", input.endpoint)
  uploadApi.searchParams.set("action", "getPolicy")
  uploadApi.searchParams.set("model", input.model)

  let policyResponse: Response
  try {
    policyResponse = await fetchFn.call(globalThis, uploadApi, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json"
      }
    })
  } catch (error) {
    throw temporaryFileFailure("BAILIAN_TEMP_POLICY_UNAVAILABLE", "Unable to obtain a Bailian temporary upload policy", true, error)
  }
  if (!policyResponse.ok) {
    throw temporaryFileFailure(
      "BAILIAN_TEMP_POLICY_REJECTED",
      `Bailian temporary upload policy failed with HTTP ${policyResponse.status}`,
      policyResponse.status === 408 || policyResponse.status === 429 || policyResponse.status >= 500
    )
  }

  const body = await policyResponse.json().catch(() => null) as { data?: Partial<UploadPolicy> } | null
  const policy = validatePolicy(body?.data)
  const policyLimit = Number(policy.max_file_size_mb) * 1024 * 1024
  const maximumBytes = Math.min(MAX_TEMPORARY_FILE_BYTES, Number.isFinite(policyLimit) && policyLimit > 0 ? policyLimit : MAX_TEMPORARY_FILE_BYTES)
  if (input.blob.size > maximumBytes) {
    throw temporaryFileFailure(
      "BAILIAN_TEMP_FILE_TOO_LARGE",
      `Video exceeds the Bailian model upload limit of ${formatMegabytes(maximumBytes)} MB`,
      false
    )
  }

  const filename = sanitizeFilename(input.filename)
  const key = `${policy.upload_dir.replace(/\/+$/, "")}/${filename}`
  const form = new FormData()
  form.append("OSSAccessKeyId", policy.oss_access_key_id)
  form.append("Signature", policy.signature)
  form.append("policy", policy.policy)
  form.append("x-oss-object-acl", policy.x_oss_object_acl)
  form.append("x-oss-forbid-overwrite", policy.x_oss_forbid_overwrite)
  form.append("key", key)
  form.append("success_action_status", "200")
  form.append("file", input.blob, filename)

  let uploadResponse: Response
  try {
    uploadResponse = await fetchFn.call(globalThis, policy.upload_host, { method: "POST", body: form })
  } catch (error) {
    throw temporaryFileFailure("BAILIAN_TEMP_UPLOAD_FAILED", "Unable to upload the video to Bailian temporary storage", true, error)
  }
  if (!uploadResponse.ok) {
    throw temporaryFileFailure(
      uploadResponse.status === 403 ? "BAILIAN_TEMP_POLICY_EXPIRED" : "BAILIAN_TEMP_UPLOAD_FAILED",
      `Bailian temporary file upload failed with HTTP ${uploadResponse.status}`,
      uploadResponse.status === 403 || uploadResponse.status === 408 || uploadResponse.status === 429 || uploadResponse.status >= 500
    )
  }
  return `oss://${key}`
}

function validatePolicy(value: Partial<UploadPolicy> | undefined): UploadPolicy {
  const required: Array<keyof UploadPolicy> = [
    "policy",
    "signature",
    "upload_dir",
    "upload_host",
    "max_file_size_mb",
    "oss_access_key_id",
    "x_oss_object_acl",
    "x_oss_forbid_overwrite"
  ]
  if (!value || required.some((key) => value[key] === undefined || value[key] === "")) {
    throw temporaryFileFailure("BAILIAN_TEMP_POLICY_INVALID", "Bailian returned an invalid temporary upload policy", true)
  }
  return value as UploadPolicy
}

function sanitizeFilename(value: string): string {
  const filename = value.split(/[\\/]/).pop()?.trim() || "video.mp4"
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "video.mp4"
}

function formatMegabytes(bytes: number): string {
  return Math.max(0.01, bytes / (1024 * 1024)).toFixed(2).replace(/\.00$/, "")
}

function temporaryFileFailure(code: string, message: string, retryable: boolean, cause?: unknown): RuntimeFailure {
  const failure = new RuntimeFailure({ code, message, retryable, ...(retryable ? { action: "retry" as const } : {}) })
  if (cause !== undefined) Object.assign(failure, { cause })
  return failure
}
