# Ubuntu 部署说明

## 服务器准备

```bash
sudo apt update
sudo apt install -y nginx curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm@10 pm2
```

## 配置与构建

将项目上传到 `/var/www/chimelong-pretrip-demo`：

```bash
cd /var/www/chimelong-pretrip-demo
cp .env.example .env
nano .env
pnpm install --frozen-lockfile
pnpm check
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

在 `.env` 中填写：

```text
NUXT_AI_API_KEY=你的DeepSeek_API_Key
NUXT_AI_BASE_URL=https://api.deepseek.com
NUXT_AI_MODEL=deepseek-v4-flash
NUXT_AI_PROVIDER=deepseek
NUXT_AI_TIMEOUT_MS=8000
```

不配置 Key 时系统自动使用本地模板，路线规划功能不受影响。修改 `.env` 后运行 `pm2 restart chimelong-pretrip --update-env`。

## Nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/chimelong-pretrip
sudo ln -s /etc/nginx/sites-available/chimelong-pretrip /etc/nginx/sites-enabled/chimelong-pretrip
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80/tcp
```

访问 `http://服务器IP/api/health`，返回 `status: ok` 即表示服务正常。
