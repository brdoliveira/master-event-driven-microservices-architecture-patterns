import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

test('@spec:AC-011 README documents safe setup, tests, builds, images, and Compose startup', () => {
  const readme = read('README.md');

  assert.match(readme, /Java 17/);
  assert.match(readme, /\.env\.example/);
  assert.match(readme, /node --test tests/);
  assert.match(readme, /\.\/mvnw verify/);
  assert.match(readme, /container-images/);
  assert.match(readme, /docker compose --env-file \.env config/);
  assert.match(readme, /docker compose up -d/);
});

test('@spec:AC-012 CI checks secrets, acceptance contract, Compose, and Maven without images', () => {
  const workflow = read('.github/workflows/ci.yml');

  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /pull_request:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /node --test tests/);
  assert.match(workflow, /docker compose --env-file \.env\.example config/);
  assert.match(workflow, /actions\/setup-java@v4/);
  assert.match(workflow, /java-version: '17'/);
  assert.match(workflow, /\.\/mvnw verify/);
  assert.doesNotMatch(workflow, /-Pcontainer-images/);
});
