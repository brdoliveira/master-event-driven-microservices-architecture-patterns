# Event-driven microservices architecture patterns

This repository is a local demonstration of an event-driven microservices
architecture. It uses Java 17, Maven Wrapper, Docker Compose, Kafka and
Elasticsearch.

## Prerequisites

- Git
- Java 17 (with `JAVA_HOME` configured)
- Docker Desktop or Docker Engine with the Docker Compose plugin

Maven does not need to be installed globally: the Maven Wrapper pins the
project Maven version.

## Prepare local configuration safely

Do not put credentials in tracked files. Create local environment files from
the examples, then replace only the placeholder values with credentials issued
for your local environment.

On Linux or macOS:

```shell
cp .env.example .env.local
cp docker-compose/.env.example docker-compose/.env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
Copy-Item docker-compose/.env.example docker-compose/.env
```

Keep `.env.local`, `docker-compose/.env`, OAuth tokens and other secrets out
of Git. The Twitter service can run with mock tweets; set the Twitter token
only when exercising the real Twitter integration.

## Verify the checkout

Run the acceptance and security contract from the repository root:

```shell
node --test tests
```

Then run the normal Maven verification lifecycle. It uses the Maven Wrapper
and does not create container images:

```shell
./mvnw --version
./mvnw verify
```

On Windows, use `mvnw.cmd`:

```powershell
.\mvnw.cmd --version
.\mvnw.cmd verify
```

`./mvnw install` is also image-free by default.

## Create container images explicitly

Container images are intentionally opt-in. With Docker running, activate the
`container-images` profile to execute the existing Spring Boot image builds:

```shell
./mvnw -Pcontainer-images install
```

On Windows:

```powershell
.\mvnw.cmd -Pcontainer-images install
```

## Start and validate the Docker Compose environment

After creating `docker-compose/.env` from its example, validate the resolved
configuration before starting containers:

```shell
cd docker-compose
docker compose --env-file .env config
docker compose up -d
```

Inspect the service state and logs as needed:

```shell
docker compose ps
docker compose logs -f config-server gateway-service
```

Stop the local environment when finished:

```shell
docker compose down
```

The Compose environment expects the service images built with the explicit
`container-images` profile above.
