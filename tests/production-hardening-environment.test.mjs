import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const sensitiveLocalFiles = [
  '.env',
  'docker-compose/.env',
  'docker-compose/keycloak_token.txt',
  'twitter-to-kafka-service/src/main/resources/twitter4j.properties',
];

const applicationConfigFiles = [
  'config-server-repository/config-client-analytics.yml',
  'config-server-repository/config-client-elastic_query.yml',
  'config-server-repository/config-client-elastic_query_web.yml',
  'config-server-repository/config-client-elastic_query_web_2.yml',
  'twitter-to-kafka-service/src/main/resources/application.yml',
  'reactive-elastic-query-service/src/main/resources/bootstrap.yml',
  'reactive-elastic-query-web-client/src/main/resources/bootstrap.yml',
  'elastic-query-web-client-2/src/main/resources/bootstrap.yml',
];

const composeFiles = [
  'docker-compose/services.yml',
  'docker-compose/keycloak_postgres.yml',
  'docker-compose/keycloak_authorization_server.yml',
  'docker-compose/monitoring.yml',
];

function read(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  return {
    ...result,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function runGit(args) {
  return run('git', ['-c', 'safe.directory=*', ...args]);
}

function parseEnvironmentExample(relativePath) {
  return new Map(
    read(relativePath)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        assert.notEqual(separator, -1, `${relativePath}: entrada inválida: ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

test('@spec:AC-001 @principle:P-002 Credenciais locais não entram no Git', () => {
  const trackedResult = runGit(['ls-files']);
  assert.equal(trackedResult.status, 0, trackedResult.output);
  const trackedFiles = new Set(trackedResult.stdout.split(/\r?\n/).filter(Boolean));

  for (const sensitivePath of sensitiveLocalFiles) {
    assert.equal(trackedFiles.has(sensitivePath), false, `${sensitivePath} ainda está rastreado`);
  }

  const ignoredResult = runGit(['check-ignore', '--no-index', ...sensitiveLocalFiles]);
  assert.equal(ignoredResult.status, 0, ignoredResult.output);
  const ignoredFiles = new Set(ignoredResult.stdout.split(/\r?\n/).filter(Boolean));
  for (const sensitivePath of sensitiveLocalFiles) {
    assert.equal(ignoredFiles.has(sensitivePath), true, `${sensitivePath} não está ignorado`);
  }

  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\{cipher}[0-9a-f]{32,}/i,
    /^\s*oauth\.(?:consumerSecret|accessToken|accessTokenSecret)\s*[=:]\s*\S+/im,
    /^\s*client-secret:(?![ \t]*['"]?\$\{)[^\r\n]+/im,
  ];

  for (const trackedFile of trackedFiles) {
    if (trackedFile.startsWith('tests/') || trackedFile.startsWith('.spec/')) continue;

    const absolutePath = resolve(repositoryRoot, trackedFile);
    let stats;
    try {
      stats = statSync(absolutePath);
    } catch {
      continue;
    }
    if (!stats.isFile() || stats.size > 1_000_000) continue;

    let content;
    try {
      content = readFileSync(absolutePath, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of secretPatterns) {
      assert.equal(pattern.test(content), false, `${trackedFile} contém material sensível versionado`);
    }
  }
});

test('@spec:AC-002 Configurações usam variáveis de ambiente', () => {
  const rootExample = parseEnvironmentExample('.env.example');
  const composeExample = parseEnvironmentExample('docker-compose/.env.example');
  const springPlaceholderPattern = /^\$\{([A-Z][A-Z0-9_]*)\}$/;
  const composePlaceholderPattern = /^\$\{([A-Z][A-Z0-9_]*)(?::[?+-][^}]*)?\}$/;

  for (const configFile of applicationConfigFiles) {
    const content = read(configFile);
    const assignments = [...content.matchAll(/^\s*(?:password|client-secret):\s*['"]?([^'"\r\n]+)['"]?\s*$/gim)];
    assert.ok(assignments.length > 0, `${configFile} não expõe uma atribuição de segredo verificável`);

    for (const [, value] of assignments) {
      const placeholder = value.match(springPlaceholderPattern);
      assert.ok(placeholder, `${configFile} usa segredo literal: ${value}`);
      assert.ok(rootExample.get(placeholder[1]), `${placeholder[1]} não está documentada em .env.example`);
    }
  }

  for (const composeFile of composeFiles) {
    const content = read(composeFile);
    const assignments = [...content.matchAll(/^\s*-?\s*["']?(?:[A-Z0-9_-]*(?:PASSWORD|SECRET|TOKEN|ENCRYPT_KEY))=([^"'\r\n]+)["']?\s*$/gim)];
    assert.ok(assignments.length > 0, `${composeFile} não expõe uma atribuição de segredo verificável`);

    for (const [, value] of assignments) {
      const placeholder = value.match(composePlaceholderPattern);
      assert.ok(placeholder, `${composeFile} usa segredo literal: ${value}`);
      assert.ok(
        composeExample.get(placeholder[1]),
        `${placeholder[1]} não está documentada em docker-compose/.env.example`,
      );
    }
  }
});

test('@spec:AC-009 Docker Compose é validável sem segredos reais', () => {
  const example = parseEnvironmentExample('docker-compose/.env.example');
  for (const [name, value] of example) {
    assert.ok(value.trim(), `${name} está vazia em docker-compose/.env.example`);
  }

  const composeConfigurations = [
    [
      'docker-compose/common.yml',
      'docker-compose/kafka_cluster.yml',
      'docker-compose/elastic_cluster.yml',
      'docker-compose/redis_cluster.yml',
      'docker-compose/monitoring.yml',
      'docker-compose/zipkin.yml',
      'docker-compose/services.yml',
    ],
    ['docker-compose/keycloak_postgres.yml'],
    ['docker-compose/keycloak_authorization_server.yml'],
    ['docker-compose/common.yml', 'docker-compose/monitoring.yml'],
  ];

  for (const files of composeConfigurations) {
    const args = ['compose', '--env-file', 'docker-compose/.env.example'];
    for (const file of files) args.push('-f', file);
    args.push('config');

    const result = run('docker', args);
    assert.equal(result.status, 0, `${files.join(' + ')}:\n${result.output}`);
    assert.match(result.stdout, /^services:/m, `${files.join(' + ')} não renderizou serviços`);
    assert.doesNotMatch(result.stdout, /\$\{[A-Z][A-Z0-9_]*/, `${files.join(' + ')} deixou variável sem resolver`);
    assert.doesNotMatch(
      result.stdout,
      /^\s+(?:[A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|ENCRYPT_KEY)):\s*(?:null|''|"")?\s*$/gim,
      `${files.join(' + ')} deixou segredo obrigatório vazio`,
    );
  }
});
