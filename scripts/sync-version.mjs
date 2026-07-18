import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const versionTargetFiles = [
  'client/package.json',
  'server/package.json',
  'extension/package.json',
  'extension/legacy/manifest.json'
]

const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

async function readJson(absolutePath) {
  const source = await readFile(absolutePath, 'utf8')
  return { source, value: JSON.parse(source) }
}

function replaceVersion(source, version, relativePath) {
  const versionProperty = /(\"version\"\s*:\s*\")[^\"]*(\")/

  if (!versionProperty.test(source)) {
    throw new Error(`${relativePath} does not contain a version property`)
  }

  return source.replace(versionProperty, `$1${version}$2`)
}

export async function syncProjectVersions({ rootDir, check = false }) {
  const rootPackagePath = join(rootDir, 'package.json')
  const { value: rootPackage } = await readJson(rootPackagePath)
  const version = rootPackage.version

  if (typeof version !== 'string' || !semverPattern.test(version)) {
    throw new Error('The root package.json version must be a valid semantic version')
  }

  const changedFiles = []

  for (const relativePath of versionTargetFiles) {
    const absolutePath = join(rootDir, relativePath)
    const { source, value } = await readJson(absolutePath)

    if (value.version === version) continue

    changedFiles.push(relativePath)
    if (!check) {
      await writeFile(
        absolutePath,
        replaceVersion(source, version, relativePath),
        'utf8'
      )
    }
  }

  return { version, changedFiles }
}

async function runCli() {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const rootDir = join(scriptDir, '..')
  const check = process.argv.includes('--check')
  const { version, changedFiles } = await syncProjectVersions({ rootDir, check })

  if (changedFiles.length === 0) {
    console.log(`All project manifests use version ${version}.`)
    return
  }

  if (check) {
    console.error(`Version drift detected. Expected ${version}:`)
    for (const file of changedFiles) console.error(`- ${file}`)
    process.exitCode = 1
    return
  }

  console.log(`Updated project manifests to version ${version}:`)
  for (const file of changedFiles) console.log(`- ${relative(rootDir, join(rootDir, file))}`)
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectExecution) {
  await runCli()
}
