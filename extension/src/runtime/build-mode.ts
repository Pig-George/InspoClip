/**
 * Keep development-only diagnostics disabled unless the bundler explicitly
 * marks this build as a development build. This also fails closed when the
 * environment value is unavailable at runtime.
 */
export function getIsDevelopmentBuild(nodeEnv: string | undefined, plasmoTag?: string): boolean {
  return nodeEnv === "development" || plasmoTag === "dev"
}

export const isDevelopmentBuild = getIsDevelopmentBuild(
  typeof process === "undefined" ? undefined : process.env.NODE_ENV,
  typeof process === "undefined" ? undefined : process.env.PLASMO_TAG
)
