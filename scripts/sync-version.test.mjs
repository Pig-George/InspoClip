import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { syncProjectVersions } from './sync-version.mjs'

const targetFiles = [
  'client/package.json',
  'server/package.json',
  'extension/package.json',
  'extension/legacy/manifest.json'
]

async function createFixture(version = '1.5.0') {
  const rootDir = await mkdtemp(join(tmpdir(), 'inspoclip-version-'))

  await writeFile(
    join(rootDir, 'package.json'),
    `${JSON.stringify({ name: 'inspoclip', version }, null, 2)}\n`,
    'utf8'
  )

  for (const relativePath of targetFiles) {
    const absolutePath = join(rootDir, relativePath)
    await mkdir(join(absolutePath, '..'), { recursive: true })
    await writeFile(
      absolutePath,
      `${JSON.stringify({ name: relativePath, version: '1.0.0' }, null, 2)}\n`,
      'utf8'
    )
  }

  return rootDir
}

test('check mode reports drift without changing target files', async () => {
  const rootDir = await createFixture()
  const before = await readFile(join(rootDir, targetFiles[0]), 'utf8')

  const result = await syncProjectVersions({ rootDir, check: true })

  assert.equal(result.version, '1.5.0')
  assert.deepEqual(result.changedFiles, targetFiles)
  assert.equal(await readFile(join(rootDir, targetFiles[0]), 'utf8'), before)
})

test('sync mode updates every package and extension manifest', async () => {
  const rootDir = await createFixture()

  const result = await syncProjectVersions({ rootDir })

  assert.deepEqual(result.changedFiles, targetFiles)
  for (const relativePath of targetFiles) {
    const contents = JSON.parse(await readFile(join(rootDir, relativePath), 'utf8'))
    assert.equal(contents.version, '1.5.0')
  }
})

test('rejects an invalid root project version', async () => {
  const rootDir = await createFixture('next')

  await assert.rejects(
    syncProjectVersions({ rootDir }),
    /valid semantic version/
  )
})
