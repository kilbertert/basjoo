# basjoo 部署到 pzalo.vplusvn.net —— 完整运维手册

> 目标:把 basjoo 部署到一台公网服务器,在 `https://basjoo.pzalo.vplusvn.net/` 提供管理后台,`https://pzalo.vplusvn.net` 网站右下角嵌入 AI 客服聊天气泡。
>
> 读者:接手运维 basjoo 的工程师 / DevOps(能 ssh、能读 docker compose 日志、不怕改 nginx)。
>
> 本文档假设你走 **fork 部署**(仓库地址 `https://github.com/kilbertert/basjoo`),**不**给上游 `haoyiyin/basjoo` 提 PR。
>
> 配套:
> - `docs/operations.md` — 本地 dev 启动 / 日常排错
> - `docs/requirements-second-pass.md` — 业务需求
> - `install-deploy.sh` + `deploy.sh` — 实际部署脚本

---

## 0. 全流程一览(5 步)

```
Step 1  准备服务器 + 域名 + SSL              (你,1h)
Step 2  改 install-deploy.sh 默认走 fork      (你,1min,本仓库已改)
Step 3  在服务器上跑 install-deploy.sh          (你,15min,全自动)
Step 4  basjoo admin UI 里建 agent + 配 origin  (你,10min,Web 操作)
Step 5  pzalo.vplusvn.net 网站嵌 widget          (你,5min,改 HTML)
        ↓
        验收 + 备份 + 监控(1h)
```

---

## Step 1. 准备

### 1.1 服务器最低要求

| 项 | 要求 |
|------|------|
| OS | **Ubuntu 22.04+ / Debian 11+**(`install-deploy.sh` 强依赖) |
| RAM | **4GB+**(prod profile 6 container + qdrant + postgres ≈ 2GB 常态) |
| 磁盘 | 20GB+(Qdrant 索引 + Postgres 文档 + 媒体附件会涨) |
| 网络 | 公网 IP + 80 / 443 端口不被 ISP 封(国内住宅宽带常封这两口,**机房或云主机**) |
| SSH | 你有 `root` 或 `sudo` 权限 |

**云主机推荐**:
- 阿里云 ECS / 腾讯云 CVM / AWS Lightsail / DigitalOcean / Vultr 都行
- 操作系统镜像选 Ubuntu 22.04 LTS
- 安全组 / 防火墙 放通:`22` (SSH) / `80` / `443` / `8443`(nginx 备用)

### 1.2 域名 + DNS

- 你已经有 `pzalo.vplusvn.net` 主域名
- 加一个 **A 记录**:
  - 子域:`basjoo`(或别的,如 `chat`)
  - 指向:服务器公网 IP
- 生效可能要几分钟到几小时,验证:

```bash
dig basjoo.pzalo.vplusvn.net +short
# 应返回你服务器 IP
```

### 1.3 SSL 证书

widget SDK 必须在 HTTPS 下加载(HTTP 加载会被浏览器 block);nginx 也会自动启用 HTTPS,前提是 `./ssl/` 有证书。

```bash
# 方式 A:certbot(推荐,Let's Encrypt 免费 90 天 + auto-renew)
sudo apt install -y certbot
sudo certbot certonly --standalone -d basjoo.pzalo.vplusvn.net
# 证书在 /etc/letsencrypt/live/basjoo.pzalo.vplusvn.net/fullchain.pem
# key 在 /etc/letsencrypt/live/basjoo.pzalo.vplusvn.net/privkey.pem

# 装到 basjoo 期望的位置(后面 Step 3 跑 install-deploy.sh 时脚本会检查)
sudo mkdir -p /opt/basjoo/ssl
sudo cp /etc/letsencrypt/live/basjoo.pzalo.vplusvn.net/fullchain.pem /opt/basjoo/ssl/basjoo.pzalo.vplusvn.net.crt
sudo cp /etc/letsencrypt/live/basjoo.pzalo.vplusvn.net/privkey.pem /opt/basjoo/ssl/basjoo.pzalo.vplusvn.net.key
sudo chmod 600 /opt/basjoo/ssl/*.key
```

