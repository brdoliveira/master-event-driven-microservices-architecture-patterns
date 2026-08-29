# Constituição — v1.1.0

## P-001 [DEVE] Todo requisito tem prova executável

Nenhuma feature é declarada pronta sem o audit em modo CI sair limpo.

- verificação(gate): intrínseca ao audit

## P-002 [DEVE] Segredos nunca entram no repositório

Chaves, tokens e senhas reais vêm de variáveis de ambiente ou de um gerenciador
de segredos. Arquivos locais sensíveis permanecem ignorados pelo Git.

- verificação(teste): @principle:P-002

## P-003 [DEVE] O build padrão é reproduzível e sem publicação externa

O Maven Wrapper fixa a versão do Maven e o ciclo padrão de verificação não cria
imagens de contêiner. Imagens só são criadas com um perfil explícito.

- verificação(teste): @principle:P-003

## P-004 [DEVE] Rotas e operações sensíveis exigem autenticação

Operações criptográficas e rotas de negócio recusam requisições sem uma
identidade válida. Somente a verificação de saúde permanece pública.

- verificação(teste): @principle:P-004

## P-005 [DEVE] A operação local é documentada e validada continuamente

Exemplos de ambiente sem segredos reais, Docker Compose atual, guia de
execução e integração contínua formam um caminho reproduzível para operar o
projeto e provar seu contrato.

- verificação(teste): @principle:P-005
