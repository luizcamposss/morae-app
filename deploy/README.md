# Deploy do Moraê

Produção: `https://morae.synergylab.tech`, na VPS da Hostinger que já roda outro site com Caddy.

## Como funciona

Cada merge na `main` dispara `.github/workflows/deploy.yml`:

1. Roda o CI (build do backend, lint e build do frontend).
2. Monta as imagens `morae-api` e `morae-web` e publica no GitHub Container Registry (`ghcr.io/luizcamposss/...`), com a tag do commit e `latest`.
3. Entra na VPS por SSH, copia `docker-compose.prod.yaml` e `deploy.sh` e roda o `deploy.sh`, que:
   - faz backup do MySQL em `backups/` (guarda os 14 últimos);
   - baixa as imagens novas e sobe com `docker compose up -d` (as migrations rodam quando a API sobe);
   - espera `GET /api/health` e o front responderem;
   - se a versão nova não responder, volta para a anterior. O banco **não** volta sozinho: se uma migration já rodou, restaure o backup.
4. Confere `https://morae.synergylab.tech/api/health` de fora.

Para rodar de novo sem commit novo: GitHub → Actions → Deploy → "Run workflow".

## Primeira vez (manual, uma vez só)

### 1. Na VPS

```bash
# Usuário só para deploy, com acesso ao Docker
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy

# Pasta do Moraê
sudo mkdir -p /opt/morae && sudo chown deploy:deploy /opt/morae

# Chave SSH do GitHub Actions (gere no seu computador: ssh-keygen -t ed25519 -f morae-deploy -C github-actions)
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys < morae-deploy.pub
sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Em `/opt/morae`, crie o `.env.production` a partir do `.env.production.example` do repositório, com as credenciais **de produção** (Mercado Pago, Resend, JWT novo, senhas novas do MySQL). Ele fica só na VPS: nunca vai para o GitHub.

```bash
sudo -u deploy cp /caminho/.env.production.example /opt/morae/.env.production
sudo -u deploy nano /opt/morae/.env.production
chmod 600 /opt/morae/.env.production
```

### 2. Caddy (sem mexer no site que já existe)

Copie `deploy/morae.caddy` para a VPS (ex.: `/etc/caddy/morae.caddy`) e acrescente **uma linha** no fim do `Caddyfile` atual:

```caddyfile
import /etc/caddy/morae.caddy
```

Depois: `sudo caddy validate --config /etc/caddy/Caddyfile` e `sudo systemctl reload caddy`. O certificado HTTPS sai sozinho.

### 3. No GitHub (Settings → Environments → `production`)

| Tipo | Nome | Valor |
|---|---|---|
| Secret | `VPS_HOST` | IP da VPS |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | conteúdo da chave privada `morae-deploy` |
| Secret | `VPS_KNOWN_HOSTS` | saída de `ssh-keyscan -t ed25519 <IP da VPS>` (confira a impressão digital) |
| Variable | `DEPLOY_DIR` | `/opt/morae` |
| Variable | `PUBLIC_URL` | `https://morae.synergylab.tech` |
| Variable | `VITE_API_URL` | `https://morae.synergylab.tech` |

Dica: em Environments → `production`, marque "Required reviewers" se quiser aprovar cada deploy antes de ele rodar.

### 4. Primeiro deploy

Faça o merge de `develop` na `main` (ou rode o workflow à mão). Depois confira:

- `https://morae.synergylab.tech` abre a landing e `/login` entra com o Master do `.env.production`;
- no Mercado Pago de produção, a URL do webhook e o redirect do OAuth apontam para o domínio novo.

## Restaurar um backup

```bash
cd /opt/morae
gunzip -c backups/<arquivo>.sql.gz | docker compose --env-file .env.production -f docker-compose.prod.yaml \
  exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" moraeDB'
```

Guarde cópias dos backups e do volume de arquivos (`api_storage`) fora da VPS também.