```bash
# 方式 B:自签证书(仅 staging 内部用,不要用在生产)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/basjoo/ssl/basjoo.pzalo.vplusvn.net.key \
  -out /opt/basjoo/ssl/basjoo.pzalo.vplusvn.net.crt \
  -subj "/CN=basjoo.pzalo.vplusvn.net"
```

### 1.4 防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP (nginx 自动跳转 HTTPS)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
sudo ufw status

# 阿里云 / 腾讯云 控制台安全组也要放通
# AWS Lightsail 防火墙面板放通
```

---

## Step 2. 改 install-deploy.sh 默认走 fork

仓库根 `install-deploy.sh:4`:

```sh
# 改前(默认上游)
BASJOO_REPO_URL=${BASJOO_REPO_URL:-https://github.com/haoyiyin/basjoo}

# 改后(默认 fork)
BASJOO_REPO_URL=${BASJOO_REPO_URL:-https://github.com/kilbertert/basjoo}
```

**手动改**或让 Claude Code 改。改完后,`sudo sh install-deploy.sh` 默认拉 fork 的 main 分支。

如果偶尔需要从上游拉(例如比对上游),用 env override 不动脚本:

```bash
sudo BASJOO_REPO_URL=https://github.com/haoyiyin/basjoo sh install-deploy.sh
```

---

## Step 3. 在服务器上跑 install-deploy.sh

```bash
ssh root@<你的服务器 IP>

# 全自动:装 Docker(若没装)+ 拉 fork 代码 + 跑 deploy.sh + 健康检查
sudo sh /<path-to>/install-deploy.sh
# 或:
curl -fsSL https://raw.githubusercontent.com/kilbertert/basjoo/main/install-deploy.sh | sudo sh
```

脚本做的事(详见 `install-deploy.sh` 注释):
1. 检测系统,要求 Ubuntu/Debian
2. 装 Docker + Compose plugin(如已有跳过)
3. `git clone` fork 到 `/opt/basjoo/`
4. `cd /opt/basjoo && sudo ./deploy.sh`
5. 等所有 container healthy,失败时打印日志

部署完后:
- `/opt/basjoo/` 是代码目录(`git pull` 即更新)
- 容器:6 个 prod profile container(`backend-prod / frontend-prod / nginx / qdrant / postgres / redis`)+ scrapling-service
- 数据卷:`basjoo_backend-data / basjoo_postgres-data / basjoo_qdrant-data / basjoo_redis-data`

### 3.1 验部署成功

```bash
cd /opt/basjoo
sudo docker compose --profile prod ps          # STATUS 全 (healthy) 绿
curl -fsSL https://basjoo.pzalo.vplusvn.net/health
# → {"status":"healthy"}

# 浏览器开:
# https://basjoo.pzalo.vplusvn.net/         → admin dashboard
# https://basjoo.pzalo.vplusvn.net/widget-demo → widget 演示页
```

如果 `compose ps` 有 unhealthy / restart 循环,看 §6。

### 3.2 关键 env 变量(部署后必须设)

`/opt/basjoo/.env`(在仓库根,**已 gitignore**):

```bash
sudo nano /opt/basjoo/.env
```

```ini
# ===== 必填 =====
SECRET_KEY=<用 openssl rand -hex 32 生成的 64 字符 hex>
ENCRYPTION_KEY=<同上,Fernet key 格式>
REQUIRE_SECRET_KEY=true

# 你的 basjoo 域名(nginx 用,拒绝其他 Host header 访问)
SERVER_DOMAIN=basjoo.pzalo.vplusvn.net

# CORS 白名单(后端 FastAPI 用,widget 跨域调 chat 必须包含)
ALLOWED_ORIGINS=https://pzalo.vplusvn.net,https://www.pzalo.vplusvn.net

# ===== LLM key(per-agent 配更好,这里放默认值会被 agent override)=====
# 假设所有 agent 都用 MiniMax:
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_API_KEY=sk-cp-...
# 或 DeepSeek:
# DEEPSEEK_API_KEY=sk-...

# Jina embedding(若做 KB):
JINA_API_KEY=jina_...

# ===== 可选 =====
LOG_LEVEL=INFO
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST_SIZE=10
```

写完后让 backend 重启读新 env:

```bash
cd /opt/basjoo
sudo docker compose --profile prod up -d --force-recreate backend-prod
```

---

## Step 4. basjoo admin 后台配置

### 4.1 首次:建 super_admin

1. 浏览器开 `https://basjoo.pzalo.vplusvn.net/`
2. 第一次跑让你注册第一个 **super_admin**:
   - **用你自己的真邮箱**(别用 `me@example.com` 那种占位)
   - 强密码(8+ 字符,大小写+数字)
3. 登入 admin

### 4.2 建 agent

**Agents → Create Agent**:

| 字段 | 值 | 备注 |
|------|------|------|
| Name | `pzalo-customer-service` | 显示用 |
| Description | "PZALO 客服助手" | admin 列表里好认 |
| agent_type | `website_support` | 默认 |
| channel_mode | `web_widget` | 默认 |
| System prompt | "你是 PZALO 越南分公司的 AI 客服..." | 写 pzalo 业务的人设 |
| model | `MiniMax-Text-01` | |
| provider_type | `minimax` | **要等任务 3 合并后才有这个选项**,现在临时选 `openai` 借道(见 4.3) |
| api_base | `https://api.minimaxi.com/v1` | |
| api_key | `sk-cp-...` | **填 UI 走 HTTPS 进 SQLite,不要明文进 .env** |
| temperature | `0.7` | |
| max_tokens | `1024` | |
| top_k | `5` | KB 检索 top-K |
| similarity_threshold | `0.01` | KB 阈值(滑块 10%) |
| enable_context | `true` | 把 KB 命中拼到 system prompt |

**创建后**记录 `agent_id`(形如 `agt_xxxxxxxxxxxx`)—— Step 5 要用。

### 4.3 LLM provider

`provider_type` 直接选 **`minimax`**(PR 已合),MiniMax 是 OpenAI 兼容的,basjoo 直接走 `OpenAIProvider`,无需额外 adapter。

| 字段 | 值 |
|------|------|
| provider_type | `minimax` |
| model | `MiniMax-Text-01` |
| api_base | `https://api.minimaxi.com/v1` |
| api_key | `sk-cp-...` |

### 4.4 配 widget 字段(同一个 agent 详情页 → Widget 标签)

| 字段 | 值 |
|------|------|
| widget_title | "PZALO 客服" |
| welcome_message | "Xin chào! Tôi là trợ lý AI của PZALO. Tôi có thể giúp gì cho bạn?" |
| widget_color | `#FF6B00`(PZALO 品牌色) |
| allowed_widget_origins | `["https://pzalo.vplusvn.net"]` |

**allowed_widget_origins 是关键**:**不填这个**,widget 调 `/api/v1/chat` 会被 403 拒。

```bash
sudo docker exec basjoo-postgres psql -U basjoo -d basjoo -c \
  "UPDATE agents SET allowed_widget_origins = '[\"https://pzalo.vplusvn.net\"]'::jsonb WHERE id = '<AGENT_ID>';"
```

**注意**:prod profile 用 Postgres,不是 SQLite(本地 dev 是 SQLite)。

#### 4.4.2 任务 2 合并后:admin UI 直接改

> 任务 2 提的 PR 加 `PUT /api/v1/agent/widget-origins` 端点 + 前端 origins 编辑 UI,改完会简化成:
> 1. 浏览器进 agent 详情
> 2. 找到 "Widget Origins" 区块
> 3. 输入框加一行 `https://pzalo.vplusvn.net` → 保存
> 4. 后端 `normalize_widget_origin` 校验后写回 DB

#### 4.5 KB 上传(pzalo 业务知识)

**Knowledge Base → 上传**:

方式 A:**网页上传**(每批 5 文件 / 20MB)
- 把 pzalo 的 FAQ、产品手册、客服话术打成 PDF/DOCX/MD,逐个上传
- 上传后 basjoo 自动跑 embedding pipeline(走 Jina)→ 存 Postgres + Qdrant

方式 B:**URL 爬取**(全站爬)
- 进 agent → URLs → 输入 `https://pzalo.vplusvn.net/help` → 后台用 scrapling 爬取
- 自动去重 + 增量更新

方式 C:**API 同步**(开发者用)
- 调 `POST /api/v1/kb-documents` form-data 上传

---

## Step 5. 在 pzalo.vplusvn.net 网站嵌 widget

### 5.1 最小可用的 HTML

在 pzalo 网站**所有页面**的 `</body>` 之前(或 `</head>` 之前)加:

```html
<!-- basjoo AI 客服 SDK -->
<script>
(function(){
  var s=document.createElement('script');
  s.src='https://basjoo.pzalo.vplusvn.net/sdk.js';
  s.async=true;
  s.setAttribute('data-agent-id','<AGENT_ID>');  /* 换成 Step 4.2 记下的 ID */
  s.setAttribute('data-api-base','https://basjoo.pzalo.vplusvn.net');
  document.head.appendChild(s);
})();
</script>
```

**只换两处**:
- `<AGENT_ID>` → Step 4.2 创建的 agent id
- `data-api-base` → 已经是 `https://basjoo.pzalo.vplusvn.net`

### 5.2 进阶 attrs(可选)

```html
<script src="https://basjoo.pzalo.vplusvn.net/sdk.js"
        data-agent-id="agt_xxxxxxxxxxxx"
        data-api-base="https://basjoo.pzalo.vplusvn.net"
        data-language="auto"           <!-- auto / zh-CN / en-US / vi-VN -->
        data-position="right"          <!-- left / right -->
        data-theme="light"             <!-- light / dark / auto -->
        data-color="#FF6B00"
        data-welcome-message="Xin chào!">
</script>
```

### 5.3 验收(必做)

桌面 + 手机两个都要测:

| 检查 | 命令 / 操作 | 期望 |
|------|------|------|
| SDK 加载 | 浏览器开 pzalo.vplusvn.net → F12 → Network 找 `sdk.js` | 200 OK,大小 ~45KB |
| CORS 无错 | F12 → Console | 无红色 CORS / 跨域报错 |
| 气泡出现 | 页面右下角 | 看到 PZALO 客服气泡 |
| 气泡能开 | 点气泡 | 弹出聊天窗口,显示 welcome_message |
| 能发消息 | 输入 "你好" → 发送 | Network 找 `POST /api/v1/chat` → 200 OK |
| AI 用对语种 | 看 AI 回复 | 用对应 widget_locale(PR11+PR12 注入) |
| 切语种 | 选 English / Tiếng Việt | localStorage `basjoo_widget_locale` 更新,AI 切语种 |
| **手机端** | iOS Safari / Android Chrome | 气泡正常,输入法不冲突 |

> 验收失败的常见原因 → §6.3

### 5.4 (可选)多页同步嵌

pzalo 网站是 SPA → 改 SPA 入口 HTML 一次。
pzalo 网站是 MPA → 改 layout 模板一次。
pzalo 网站用了 Vue/React → 改公共 Layout 组件。

---

## Step 6. 日常运维

### 6.1 看服务状态

```bash
cd /opt/basjoo
sudo docker compose --profile prod ps
```

全 `(healthy)` 绿就 OK。`restarting` 或 `(unhealthy)` 持续 > 1 分钟,看 §6.5。

### 6.2 看日志

```bash
# 跟所有 prod container
sudo docker compose --profile prod logs -f

# 单个
sudo docker logs -f basjoo-backend-prod
sudo docker logs -f basjoo-nginx

# 过滤错误
sudo docker logs basjoo-backend-prod 2>&1 | grep -iE "error|exception" | tail -50

# 实时错误流
sudo docker compose --profile prod logs -f --tail=20 backend-prod 2>&1 | grep -i error
```

### 6.3 widget 端常见坑(验收时失败看这里)

| 症状 | 原因 | 修 |
|------|------|------|
| 气泡不出现 | sdk.js 404 / HTTPS 证书 / 网络 | Network 看 sdk.js 响应;F12 console 错 |
| 气泡出现,发消息没反应 | agent id 写错 / agent 软删 | Network 看 `/api/v1/chat` 响应 |
| `/api/v1/chat` 返回 **403** | `allowed_widget_origins` 没加 pzalo 域名 | admin UI 加(任务 2 合并后)或 §4.4.1 SQL |
| `/api/v1/chat` 返回 **CORS 错** | `ALLOWED_ORIGINS` env 没设 | `nano /opt/basjoo/.env` 加,`up -d --force-recreate backend-prod` |
| `/api/v1/chat` 返回 **401/认证错** | 你的 nginx 配了额外认证 | 看 nginx 配置 |
| AI 不回 / 500 | LLM key 错 / 模型名错 / 余额 | 先单独测 `curl :8000/api/v1/agents/:id:test-ai-api` |
| 切语种不生效 | PR12 没部署(检查 `/sdk.js` bundle 大小 ~45KB 才对) | 重新 `up -d --build` 拉新 PR |

### 6.4 改代码 / 提新 PR 后重新部署

```bash
cd /opt/basjoo
sudo git pull origin main              # 拉 fork 最新 main
sudo docker compose --profile prod up -d --build
# 镜像重 build,数据卷不动,业务不中断
```

如果只改业务代码(没改 `requirements.txt` / `Dockerfile`),可以省 `--build`:
- 业务代码有 watch mode 吗?—— **没有**,prod profile 不会自动重载
- 改完业务代码必须 `up -d --build backend-prod` 或 `restart backend-prod`(只对改 backend 的有效)

### 6.5 服务异常排查

```bash
# 1. 看哪个 unhealthy
sudo docker compose --profile prod ps

# 2. 看具体日志
sudo docker logs --tail 100 basjoo-backend-prod

# 3. 常见错
# "address already in use"  → 端口被占,看 §6.7
# "database is locked"     → SQLite 单写,等几秒或 `restart backend-prod`
# "connection refused redis" → Redis 没起,看 `docker compose ps`
# "Qdrant connection refused" → Qdrant 没起 / 网络问题
```

### 6.6 备份(必须设 cron)

```bash
sudo nano /opt/basjoo/scripts/backup.sh
```

```bash
#!/bin/sh
set -eu

BACKUP_DIR=/opt/basjoo/backups
mkdir -p "$BACKUP_DIR"

TS=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/basjoo_${TS}.tar.gz"

cd /opt/basjoo
sudo docker compose --profile prod exec -T postgres \
  pg_dump -U basjoo basjoo | gzip > "$BACKUP_DIR/postgres_${TS}.sql.gz"

# Qdrant snapshot(占大头)
sudo docker compose --profile prod exec -T qdrant \
  sh -c "curl -s -X POST 'http://localhost:6333/snapshots' > /tmp/snap.json && cat /tmp/snap.json"
# 拿 snapshot 名,cp 出来(略,详见 Qdrant 文档)

# 媒体附件 + sqlite(若 dev)
sudo tar czf "$BACKUP_FILE" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  /opt/basjoo/backend/data 2>/dev/null || true

# 保留 30 天
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "backup done: $BACKUP_FILE"
```

```bash
chmod +x /opt/basjoo/scripts/backup.sh
sudo crontab -e
# 每天 3am 跑
0 3 * * * /opt/basjoo/scripts/backup.sh >> /var/log/basjoo-backup.log 2>&1
```

### 6.7 回滚(灾难恢复)

```bash
# 假设凌晨 2 点有一次成功备份,现在 14 点搞坏了
cd /opt/basjoo

# 1. 停服务
sudo docker compose --profile prod down

# 2. 把旧数据卷备份(防止回滚出错再丢)
sudo cp -r /var/lib/docker/volumes/basjoo_postgres-data /tmp/postgres-data-broken
sudo cp -r /var/lib/docker/volumes/basjoo_qdrant-data /tmp/qdrant-data-broken

# 3. 找最近的好 backup
ls -lh /opt/basjoo/backups/postgres_*.sql.gz | tail -5
LATEST=$(ls -t /opt/basjoo/backups/postgres_*.sql.gz | head -1)

# 4. 启 postgres(空状态)
sudo docker compose --profile prod up -d postgres
sleep 10

# 5. 还原
gunzip -c "$LATEST" | sudo docker compose --profile prod exec -T postgres \
  psql -U basjoo -d basjoo

# 6. 启全套
sudo docker compose --profile prod up -d
```

Qdrant 恢复同理(用 `curl -X POST /snapshots` 创建 + `curl -X PUT /collections/.../snapshots/.../restore`)。

### 6.8 更新 basjoo(新 PR 合并后)

```bash
cd /opt/basjoo
sudo git pull origin main
sudo docker compose --profile prod up -d --build
# 业务可能短时间中断(30s-2min),挑低峰
```

### 6.9 卸载整个 basjoo

```bash
cd /opt/basjoo
sudo docker compose --profile prod down -v   # 删 container + volume
# 数据全删,慎
```

---

## 7. 监控(强烈建议装)

任选一个:
- **Uptime Kuma**(开源,自部署)→ ping `https://basjoo.pzalo.vplusvn.net/health`
- **UptimeRobot**(免费)→ 同上
- **阿里云监控 / 腾讯云 Cloud Monitor** → 监控 80/443 端口 + 进程

设告警:health 连续 2 次 5xx / 端口不可达 → 发邮件 / 微信。

---

## 8. 关键文件路径速查

服务器上:

```
/opt/basjoo/                              ← 仓库根
  ├── .env                                ← 你的所有 env 变量(已 gitignore)
  ├── docker-compose.yml                  ← 6 container + 网络 + 卷
  ├── install-deploy.sh                   ← 首次部署
  ├── deploy.sh                           ← 部署 / 升级
  ├── ssl/
  │   ├── basjoo.pzalo.vplusvn.net.crt    ← 证书
  │   └── basjoo.pzalo.vplusvn.net.key    ← key
  ├── nginx/
  │   └── conf.d/locations.conf            ← nginx 路由
  ├── backend/
  │   └── data/                           ← bind-mount 持久化(SQLite dev only)
  └── backups/                            ← 你自己加的备份目录

# 数据卷(Docker 管理的,不会出现在 /opt/basjoo 下)
/var/lib/docker/volumes/basjoo_postgres-data
/var/lib/docker/volumes/basjoo_qdrant-data
/var/lib/docker/volumes/basjoo_redis-data
```

---

## 9. 联系 / 升级流程

| 场景 | 操作 |
|------|------|
| 改个 UI 文案 | 改代码 → `git push` 到 fork → 服务器 `git pull` → `up -d --build frontend-prod` |
| 改 API | 改 backend → `git push` → 服务器 `git pull` → `up -d --build backend-prod` |
| 改 nginx 路由 | 改 `nginx/conf.d/` → 服务器 `git pull` → `restart nginx` |
| 加新 LLM provider | PR 走完(任务 3 那种)→ 服务器 `git pull` → `up -d --build backend-prod` |
| 升 basjoo 大版本 | 看 changelog / migration notes → 备份 → 灰度一台服务器 → 切流量 |
| 紧急回滚 | §6.7 |

---

## 引用

- `install-deploy.sh` / `deploy.sh` — 自动部署脚本
- `docker-compose.yml` — prod profile(6 container)
- `nginx/conf.d/locations.conf` — 反向代理路由
- `nginx/docker-entrypoint.sh` — HTTPS 自动启用
- `backend/main.py` — FastAPI 入口
- `backend/api/v1/endpoints.py` — `/api/v1/chat` 公开 chat
- `docs/operations.md` — 本地 dev 启动
- `docs/requirements-second-pass.md` — 业务需求(多模态 + 多语种)
- `docs/deploy-pzalo.md`(本文件)— 生产部署 + 嵌入 + 运维

---

## 变更记录

- 2026-06-12 v1.0 初稿 — fork 部署版(URL 走 kilbertert/basjoo),含 pzalo.vplusvn.net 真实案例的所有路径
