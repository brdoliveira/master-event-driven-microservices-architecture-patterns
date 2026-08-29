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
