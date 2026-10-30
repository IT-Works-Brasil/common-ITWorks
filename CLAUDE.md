# CLAUDE.md — Contexto do common-ITWorks para sessões de Claude Code

## ① O que é este projeto

`@impostograma/common` — pacote npm **publicado publicamente**
(`registry.npmjs.org`, `publishConfig.access: "public"`) que fornece o roteamento e os
utilitários compartilhados pelos serverless da casa. TypeScript, compilado para `lib/`.
Versão no `package.json` e no npm em 30/10/2026: **2.3.3**.

No ecossistema ITWorks: é a base de que quase todo serverless depende — o `Router` que
transforma pasta em rota, o `HttpResponse` que dá forma ao envelope, o logger com máscara
de dado sensível, os wrappers de Lambda/S3/SQS.

**Quem consome** (conferido nos `package.json` da `origin/main` em 30/10/2026): **9 dos 12**
serviços de [`serverless-itworks`](https://github.com/IT-Works-Brasil/serverless-itworks) —
`auth`, `backoffice`, `ia`, `impostograma`, `integrations`, `riscofiscal`, `schedules`,
`softwarehouse`, `uploads` (`authorizer`, `facility` e `natural` não dependem dele) — e o
[`serverless-emalote`](../serverless-emalote). As faixas declaradas vão de `^2.0.3` a
`^2.3.3`, e o `serverless-ia` está em **`^1.0.93`**: nunca recebe nada da 2.x.

## ② Leis do projeto (invioláveis — não proponha exceções)

1. **Este repositório é PÚBLICO** (GitHub `IT-Works-Brasil/common-ITWorks`, visibilidade
   `PUBLIC`). Tudo que entrar aqui — código, comentário, nome de tabela, URL interna, massa
   de teste — é lido por qualquer pessoa na internet. Nenhum dado de cliente, nenhum
   segredo, nenhuma referência a infraestrutura interna que não precise estar exposta.
2. **Não edite `lib/`.** É gerado por `npm run build` (e está versionado); `main` e `types`
   apontam para lá. Editar `lib/` some no próximo build.
3. **Mudança aqui NÃO chega sozinha em produção.** Cada serviço tem a versão travada no
   `package-lock.json` e precisa de `npm update @impostograma/common` + redeploy. Não
   assuma que editar aqui já corrigiu o comportamento lá.
4. **Ao mudar o `Router`/`BaseHandler`, atualize também
   `serverless-itworks/CLAUDE.md`.** A documentação detalhada do comportamento vive lá de
   propósito — perto de quem consome —, não aqui.
5. **`version` no `package.json` sobe a cada publicação**, e a publicação é **manual**
   (`npm publish`): não há `.github/` neste repositório nem script de publicação no
   `package.json`. O token de publicação fica num `.npmrc` local, que está no `.gitignore`
   — nunca o versione.
6. **Comportamento nasce de SPEC aprovada.** Sem SPEC, não implemente — proponha a SPEC.
   [confirmar-com-o-dono] — a régua da Verdade Única só liga com o checklist de prontidão
   assinado.

## ③ Stack e convenções

TypeScript `^5.4` compilado com `tsc` (`target: es5`, `module: commonjs`, `declaration`)
para `lib/`. Jest 29 com `ts-jest`. `engines.node: >=14`. Nx 18 (`@nx/node`) está nas
devDependencies e deixou `.nx/cache/` versionado, mas o `package.json` só declara `test` e
`build`.

Dependências de runtime: `aws-sdk` (v2), `axios`, `joi`, `nodemailer`, `barcode-validator`
— e `ts-jest`/`ts-node`, que estão em `dependencies` por engano histórico.

**Convenção de commit:** `tipo(escopo): descrição` em português — `fix(functions):`,
`fix(logger):`, `feat(router):`, `feat(httpResponse):`, `chore:`. O histórico antigo tem
mensagens livres (`subindo ajustes`); as recentes seguem o padrão.

**Branches:** `docs/...`, `refactor/...`, `fix/...` no remoto.

## ④ Fluxo de trabalho

Branch → commit → push → PR contra `main`. Guardião: **Gabriel**.

Antes de entregar: `npm run build` e os testes (ver §⑤ — `npm test` puro não roda hoje).

**Antes de publicar:**

- rode `npm run build` — o `lib/` de um clone pode estar atrás do `src/`, e já houve
  versão publicada sem símbolos que a anterior tinha;
- confira `npm view @impostograma/common version`: os consumidores declaram faixa com `^`,
  que resolve para a **maior 2.x já publicada**, não para a que você acabou de subir. A
  versão nova tem de ser maior que a maior publicada, senão ninguém a recebe.

**Confirme o remote antes do push.** O remote local já apontou para um fork pessoal; hoje
`git remote get-url origin` responde `IT-Works-Brasil/common-ITWorks`. Os campos
`repository`, `bugs` e `homepage` do `package.json` **ainda apontam para o fork**
(`Gabrielfreitas11/common-ITWorks`) — é isso que a página do pacote no npm mostra.

## ⑤ Comandos

```bash
npm install
npm run build                     # tsc → lib/
npx tsc --noEmit                  # checagem de tipos sem gerar lib/
npx jest --config jest.config.ts  # testes — ver a ressalva abaixo
```

**`npm test` (= `jest`) reprova antes de rodar qualquer teste** com
`Multiple configurations found`: há `jest.config.ts` **e** um `jest.config.js` compilado
(mais `.d.ts` e `.js.map`) na raiz, e o Jest recusa escolher. Passe `--config`.

Com `--config`, o Jest roda também os testes compilados que ficaram em `lib/`
(`lib/logger/logger.test.js`), então cada falha do logger aparece duas vezes. Em
30/10/2026, na `origin/main`, `StructureLogger › should log with level info` falha
(`console` não é chamado) em `src/` e em `lib/`; as outras 28 passam.

Não há script de lint nem de publicação no `package.json`.

## ⑥ Mapa

O que é exportado por `src/index.ts`, e onde o comportamento está documentado em detalhe:

| Módulo exportado | Export | O que é |
|---|---|---|
| `Router` (`src/router/`, via `AutoHandler`/`BaseHandler`) | `Router` | **[`serverless-itworks/CLAUDE.md`](../serverless-itworks/CLAUDE.md)**, seção "Arquitetura comum" — é lá que está o porquê de cada decisão (roteamento por `readdirSync`, `global.*` a partir de headers, `isAuthorized`, `setAWSLogLink`). Não duplique aqui: se o comportamento mudar, atualize lá. Assinatura: `Router(dirs, allowMethodsDiableCors = [], publicMethods = [])` |
| `HttpResponse` | `HttpResponse` | `ok/created/badRequest/notFound/serverError/custom` e `noAwsFilter` (resposta sem o link do CloudWatch) |
| `Http` (`src/http/`) | `Http` | wrapper de `axios` que loga toda resposta, **inclusive sucesso** — caro em rota de alto volume |
| `Validator` | `Validator` | wrapper fino do Joi: `Validator(params, schema)` |
| `Cryptography` (`encrypt`/`decrypt`) | `Cryptography` | cifra de substituição com chave fixa no código — **ofuscação, não criptografia**. Não é a mesma de `serverless-auth/common/encrypt.js` (que usa `createCipheriv('aes-256-cbc', ...)`): trocar uma **não** afeta a outra |
| `Lambda`, `S3`, `SQS` (`src/aws/`) | idem | `Lambda` **não** usa o invoke do SDK: chama o outro serviço por HTTP, pelo API Gateway; `S3`/`SQS` são wrappers do `aws-sdk` v2 |
| `Logger` | `Logger` | log estruturado; desde a 2.3.2 todo payload passa por `maskSensitiveData` |
| `Formatter` | `Formatter` | `price` (moeda pt-BR) |
| `Functions` | `Functions` | `calculaDigitoEAN`, `zerosInvalidam` (regra dos cinco zeros no EAN) |
| `Email` | `Email` | `sendEmailOffice365NoReply` (nodemailer) |

```
src/router/           index.ts, handler/AutoHandler.ts, handler/BaseHandler.ts,
                      middleware/setAWSLogLink.ts — o roteamento por pasta
src/httpResponse/     o envelope das respostas
src/http/             cliente HTTP
src/cryptography/     encrypt/decrypt (data.ts não é usado por eles)
src/aws/              lambda.ts, s3.ts, sqs.ts
src/logger/           logger.ts, constants.ts, maskSensitiveData.ts (+ testes)
src/validator/  src/formatter/  src/functions/  src/email/  src/@types/
lib/                  SAÍDA do build — não edite (lei 2)
common-2/             órfão: só um package.json antigo (2.2.11) e o lock. Não entra no
                      build nem é importado por nada — não edite achando que afeta o pacote
```

### Variáveis de ambiente lidas (do processo do CONSUMIDOR)

Só os nomes: `authToken`, `authMethod`, `noAuth` (autenticação do `BaseHandler`),
`stage`, `region`, `accessKeyId`, `secretAccessKey`, `domain`, `sourceIpAddress`
(escrita pelo `BaseHandler`), `HOST_OFFICE`, `USERNAME_NO_REPLY`, `PASSWORD_NO_REPLY`
(e-mail).

### Pontos de atenção

- **Handler declarado no `serverless.yml` sem pasta correspondente → timeout sem log.**
  O `AutoHandler` só gera export para o que acha no `readdirSync` dos diretórios passados
  ao `Router`. Se a function aponta para `routes.<nome>` e não existe `<nome>`, o handler
  chega `undefined` e a Lambda trava até o timeout, só com `Task timed out` no CloudWatch.
- **`AutoHandler` é incompatível com bundler** (esbuild/webpack): a descoberta de rota lê
  a árvore física de diretórios, que deixa de existir depois do bundle (`ENOENT`/`scandir`
  em runtime).
- **Os `global.*` saem de headers por SUBSTRING**: o `BaseHandler` testa `includes` no
  JSON serializado dos headers, não o nome exato. Qualquer header cujo nome contenha o
  termo aciona o comportamento.
- **`noLogMethods` existe no `BaseHandler`, mas o `Router` não o expõe** — nenhum
  consumidor consegue preenchê-lo pela API pública. Quem precisa calar log de uma rota
  (ex.: dado de cartão) protege o corpo ANTES do handler, como o
  `serverless-softwarehouse` faz.
- **A máscara do logger só vale para o que passa por ele.** Ela cobre o log automático do
  `BaseHandler` e do `Http`; um `console.log(error)` escrito à mão no consumidor imprime o
  erro do axios cru, com `error.config.data` e `error.config.headers` inteiros.

## ⑦ Protocolo de Memória e Continuidade (obrigatório)

A memória do sistema NÃO está na cabeça do Claude — vive no vault. Portanto:

1. **Consultar ANTES de pedir ou criar:** `itworks-verdade-unica/_cross-system/` —
   esta biblioteca **é** infraestrutura compartilhada, e o que muda aqui muda para
   todos + `_demandas/` (quadro de voo). [confirmar-com-o-dono] — a Plataforma não
   tem fatia própria na Verdade Única.
2. **Diário = fonte da verdade viva:** decisões são apendadas no diário da fatia na
   hora — nunca reescritas.
3. **Trabalho entra SÓ por SPEC chancelada.** Demanda de corredor volta ao pipeline.
4. **Ritual de abertura:** toda sessão começa pelo
   `itworks-verdade-unica/_processo/PROMPT-BOM-DIA.md`.
5. **Mudou a verdade** (schema/comportamento/contrato)? Sinalizar re-derivação da
   fatia (estágio 7 do pipeline) no PR. Aqui **toda mudança de comportamento do
   `Router` ou do `HttpResponse` é isso**: ela atravessa os consumidores, com atraso, na
   velocidade em que cada um sobe a versão.

Nota do vault (privado): `20-ITWorks/Plataforma/Projetos/common-ITWorks.md`.

⚠️ E lembre da lei 1 ao escrever qualquer coisa: **este repositório é público.** Nada
que descreva infraestrutura interna, nome de banco ou regra de cliente entra aqui —
esse conteúdo vai para a Verdade Única ou para o vault, que são privados.

Para gravar conhecimento novo no vault Obsidian, use a skill `/nota`.
