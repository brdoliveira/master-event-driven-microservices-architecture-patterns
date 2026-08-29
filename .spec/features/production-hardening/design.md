# Design: Production hardening

> feature: production-hardening

## Estratégia

A entrega adiciona gates estruturais em Node.js usando o test runner nativo.
Eles inspecionam arquivos rastreados e comandos locais para provar segurança e
reprodutibilidade antes de subir toda a infraestrutura distribuída.

## Decisões

1. O Config Server usa backend `native` por padrão. Um perfil `git` separado
   aceita URI e credenciais externas apenas quando solicitado.
2. O build mantém as versões atuais. A criação de imagens é desativada por
   padrão e reativada pelo perfil Maven `container-images`.
3. Gateway e API reativa tornam-se Resource Servers JWT. Apenas health é público.
4. O Docker monta o repositório de configurações como volume somente leitura.
5. Um teste anotado liga cada critério de aceite ao estado do repositório.

## Compatibilidade

- Java 17 permanece obrigatório.
- Fluxo de mensagens, schemas Avro e endpoints de negócio são preservados.
- `.env.example` documenta somente valores fictícios.

## Riscos e mitigação

- JWT pode revelar configuração ausente: CI valida configuração e build.
- O primeiro uso do wrapper requer rede: URLs e versão ficam fixadas.
- A CI não sobe os 30 contêineres; valida Compose e Maven.
