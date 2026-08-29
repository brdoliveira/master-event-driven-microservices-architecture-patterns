import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const safeDirectory = repoRoot.replaceAll("\\", "/");

function absolute(relativePath) {
  return path.join(repoRoot, ...relativePath.split("/"));
}

function read(relativePath) {
  return readFileSync(absolute(relativePath), "utf8");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
}

function git(args, options = {}) {
  return run("git", ["-c", `safe.directory=${safeDirectory}`, ...args], options);
}

function assertCommandPassed(result, description) {
  assert.equal(
    result.status,
    0,
    `${description} failed (exit ${result.status ?? "unavailable"}).\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
}

function trackedFiles() {
  const result = git(["ls-files", "-z"]);
  assertCommandPassed(result, "git ls-files");
  return result.stdout.split("\0").filter(Boolean);
}

function filesNamed(startDirectory, fileName) {
  const matches = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if ([".git", "target", "node_modules"].includes(entry.name)) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.name === fileName) matches.push(entryPath);
    }
  }

  visit(absolute(startDirectory));
  return matches;
}

function stripJavaComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function assertOnlyHealthIsPublic(source, anyMatcher) {
  const java = stripJavaComments(source);
  const publicMatchers = [
    ...java.matchAll(/\.(?:requestMatchers|pathMatchers)\s*\(([\s\S]*?)\)\s*\.permitAll\s*\(\)/g),
  ];

  assert.ok(publicMatchers.length > 0, "a public health matcher is required");
  const publicPaths = publicMatchers.flatMap((match) => [
    ...match[1].matchAll(/["'](\/[^"']*)["']/g),
  ].map((pathMatch) => pathMatch[1]));
  assert.ok(
    publicPaths.some((publicPath) => /^\/actuator\/health(?:\/\*\*)?$/.test(publicPath)),
    `health must be public; found: ${publicPaths.join(", ") || "no literal paths"}`,
  );
  assert.ok(
    publicPaths.every((publicPath) => /^\/actuator\/health(?:\/\*\*)?$/.test(publicPath)),
    `only health may be public; found: ${publicPaths.join(", ")}`,
  );
  assert.match(java, anyMatcher, "all remaining requests must require authentication");
}

function assertReactiveJwt(serviceDirectory) {
  const pom = read(`${serviceDirectory}/pom.xml`);
  const packagePath = serviceDirectory === "gateway-service"
    ? "gateway/service"
    : "reactive/elastic/query/service";
  const security = read(
    `${serviceDirectory}/src/main/java/com/microservices/demo/${packagePath}/config/WebSecurityConfig.java`,
  );

  assert.match(
    pom,
    /<artifactId>spring-boot-starter-oauth2-resource-server<\/artifactId>/,
    "the service must include Spring Security's OAuth2 Resource Server starter",
  );
  assertOnlyHealthIsPublic(
    security,
    /\.anyExchange\s*\(\)\s*\.authenticated\s*\(\)/,
  );
  assert.match(security, /\.oauth2ResourceServer\s*\(/, "JWT resource server must be enabled");
  assert.match(security, /\bjwt\b/, "the resource server must validate JWTs");
}

function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    assert.ok(match, `invalid environment entry: ${rawLine}`);
    values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}

test("@spec:AC-001 @principle:P-002 credenciais locais não entram no Git", () => {
  const tracked = trackedFiles();
  const localCredentialFiles = [
    ".env",
    "docker-compose/.env",
    "docker-compose/keycloak_token.txt",
    "twitter-to-kafka-service/src/main/resources/twitter4j.properties",
  ];

  for (const relativePath of localCredentialFiles) {
    assert.ok(!tracked.includes(relativePath), `${relativePath} must not be tracked`);
    const ignored = git(["check-ignore", "--no-index", "--quiet", "--", relativePath]);
    assert.equal(ignored.status, 0, `${relativePath} must remain ignored by Git`);
  }

  const credentialPathPattern = /(^|\/)(?:\.env|twitter4j\.properties|[^/]+\.(?:pem|key|p12|pfx))$/i;
  assert.deepEqual(
    tracked.filter((relativePath) => credentialPathPattern.test(relativePath)),
    [],
    "credential-bearing local files must not be tracked",
  );

  const secretSignatures = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /^\s*oauth\.(?:consumerKey|consumerSecret|accessToken|accessTokenSecret)\s*=\s*(?!\$\{)[^*\s][^\r\n]*$/mi,
  ];
  const leaks = [];
  for (const relativePath of tracked) {
    const buffer = readFileSync(absolute(relativePath));
    if (buffer.includes(0)) continue;
    const source = buffer.toString("utf8");
    for (const signature of secretSignatures) {
      if (signature.test(source)) leaks.push(`${relativePath}: ${signature}`);
    }
  }
  assert.deepEqual(leaks, [], `tracked secret signatures found:\n${leaks.join("\n")}`);
});

test("@spec:AC-002 @principle:P-002 configurações usam variáveis de ambiente", () => {
  const configurationFiles = [
    "config-server/src/main/resources/application.yml",
    "config-server/src/main/resources/application-git.yml",
    "config-server-repository/config-client-analytics.yml",
    "config-server-repository/config-client-elastic_query.yml",
    "config-server-repository/config-client-elastic_query_web.yml",
    "config-server-repository/config-client-elastic_query_web_2.yml",
    "twitter-to-kafka-service/src/main/resources/application.yml",
    "reactive-elastic-query-service/src/main/resources/bootstrap.yml",
    "reactive-elastic-query-web-client/src/main/resources/bootstrap.yml",
    "elastic-query-web-client-2/src/main/resources/bootstrap.yml",
    "docker-compose/services.yml",
    "docker-compose/config_server.yml",
    "docker-compose/keycloak_postgres.yml",
    "docker-compose/keycloak_authorization_server.yml",
    "docker-compose/monitoring.yml",
  ];
  const yamlSecretKey = /^\s*(?:password|client-secret|consumer-key|consumer-secret|access-token|access-token-secret|twitter-v2-bearer-token|encrypt-key)\s*:\s*(.*?)\s*$/i;
  const composeSecret = /(?:^|[\s"'])((?:[A-Z0-9_-]*(?:PASSWORD|SECRET|TOKEN)|ENCRYPT_KEY))=(.*?)(?="|'|\s*$)/;
  const placeholder = /^\$\{[A-Z][A-Z0-9_]*(?::\?[^}]*)?\}$/;
  let sensitiveSettingCount = 0;

  for (const relativePath of configurationFiles) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /\{cipher\}/i, `${relativePath} embeds an encrypted secret`);
    for (const line of source.split(/\r?\n/)) {
      const yamlMatch = line.match(yamlSecretKey);
      const composeMatch = line.match(composeSecret);
      const value = yamlMatch?.[1] ?? composeMatch?.[2];
      if (value === undefined) continue;
      sensitiveSettingCount += 1;
      const normalizedValue = value.trim().replace(/^(["'])(.*)\1$/, "$2");
      assert.match(normalizedValue, placeholder, `${relativePath} has an embedded sensitive value: ${line.trim()}`);
    }
  }

  assert.ok(sensitiveSettingCount > 0, "the configuration gate did not inspect any sensitive setting");
});

test("@spec:AC-003 @principle:P-003 Maven Wrapper está completo e fixa a distribuição", () => {
  for (const relativePath of [
    "mvnw",
    "mvnw.cmd",
    ".mvn/wrapper/maven-wrapper.properties",
    ".mvn/wrapper/maven-wrapper.jar",
  ]) {
    assert.ok(existsSync(absolute(relativePath)), `${relativePath} is required`);
  }

  const properties = read(".mvn/wrapper/maven-wrapper.properties");
  assert.match(
    properties,
    /^distributionUrl=.*apache-maven-\d+\.\d+\.\d+-bin\.zip\s*$/m,
    "distributionUrl must pin a complete Maven version",
  );
  assert.doesNotMatch(properties, /(?:LATEST|RELEASE|\$\{)/i, "wrapper URLs must be immutable");

  const wrapperJar = readFileSync(absolute(".mvn/wrapper/maven-wrapper.jar"));
  assert.ok(wrapperJar.length > 10_000, "maven-wrapper.jar is unexpectedly small");
  assert.equal(wrapperJar.subarray(0, 2).toString("ascii"), "PK", "maven-wrapper.jar must be a valid ZIP/JAR");
});

test("@spec:AC-004 @principle:P-003 imagens Docker exigem o perfil Maven explícito", () => {
  const pom = read("pom.xml");
  const profiles = [...pom.matchAll(/<profile>([\s\S]*?)<\/profile>/g)].map((match) => match[1]);
  const imageProfile = profiles.find((profile) => /<id>container-images<\/id>/.test(profile));
  assert.ok(imageProfile, "pom.xml must declare the container-images profile");
  assert.match(
    pom.replace(/<profiles>[\s\S]*?<\/profiles>/g, ""),
    /<spring-boot\.build-image\.skip>true<\/spring-boot\.build-image\.skip>/,
    "image creation must be skipped outside profiles",
  );
  assert.match(
    imageProfile,
    /<spring-boot\.build-image\.skip>false<\/spring-boot\.build-image\.skip>/,
    "container-images must explicitly enable image creation",
  );

  for (const pomPath of filesNamed(".", "pom.xml")) {
    const modulePom = readFileSync(pomPath, "utf8").replace(/<profile>[\s\S]*?<\/profile>/g, "");
    assert.doesNotMatch(
      modulePom,
      /<spring-boot\.build-image\.skip>false<\/spring-boot\.build-image\.skip>/,
      `${path.relative(repoRoot, pomPath)} enables image creation by default`,
    );
  }

  const readme = read("README.md");
  assert.match(readme, /(?:\.\/)?mvnw(?:\.cmd)?[^\r\n]*-Pcontainer-images/i, "README must document the image profile command");
});

test("@spec:AC-005 Config Server usa o repositório local por padrão", () => {
  const localConfig = read("config-server/src/main/resources/application.yml");
  const externalConfig = read("config-server/src/main/resources/application-git.yml");

  assert.match(localConfig, /\b(?:active|default)\s*:\s*native\b/i, "the default Spring profile must be native");
  assert.match(localConfig, /^\s*native\s*:\s*$/m, "the native Config Server backend is required");
  assert.match(localConfig, /search-locations\s*:[^\r\n]*config-server-repository/i, "native search locations must point to config-server-repository");
  assert.doesNotMatch(localConfig, /^\s*git\s*:\s*$/m, "the default configuration must not select a Git backend");

  assert.match(externalConfig, /on-profile\s*:\s*git\b/i, "external Git must require the git profile");
  assert.match(externalConfig, /uri\s*:\s*["']?\$\{[A-Z][A-Z0-9_]*(?::\?[^}]*)?\}/i, "external Git URI must be required through the environment");
  assert.doesNotMatch(externalConfig, /uri\s*:[^\r\n]*\$\{[^}]+:-/i, "external Git URI must not have an embedded fallback repository");

  for (const [relativePath, minimumMounts] of [
    ["docker-compose/config_server.yml", 1],
    ["docker-compose/services.yml", 2],
  ]) {
    const compose = read(relativePath);
    const readOnlyMounts = compose.match(/config-server-repository[^\r\n]*:ro\b/g) ?? [];
    assert.ok(
      readOnlyMounts.length >= minimumMounts,
      `${relativePath} must mount config-server-repository read-only for every Config Server`,
    );
  }
});

test("@spec:AC-006 @principle:P-004 operações criptográficas exigem autenticação", () => {
  const security = read("config-server/src/main/java/com/microservices/demo/config/server/config/SecurityConfig.java");
  assertOnlyHealthIsPublic(
    security,
    /\.anyRequest\s*\(\)\s*\.authenticated\s*\(\)/,
  );
  assert.match(security, /\.httpBasic\s*\(/, "Config Server must provide authenticated access");
});

test("@spec:AC-007 @principle:P-004 Gateway exige JWT nas rotas de negócio", () => {
  assertReactiveJwt("gateway-service");
  assert.match(
    read("config-server-repository/config-client-gateway.yml"),
    /resourceserver\s*:\s*\r?\n\s+jwt\s*:/i,
    "Gateway JWT issuer/JWK configuration is required",
  );
});

test("@spec:AC-008 @principle:P-004 API reativa exige JWT nas consultas", () => {
  assertReactiveJwt("reactive-elastic-query-service");
  assert.match(
    read("config-server-repository/config-client-reactive_elastic_query.yml"),
    /resourceserver\s*:\s*\r?\n\s+jwt\s*:/i,
    "Reactive query API JWT issuer/JWK configuration is required",
  );
});

test("@spec:AC-009 @principle:P-005 Docker Compose é validável sem segredos reais", () => {
  assert.ok(existsSync(absolute(".env.example")), "root .env.example is required");
  assert.ok(existsSync(absolute("docker-compose/.env.example")), "docker-compose/.env.example is required");

  const rootEnvValues = parseEnv(read(".env.example"));
  const envSource = read("docker-compose/.env.example");
  const envValues = parseEnv(envSource);
  for (const [variable, value] of Object.entries({ ...rootEnvValues, ...envValues })) {
    if (!/(?:PASSWORD|SECRET|TOKEN|KEY)$/.test(variable)) continue;
    assert.match(
      value,
      /(?:change|example|replace|dummy|test|local|dev|fake|not-a-real|admin|keycloak)/i,
      `${variable} in an example environment file must be an unmistakably fictitious value`,
    );
  }
  assert.ok(envValues.COMPOSE_FILE, "COMPOSE_FILE must describe the local stack");
  const separator = envValues.COMPOSE_PATH_SEPARATOR || path.delimiter;
  const composeFiles = envValues.COMPOSE_FILE.split(separator).filter(Boolean);
  assert.ok(composeFiles.length > 0, "COMPOSE_FILE must include at least one fragment");
  for (const composeFile of composeFiles) {
    assert.ok(existsSync(absolute(`docker-compose/${composeFile}`)), `${composeFile} does not exist`);
  }

  const composeSource = composeFiles.map((composeFile) => read(`docker-compose/${composeFile}`)).join("\n");
  for (const match of composeSource.matchAll(/\$\{([A-Z][A-Z0-9_]*)(?:(:?[-?])[^}]*)?\}/g)) {
    const [, variable, modifier] = match;
    const hasDefault = modifier === "-" || modifier === ":-";
    if (!hasDefault) {
      assert.ok(
        Object.hasOwn(envValues, variable) && envValues[variable].trim() !== "",
        `${variable} is required by Docker Compose but empty in .env.example`,
      );
    }
  }

  const composeArgs = ["compose", "--env-file", ".env.example"];
  for (const composeFile of composeFiles) composeArgs.push("--file", composeFile);
  composeArgs.push("config", "--quiet");
  const compose = run("docker", composeArgs, {
    cwd: absolute("docker-compose"),
    env: { ...process.env, ...envValues },
  });
  assertCommandPassed(compose, "docker compose config");
});

test("@spec:AC-010 @principle:P-005 Compose não declara campos version obsoletos", () => {
  const yamlFiles = readdirSync(absolute("docker-compose"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => `docker-compose/${entry.name}`);
  assert.ok(yamlFiles.length > 0, "no Docker Compose fragments were found");
  for (const relativePath of yamlFiles) {
    assert.doesNotMatch(read(relativePath), /^version\s*:/m, `${relativePath} declares obsolete top-level version`);
  }
});

test("@spec:AC-011 @principle:P-005 README contém o guia completo de execução", () => {
  const readme = read("README.md");
  const requirements = [
    [/Java\s+17/i, "Java 17 prerequisite"],
    [/\bDocker\b/i, "Docker prerequisite"],
    [/\bGit\b/i, "Git prerequisite"],
    [/\.env\.example/i, "safe environment preparation"],
    [/node\s+--test\s+tests/i, "structural test command"],
    [/(?:\.\/)?mvnw(?:\.cmd)?[^\r\n]*\b(?:verify|install)\b/i, "Maven Wrapper build command"],
    [/-Pcontainer-images/i, "explicit image creation profile"],
    [/docker\s+compose[^\r\n]*\bup\b/i, "environment startup command"],
  ];
  for (const [pattern, description] of requirements) {
    assert.match(readme, pattern, `README is missing ${description}`);
  }
});

test("@spec:AC-012 @principle:P-005 CI verifica segurança, contrato e build", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /^\s*push\s*:/m, "CI must run on push");
  assert.match(workflow, /^\s*pull_request\s*:/m, "CI must run on pull requests");
  assert.ok((workflow.match(/\bmain\b/g) ?? []).length >= 2, "push and pull_request must target main");
  assert.match(workflow, /node\s+--test\s+tests/i, "CI must execute the acceptance contract");
  assert.match(workflow, /docker\s+compose[^\r\n]*\bconfig\b/i, "CI must validate Docker Compose");
  assert.match(workflow, /(?:\.\/)?mvnw(?:\.cmd)?[^\r\n]*\bverify\b/i, "CI must build through Maven Wrapper");
  assert.doesNotMatch(workflow, /-Pcontainer-images/i, "CI verification must not create images");
  assert.doesNotMatch(workflow, /(?:^|\s)mvn\s+(?:verify|install)\b/i, "CI must not depend on a global Maven installation");
});
