# Tasks: Production hardening

> feature: production-hardening

## T-001 — Criar gates estruturais de segurança e operação [concluida]
- Refs: US-001, AC-001, AC-002, US-002, AC-003, AC-004, US-003, AC-005, AC-006, AC-007, AC-008, US-004, AC-009, AC-010, AC-011, AC-012
- Arquivos: tests/production-hardening.test.mjs, .spec/constituicao.md, onpspec.config.json
- Modelo: gpt-5.6-sol
- Esforço: alto
- Notas: Escrever primeiro os testes anotados que falham para os doze critérios.

## T-002 — Sanear credenciais e exemplos de ambiente [concluida]
- Refs: US-001, AC-001, AC-002, US-004, AC-009
- Arquivos: .gitignore, .env.example, docker-compose/.env.example, docker-compose/services.yml, docker-compose/keycloak_postgres.yml, docker-compose/keycloak_authorization_server.yml, docker-compose/monitoring.yml, config-server-repository/config-client-analytics.yml, config-server-repository/config-client-elastic_query.yml, config-server-repository/config-client-elastic_query_web.yml, config-server-repository/config-client-elastic_query_web_2.yml, twitter-to-kafka-service/src/main/resources/application.yml, reactive-elastic-query-service/src/main/resources/bootstrap.yml, reactive-elastic-query-web-client/src/main/resources/bootstrap.yml, elastic-query-web-client-2/src/main/resources/bootstrap.yml
- Modelo: gpt-5.6-sol
- Esforço: alto
- Notas: Preservar arquivos locais ignorados; versionar somente placeholders.

## T-003 — Restaurar Maven Wrapper e isolar criação de imagens [pendente]

- Refs: US-002, AC-003, AC-004
- Arquivos: .mvn/wrapper/maven-wrapper.properties, .mvn/wrapper/maven-wrapper.jar, pom.xml, README.md
- Modelo: gpt-5.6-sol
- Esforço: alto
- Notas: Build padrão sem imagens; perfil `container-images` reativa os goals existentes.

## T-004 — Tornar o Config Server local e seguro por padrão [concluida]
- Refs: US-003, AC-005, AC-006, US-004, AC-009
- Arquivos: config-server/src/main/resources/application.yml, config-server/src/main/resources/application-git.yml, config-server/src/main/java/com/microservices/demo/config/server/config/SecurityConfig.java, docker-compose/services.yml, docker-compose/config_server.yml
- Modelo: gpt-5.6-sol
- Esforço: alto
- Notas: Backend native por padrão; Git externo opt-in; volume somente leitura.

## T-005 — Proteger Gateway e API reativa com JWT [concluida]
- Refs: US-003, AC-007, AC-008
- Arquivos: gateway-service/pom.xml, gateway-service/src/main/java/com/microservices/demo/gateway/service/config/WebSecurityConfig.java, config-server-repository/config-client-gateway.yml, reactive-elastic-query-service/pom.xml, reactive-elastic-query-service/src/main/java/com/microservices/demo/reactive/elastic/query/service/config/WebSecurityConfig.java, config-server-repository/config-client-reactive_elastic_query.yml
- Modelo: gpt-5.6-sol
- Esforço: alto
- Notas: Resource Server JWT; liberar somente health.

## T-006 — Modernizar e validar a composição Docker [concluida]
- Refs: US-004, AC-009, AC-010
- Arquivos: docker-compose/common.yml, docker-compose/kafka_cluster.yml, docker-compose/elastic_cluster.yml, docker-compose/redis_cluster.yml, docker-compose/monitoring.yml, docker-compose/zipkin.yml, docker-compose/services.yml, docker-compose/config_server.yml, docker-compose/twitter_to_kafka.yml, docker-compose/keycloak_postgres.yml, docker-compose/keycloak_authorization_server.yml
- Modelo: gpt-5.6-terra
- Esforço: medio
- Notas: Remover `version`, validar variáveis e preservar nomes e rotas.

## T-007 — Documentar operação e adicionar CI [pendente]

- Refs: US-004, AC-011, AC-012, US-002, AC-004
- Arquivos: README.md, .github/workflows/ci.yml
- Modelo: gpt-5.6-terra
- Esforço: medio
- Notas: CI executa gates Node, Compose config e Maven verify sem imagens.
