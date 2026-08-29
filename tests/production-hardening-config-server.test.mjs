import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

test('@spec:AC-005 Config Server usa o repositório local por padrão', () => {
  const localConfig = read('config-server/src/main/resources/application.yml');
  const gitConfig = read('config-server/src/main/resources/application-git.yml');

  assert.match(localConfig, /\bactive\s*:\s*native\b/i, 'o perfil padrão deve ser native');
  assert.match(localConfig, /^\s*native\s*:\s*$/m, 'o backend native deve estar configurado');
  assert.match(
    localConfig,
    /search-locations\s*:[^\r\n]*config-server-repository/i,
    'o backend native deve ler config-server-repository',
  );
  assert.doesNotMatch(localConfig, /^\s*git\s*:\s*$/m, 'o backend Git não pode ser o padrão');
  assert.match(gitConfig, /on-profile\s*:\s*git\b/i, 'Git externo deve exigir o perfil git');
  assert.match(
    gitConfig,
    /uri\s*:\s*["']?\$\{[A-Z][A-Z0-9_]*\}/i,
    'a URI Git deve ser fornecida explicitamente pelo ambiente',
  );

  for (const [relativePath, expectedMounts] of [
    ['docker-compose/config_server.yml', 1],
    ['docker-compose/services.yml', 2],
  ]) {
    const compose = read(relativePath);
    const mounts = compose.match(/config-server-repository[^\r\n]*:ro\b/g) ?? [];
    assert.ok(
      mounts.length >= expectedMounts,
      `${relativePath} deve montar config-server-repository como somente leitura`,
    );
  }
});

test('@spec:AC-006 Operações criptográficas exigem autenticação', () => {
  const security = read(
    'config-server/src/main/java/com/microservices/demo/config/server/config/SecurityConfig.java',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const publicMatchers = [
    ...security.matchAll(/\.requestMatchers\s*\(([\s\S]*?)\)\s*\.permitAll\s*\(\)/g),
  ];
  assert.ok(publicMatchers.length > 0, 'a rota de saúde deve ser pública');

  const publicPaths = publicMatchers.flatMap((match) => [
    ...match[1].matchAll(/["'](\/[^"']*)["']/g),
  ].map((pathMatch) => pathMatch[1]));
  assert.ok(
    publicPaths.some((path) => /^\/actuator\/health(?:\/\*\*)?$/.test(path)),
    'a rota de saúde deve estar em permitAll',
  );
  assert.ok(
    publicPaths.every((path) => /^\/actuator\/health(?:\/\*\*)?$/.test(path)),
    `somente health pode ser pública; encontrado: ${publicPaths.join(', ')}`,
  );
  assert.match(security, /\.anyRequest\s*\(\)\s*\.authenticated\s*\(\)/);
  assert.match(security, /\.httpBasic\s*\(/);
});
