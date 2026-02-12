# requarks-wiki-mcp

Servidor MCP para uma instância de [Wiki.js](https://js.wiki/) que permite usar o Wiki como base de conhecimento.

Recursos:

- Busca e listagem de páginas para fluxos de recuperação (estilo RAG)
- Leitura de página por caminho ou ID
- Criação/atualização opcionais com guardrails de segurança

## Requisitos

- Node.js 20+
- Host Wiki.js acessível
- Chave de API Wiki.js (JWT) com permissões adequadas

## Setup

```bash
cp .env.example .env
npm install
```

Configuração `.env`:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

WIKI_MUTATIONS_ENABLED=false
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
```

Referência de variáveis de ambiente:

| Variável                              | Obrigatória | Padrão           | Descrição                                     |
| ------------------------------------- | ----------- | ---------------- | --------------------------------------------- |
| `WIKI_BASE_URL`                       | Sim         | -                | URL base do Wiki.js                           |
| `WIKI_API_TOKEN`                      | Sim         | -                | JWT usado em `Authorization: Bearer ...`      |
| `WIKI_GRAPHQL_PATH`                   | Não         | `/graphql`       | Caminho GraphQL anexado ao base URL           |
| `WIKI_DEFAULT_LOCALE`                 | Não         | `en`             | Locale padrão para chamadas sem locale        |
| `WIKI_DEFAULT_EDITOR`                 | Não         | `markdown`       | Editor padrão para criação de página          |
| `WIKI_MUTATIONS_ENABLED`              | Não         | `false`          | Habilita ferramentas de escrita quando `true` |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | Não         | `CONFIRM_UPDATE` | Valor `confirm` exigido para mutações         |
| `WIKI_MUTATION_DRY_RUN`               | Não         | `true`           | Retorna preview sem gravar quando `true`      |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | Não         | `` (vazio)       | Prefixos de caminho permitidos para escrita   |

Pré-requisito Wiki.js (GraphQL + chave de API):

- Este MCP usa GraphQL do Wiki.js internamente.
- Em Wiki.js, acesse `Administration -> API` e habilite a API.
- Crie uma API key e defina em `WIKI_API_TOKEN`.

## Início rápido (checklist)

- No Wiki.js: `Administration -> API` -> habilitar API
- Criar API key e preparar `WIKI_API_TOKEN`
- Neste projeto: `npm install` -> `npm run build`
- Adicionar configuração no cliente MCP (`~/.mcp.json`)
- Primeiro teste: `wikijs_search_pages` -> usar `path` em `wikijs_get_page_by_path`

## Exemplo de configuração MCP (`~/.mcp.json`)

```json
{
  "mcpServers": {
    "requarks-wiki": {
      "command": "npx",
      "args": ["-y", "@yowu-dev/requarks-wiki-mcp@latest"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

Exemplo para local/desenvolvimento (executar `dist` sem instalar o pacote):

```json
{
  "mcpServers": {
    "requarks-wiki-local": {
      "command": "node",
      "args": ["/absolute/path/to/requarks-wiki-mcp/dist/index.js"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

## Execução

Desenvolvimento:

```bash
npm run dev
```

Build + execução:

```bash
npm run build
npm start
```

## Ferramentas MCP

Leitura:

- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

Escrita (somente com `WIKI_MUTATIONS_ENABLED=true`):

- `wikijs_create_page`
- `wikijs_update_page`

Mutações exigem `confirm` igual a `WIKI_MUTATION_CONFIRM_TOKEN`.

## Cenários de uso (simulação de comportamento do usuário)

Cenário 1) Investigar causa de erro (estilo RAG)

- Pedido do usuário: "Encontre documentação sobre Kotlin `CancellationException` e me dê um resumo curto"
- Sequência MCP: `wikijs_search_pages(query="kotlin cancellationexception")` -> `wikijs_get_page_by_path(path=resultado.path)`
- Resultado: encontra páginas relevantes e recupera conteúdo para resumir causa e correção.

Cenário 2) Ver mudanças recentes na documentação

- Pedido do usuário: "Mostre as 20 páginas mais recentemente atualizadas"
- Sequência MCP: `wikijs_list_pages(limit=20, locale="en")`
- Resultado: retorna `path/title/updatedAt` para gerar um relatório rápido.

Cenário 3) Consulta direta por ID

- Pedido do usuário: "Leia a página 7283 e extraia apenas os TODO"
- Sequência MCP: `wikijs_get_page_by_id(id=7283)`
- Resultado: busca o conteúdo exato da página e extrai somente a informação necessária.

Cenário 4) Criar conteúdo com revisão segura antes de aplicar

- Pedido do usuário: "Crie um checklist de deploy em `sandbox`"
- Sequência MCP (revisão): `wikijs_create_page(..., confirm=token)` com `WIKI_MUTATION_DRY_RUN=true`
- Sequência MCP (aplicar): mesma chamada com `WIKI_MUTATION_DRY_RUN=false`
- Resultado: primeiro preview, depois criação real limitada por `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`.

## Dicas operacionais

- Para RAG, priorize leitura por `path` (`wikijs_get_page_by_path`). (O `id` do resultado de busca pode não ser o ID real da página)
- Para escrita, recomenda-se começar com `WIKI_MUTATIONS_ENABLED=false` e `WIKI_MUTATION_DRY_RUN=true`.
- Quando precisar gravar de verdade: limite o escopo com `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` e depois use `WIKI_MUTATION_DRY_RUN=false`.
- Mutações escrevem audit log no stderr; em produção vale coletar esses logs.

## Solução de problemas

- `Missing required environment variable: WIKI_*`: faltam variáveis no `.env` ou no `env` do cliente MCP.
- `PageViewForbidden 6013`: verifique permissões do grupo do API key e regras de página para `read:pages`/`read:source`.
- Lista funciona mas `content` falha: geralmente falta `read:source` nas permissões/regras.
- GraphQL não está em `/graphql`: ajuste `WIKI_GRAPHQL_PATH`.

## Notas de permissões (Wiki.js)

- Algumas operações podem exigir `manage:pages`/`delete:pages` em regras de página.
- Leitura de `content` pode exigir `read:source`.
- Se ocorrer 6013 (`PageViewForbidden`), revise permissões do grupo e regras de página.
