# Spec: Production hardening

> feature: production-hardening
> status: pronta

## Contexto

O monorepo demonstra uma arquitetura orientada a eventos completa, mas chegou
com credenciais locais, build não reproduzível, configuração dependente de um
repositório externo, rotas sensíveis permissivas e documentação insuficiente.
Esta entrega cria uma base segura e verificável sem alterar o fluxo funcional
Twitter/mock → Kafka → Elasticsearch/Kafka Streams → consultas e analytics.

## Histórias

### US-001 — Repositório seguro para colaboração

Como mantenedor, quero versionar somente exemplos e referências a variáveis de
ambiente, para compartilhar o projeto sem expor credenciais.

#### AC-001 — Credenciais locais não entram no Git

- **Dado** um checkout com arquivos locais de credenciais
- **Quando** a verificação de segurança inspeciona os arquivos rastreados
- **Então** nenhum token OAuth, chave privada ou segredo de cliente real é encontrado
- **E** os arquivos locais sensíveis conhecidos continuam ignorados pelo Git

#### AC-002 — Configurações usam variáveis de ambiente

- **Dado** os arquivos de configuração de serviços e infraestrutura
- **Quando** senhas e chaves necessárias à execução são configuradas
- **Então** seus valores vêm de variáveis de ambiente sem senha real embutida

### US-002 — Build reproduzível e previsível

Como desenvolvedor, quero executar o build com uma versão fixa do Maven e sem
efeitos colaterais, para verificar a mesma revisão localmente e na CI.

#### AC-003 — Maven Wrapper completo

- **Dado** um checkout novo com Java 17
- **Quando** o desenvolvedor executa o Maven Wrapper
- **Então** a versão fixada do Maven é resolvida sem Maven global

#### AC-004 — Imagens Docker exigem ação explícita

- **Dado** o build Maven padrão
- **Quando** o desenvolvedor executa `verify` ou `install`
- **Então** nenhuma imagem Docker é criada
- **E** existe um perfil explícito e documentado para criar as imagens

### US-003 — Configuração e APIs protegidas

Como operador, quero configuração local previsível e autenticação nas rotas
sensíveis, para não depender de terceiros nem expor operações.

#### AC-005 — Config Server usa o repositório local por padrão

- **Dado** o projeto executado localmente ou pelo Docker Compose
- **Quando** o Config Server inicia sem perfil externo
- **Então** ele lê `config-server-repository` localmente
- **E** um repositório Git externo só é usado quando configurado explicitamente

#### AC-006 — Operações criptográficas exigem autenticação

- **Dado** uma requisição não autenticada ao Config Server
- **Quando** ela acessa `/encrypt` ou `/decrypt`
- **Então** a operação é negada
- **E** somente a verificação de saúde permanece pública

#### AC-007 — Gateway exige token nas rotas de negócio

- **Dado** uma requisição sem JWT válido ao API Gateway
- **Quando** ela acessa uma rota de negócio
- **Então** a requisição não é encaminhada
- **E** a verificação de saúde permanece pública

#### AC-008 — API reativa exige token nas consultas

- **Dado** uma requisição sem JWT válido ao serviço reativo de consultas
- **Quando** ela acessa os documentos de consulta
- **Então** a requisição é negada
- **E** a verificação de saúde permanece pública

### US-004 — Operação documentada e automatizada

Como colaborador, quero comandos claros e validação automática, para preparar,
testar e operar o projeto sem descobrir dependências por tentativa.

#### AC-009 — Docker Compose validável sem segredos reais

- **Dado** um arquivo de ambiente de exemplo
- **Quando** a configuração Docker Compose é renderizada com valores de teste
- **Então** os serviços são válidos e nenhuma variável obrigatória fica vazia

#### AC-010 — Compose sem campos obsoletos

- **Dado** os fragmentos Docker Compose do projeto
- **Quando** eles são validados pelo Docker Compose atual
- **Então** nenhum fragmento declara o campo obsoleto `version`

#### AC-011 — Guia de execução completo

- **Dado** um colaborador com Java 17, Docker e Git
- **Quando** ele consulta o README
- **Então** encontra preparação segura, testes, build, criação de imagens e subida do ambiente

#### AC-012 — CI verifica segurança, contrato e build

- **Dado** um push ou pull request para `main`
- **Quando** o workflow de integração contínua é executado
- **Então** ele verifica segredos, critérios de aceite e o build Maven sem criar imagens

## Fora de escopo

- Alterar o fluxo funcional ou os contratos Avro existentes.
- Migrar Spring Boot, Spring Cloud, Elasticsearch, Kafka ou Keycloak para novas versões principais.
- Executar ou dimensionar os 30 contêineres como ambiente de produção.
- Substituir os componentes de infraestrutura existentes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | O fluxo funcional e os contratos existentes devem ser preservados nesta rodada. | confirmada | Confirmado pelo usuário em 2026-08-29. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | As atualizações de versões principais ficam para uma entrega separada? | respondida | Sim; esta rodada faz o hardening recomendado sem upgrades principais. |
