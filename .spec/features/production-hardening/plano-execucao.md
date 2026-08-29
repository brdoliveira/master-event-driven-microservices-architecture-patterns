# Plano de execução — production-hardening

> gerado por `onp-spec plano` em 2026-08-29 22:16 — NÃO edite à mão;
> mudou tasks.md ou a config? Regenere: `onp-spec plano production-hardening`

## Resumo — o que vai acontecer

- **7 tarefa(s) pendente(s)**: 7 em 4 faixa(s) paralela(s) + 0 sequencial(is)
- **1 faixa = 1 worktree + 1 branch + 1 janela de contexto limpa** — faixas não compartilham nenhum arquivo entre si
- prefere outra seleção ou uma após a outra? Regenere com `onp-spec plano production-hardening --paralelizar T-xxx,T-yyy` ou `--sequencial`
- tudo acontece na branch de trabalho `spec/production-hardening`; levar para a main é decisão sua

## Faixas e ondas

### Onda 1 — faixa-1 ∥ faixa-2 ∥ faixa-3

#### faixa-1 — branch `spec/production-hardening-faixa-1` — worktree `../onp-worktrees/master-event-driven-microservices-architecture-patterns-production-hardening-faixa-1`

| tarefa | título | modelo | esforço | arquivos |
|---|---|---|---|---|
| T-001 | Criar gates estruturais de segurança e operação | `gpt-5.6-sol` | high | `tests/production-hardening.test.mjs`, `.spec/constituicao.md`, `onpspec.config.json` |

#### faixa-2 — branch `spec/production-hardening-faixa-2` — worktree `../onp-worktrees/master-event-driven-microservices-architecture-patterns-production-hardening-faixa-2`

| tarefa | título | modelo | esforço | arquivos |
|---|---|---|---|---|
| T-002 | Sanear credenciais e exemplos de ambiente | `gpt-5.6-sol` | high | `.gitignore`, `.env.example`, `docker-compose/.env.example`, `docker-compose/services.yml`, `docker-compose/keycloak_postgres.yml`, `docker-compose/keycloak_authorization_server.yml`, `docker-compose/monitoring.yml`, `config-server-repository/config-client-analytics.yml`, `config-server-repository/config-client-elastic_query.yml`, `config-server-repository/config-client-elastic_query_web.yml`, `config-server-repository/config-client-elastic_query_web_2.yml`, `twitter-to-kafka-service/src/main/resources/application.yml`, `reactive-elastic-query-service/src/main/resources/bootstrap.yml`, `reactive-elastic-query-web-client/src/main/resources/bootstrap.yml`, `elastic-query-web-client-2/src/main/resources/bootstrap.yml` |
| T-004 | Tornar o Config Server local e seguro por padrão | `gpt-5.6-sol` | high | `config-server/src/main/resources/application.yml`, `config-server/src/main/resources/application-git.yml`, `config-server/src/main/java/com/microservices/demo/config/server/config/SecurityConfig.java`, `docker-compose/services.yml`, `docker-compose/config_server.yml` |
| T-006 | Modernizar e validar a composição Docker | `gpt-5.6-terra` | medium | `docker-compose/common.yml`, `docker-compose/kafka_cluster.yml`, `docker-compose/elastic_cluster.yml`, `docker-compose/redis_cluster.yml`, `docker-compose/monitoring.yml`, `docker-compose/zipkin.yml`, `docker-compose/services.yml`, `docker-compose/config_server.yml`, `docker-compose/twitter_to_kafka.yml`, `docker-compose/keycloak_postgres.yml`, `docker-compose/keycloak_authorization_server.yml` |

#### faixa-3 — branch `spec/production-hardening-faixa-3` — worktree `../onp-worktrees/master-event-driven-microservices-architecture-patterns-production-hardening-faixa-3`

| tarefa | título | modelo | esforço | arquivos |
|---|---|---|---|---|
| T-003 | Restaurar Maven Wrapper e isolar criação de imagens | `gpt-5.6-sol` | high | `.mvn/wrapper/maven-wrapper.properties`, `.mvn/wrapper/maven-wrapper.jar`, `pom.xml`, `README.md` |
| T-007 | Documentar operação e adicionar CI | `gpt-5.6-terra` | medium | `README.md`, `.github/workflows/ci.yml` |

### Onda 2 — faixa-4

#### faixa-4 — branch `spec/production-hardening-faixa-4` — worktree `../onp-worktrees/master-event-driven-microservices-architecture-patterns-production-hardening-faixa-4`

| tarefa | título | modelo | esforço | arquivos |
|---|---|---|---|---|
| T-005 | Proteger Gateway e API reativa com JWT | `gpt-5.6-sol` | high | `gateway-service/pom.xml`, `gateway-service/src/main/java/com/microservices/demo/gateway/service/config/WebSecurityConfig.java`, `config-server-repository/config-client-gateway.yml`, `reactive-elastic-query-service/pom.xml`, `reactive-elastic-query-service/src/main/java/com/microservices/demo/reactive/elastic/query/service/config/WebSecurityConfig.java`, `config-server-repository/config-client-reactive_elastic_query.yml` |

## Gestão de branches e commits

1. branch de trabalho `spec/production-hardening` criada do ponto atual (se ainda não existir)
2. cada faixa nasce dela como branch própria e roda no seu worktree — **1 tarefa = 1 commit** (`T-xxx feature: título`)
3. terminou a onda → merge `--no-ff` de cada faixa de volta, na ordem; conflito interrompe a faixa e pede resolução humana
4. faixa mesclada → worktree removido, branch apagada, tarefa marcada `[concluida]` no tasks.md
5. gate final na branch de trabalho: `onp-spec verify production-hardening` + `onp-spec audit --ci` — **exit 0 ou não está pronto**

## Como executar

### ▶ Execução — Codex headless (codex exec)

```bash
bash .spec/features/production-hardening/executar-tarefas.sh
```

Cada faixa roda `codex exec` com **janela de contexto limpa**, no seu worktree, com
`--model` e `model_reasoning_effort` já definidos por tarefa e sandbox `workspace-write`. Os prompts exatos estão
embutidos no script — quer rodar uma faixa na mão, é só copiá-los de lá.
Logs: `../onp-worktrees/master-event-driven-microservices-architecture-patterns-production-hardening-logs/`.

**Confirmação de custos — antes de executar**: os modelos e esforços por
tarefa estão nas tabelas acima; o agente CONFIRMA com o usuário se estão
dentro da licença/cota dele (modelo forte + esforço alto torra tokens).
Para gastar menos: `onp-spec plano production-hardening --modelo gpt-5.6-luna --esforco baixo`
(tudo) ou por tarefa `onp-spec tarefa production-hardening T-xxx --modelo <m> --esforco <nível>` — e regenere o plano.

### 📣 Acompanhamento — tabela + resumo no chat (a cada 1 min)

O script roda em **background**: o agente AVISA o usuário antes de iniciar e,
enquanto roda, posta no chat a cada ~1 minuto a **tabela de andamento** (qual
tarefa está rodando, qual não está, o que concluiu/falhou) junto com o
**resumo geral de andamento** (escrito por IA; sem IA, o motor resume). Ao
final, o usuário recebe o resumo completo da execução. A qualquer momento:

```bash
onp-spec resumo production-hardening --tabela   # a tabela de andamento
onp-spec resumo production-hardening            # o resumo em texto
```

