# Fluxo CLI/TUI para upload de apps e plugins

Data: 2026-05-01

## Contexto

O Buntime no Rancher usa `RUNTIME_API_PREFIX="/_"`, portanto a API interna fica
em `/_/api`. Rotas de plugins, como `/deployments/api/*`, permanecem no `base`
do plugin e não são afetadas pelo prefixo.

O objetivo deste ciclo é permitir um fluxo prático para subir apps e plugins a
partir do CLI/TUI, usando uma chave master de deploy configurada no runtime e
armazenada como Secret no Helm/Rancher.

## Decisões

- A chave de automação é `RUNTIME_MASTER_KEY` ou `BUNTIME_MASTER_KEY`.
- O CLI/TUI envia a chave no header `X-API-Key`.
- Quando a chave está configurada, rotas protegidas da API interna exigem
  `X-API-Key` válido.
- A chave master também bypassa CSRF e hooks `onRequest` de plugins para
  automação de deploy, incluindo `/deployments/api/*`.
- O CLI/TUI descobre o caminho real da API via `/.well-known/buntime`.
- Uploads de apps vão para o primeiro `workerDir` externo, preferindo
  `/data/apps` em vez de `/data/.apps`.
- Uploads de plugins vão para o primeiro `pluginDir` externo, preferindo
  `/data/plugins` em vez de `/data/.plugins`.
- Plugins são instalados diretamente em `/data/plugins/<name>`, sem segmento de
  versão, porque o loader escaneia a raiz do plugin.
- Após upload de plugin, o CLI chama `POST /plugins/reload`.

## Arquivos principais

- `apps/runtime/src/app.ts`: proteção por chave master e bypass de deploy.
- `apps/runtime/src/config.ts`: leitura de `RUNTIME_MASTER_KEY`.
- `apps/runtime/src/routes/apps.ts`: seleção do diretório externo de apps.
- `apps/runtime/src/routes/plugins.ts`: seleção do diretório externo de plugins.
- `apps/runtime/src/libs/registry/packager.ts`: leitura de `manifest.yaml` e
  seleção de diretórios externos.
- `apps/cli/internal/api/client.go`: descoberta do API base, upload e reload.
- `apps/cli/internal/tui/tui.go`: inicialização conectada quando `--url` é usado.
- `charts/templates/secret.yaml`: Secret com `RUNTIME_MASTER_KEY`.
- `charts/values.base.yaml` e `charts/questions.base.yaml`: `buntime.masterKey`.

## Verificação local

- `bun test src/app.test.ts src/routes/worker.test.ts src/plugins/loader.test.ts`
  em `apps/runtime`: 57 testes passaram.
- `bun run lint:types` em `apps/runtime`: passou.
- `bun run lint:format` em `apps/runtime`: passou com avisos existentes sobre
  `any`.
- `GOCACHE=<repo>/.cache/go-build go test ./...` em `apps/cli`: passou.
- `git diff --check`: sem problemas.

## Validação em Rancher

Depois que a imagem da branch estiver disponível no GitLab local:

```bash
helm upgrade buntime ./charts \
  --namespace zomme \
  --set image.repository=registry.gitlab.home/zomme/buntime \
  --set image.tag=runtime-performance-resilience \
  --set image.pullPolicy=Always \
  --set 'imagePullSecrets[0].name=gitlab-registry' \
  --set ingress.host=buntime.home \
  --set ingress.tls.enabled=true \
  --set buntime.apiPrefix=/_ \
  --set buntime.masterKey='<secret>' \
  --set persistence.plugins.accessMode=ReadWriteOnce \
  --set persistence.apps.accessMode=ReadWriteOnce \
  --set plugins.gateway.shellDir=/data/apps/front-manager/1.0.0 \
  --set-string 'plugins.deployments.excludes=.cache\,cli\,runtime'
```

Smoke esperado:

```bash
curl -sk https://buntime.home/.well-known/buntime
curl -sk https://buntime.home/_/api/plugins
curl -sk -H "X-API-Key: $RUNTIME_MASTER_KEY" https://buntime.home/_/api/plugins
buntime --url https://buntime.home --token "$RUNTIME_MASTER_KEY" --insecure app install ./app.zip
buntime --url https://buntime.home --token "$RUNTIME_MASTER_KEY" --insecure plugin install ./plugin.zip
```

O segundo `curl` deve retornar 401 quando a chave master estiver habilitada. Os
demais devem usar o prefixo descoberto e responder com sucesso.
