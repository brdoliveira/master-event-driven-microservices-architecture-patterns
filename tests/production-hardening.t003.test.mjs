import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

function property(properties, name) {
  const match = properties.match(new RegExp(`^${name}=(.+)$`, 'm'));
  assert.ok(match, `Expected ${name} in maven-wrapper.properties`);
  return match[1].trim();
}

test('@spec:AC-003 Maven Wrapper resolves a pinned Maven without a global installation', () => {
  const properties = read('.mvn/wrapper/maven-wrapper.properties');
  const distributionUrl = property(properties, 'distributionUrl');
  const distributionSha256Sum = property(properties, 'distributionSha256Sum');
  const wrapperUrl = property(properties, 'wrapperUrl');
  const wrapperJar = resolve(repositoryRoot, '.mvn/wrapper/maven-wrapper.jar');

  assert.match(
    distributionUrl,
    /^https:\/\/repo\.maven\.apache\.org\/maven2\/org\/apache\/maven\/apache-maven\/(\d+\.\d+\.\d+)\/apache-maven-\1-bin\.zip$/,
  );
  assert.match(distributionSha256Sum, /^[a-f0-9]{64}$/);
  assert.match(wrapperUrl, /^https:\/\/repo\.maven\.apache\.org\/maven2\/.+\/maven-wrapper-[\d.]+\.jar$/);
  assert.ok(statSync(wrapperJar).size > 0, 'Expected a non-empty Maven Wrapper JAR');

  const entries = spawnSync('jar', ['tf', wrapperJar], { encoding: 'utf8' });
  assert.equal(entries.status, 0, entries.stderr);
  assert.match(entries.stdout, /org\/apache\/maven\/wrapper\/MavenWrapperMain\.class/);

  const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : './mvnw';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'mvnw.cmd --version'] : ['--version'];
  const version = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      MAVEN_USER_HOME: resolve(homedir(), '.m2'),
      PATH: process.env.JAVA_HOME ? `${process.env.JAVA_HOME}/bin` : process.env.PATH,
    },
  });

  assert.equal(version.status, 0, `${version.stdout}\n${version.stderr}`);
  assert.match(`${version.stdout}\n${version.stderr}`, /Apache Maven \d+\.\d+\.\d+/);
});

test('@spec:AC-004 @principle:P-003 standard Maven builds skip images and an explicit profile enables them', () => {
  const pom = read('pom.xml');
  const readme = read('README.md');

  assert.match(pom, /<spring-boot\.build-image\.skip>true<\/spring-boot\.build-image\.skip>/);
  assert.match(
    pom,
    /<profile>[\s\S]*?<id>container-images<\/id>[\s\S]*?<spring-boot\.build-image\.skip>false<\/spring-boot\.build-image\.skip>[\s\S]*?<\/profile>/,
  );
  assert.match(readme, /\.\/mvnw verify/);
  assert.match(readme, /\.\/mvnw install/);
  assert.match(readme, /\.\/mvnw -Pcontainer-images install/);
  assert.match(readme, /does not create container images/i);
});
