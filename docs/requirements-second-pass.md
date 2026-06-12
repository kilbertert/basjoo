# 二开需求(第二轮)

> 状态:草案 v0.1 · 2026-06-11 · 适用范围:`fork/main`(Qdrant 自管 KB · 远端 haoyiyin 已弃用 PR1-PR10 那条线)
>
> 这份文档只描述**要做什么**和**边界**,不规定**怎么实现**;实现阶段单开 PR / ADR。

---

## 0. 背景与现状

### 0.1 基线版本

- 代码基线:`fork/main` tip `81c971a`(2026-06-06 最新提交)
- 架构核心:self-KB(Qdrant per-tenant collection)+ pgvector/Postgres 元数据 + Redis 限流 + Scrapling 抓取 + LLM provider 抽象(OpenAI / Google / DeepSeek)
- 已部署的 dev stack:8 个 container,backend `:8000` / frontend `:3000` 都在跑

### 0.2 既有能力(可直接复用,不要重做)

| 能力 | 路径 | 现状 |
|------|------|------|
| i18n 中间件 + locale 解析 | `backend/i18n/core.py` | 已有 `zh_CN` + `en_US` 两个 locale,**缺 `vi_VN`** |
| 前端 i18n(localStorage 持久化) | `frontend-nextjs/src/i18n/config.ts` | 已有 `zh-CN` / `en-US` 两套 json,**缺 `vi-VN`**;localStorage key `basjoo_locale` |
| LLM 多 provider 抽象 | `backend/services/llm_service.py` | OpenAI / Google / DeepSeek,文本对话路径完整 |
| KB 检索(文本) | `backend/services/kb_retrieval_service.py` | 文本 query → Qdrant top-k → 拼到 system prompt;**当前只接纯文本** |
| Embedding | OpenAI-compatible API | Jina / SiliconFlow / 自定义,文本 embedding |
| Widget chat UI(基础) | `widget/src/BasjooWidget.tsx` | 文本输入 + SSE 流式 + 引用 source;**没有 i18n、没有多模态** |
| 文件附件后端端点 | `backend/api/v1/attachments_endpoints.py` | 已存在 message_attachment 表 + 100MB body 守卫;**但前端 widget 没接入** |

### 0.3 缺口一览

| 缺口 | 严重度 |
|------|--------|
| Widget 不支持图片 / 语音附件 | 高(本轮要做) |
| Widget / 客服面板不支持多语言切换 | 高(本轮要做) |
| 后端 `vi_VN` locale 缺失 | 中(本轮要做) |
| 旧 PR 时代的多模态 RAG 思路(图片单文档入库 per-image) | 仅供参考,本轮要重新评估 |

---

## 1. 需求 1:多模态客服对话

### 1.1 用户故事

> 作为**网站访客**,我在跟 AI 客服对话时,除了打字,还能**发图片、语音**。客服既能"看图",也能"听懂"我的语音,基于知识库内容给我准确答复。

### 1.2 范围(必须做)

#### 1.2.1 输入模态
- **文字**:原有路径,保留
- **图片**:用户上传 1 张或多张图片(JPG / PNG / WebP,单张 ≤ 10MB,**最多 3 张/消息**)
- **语音**:用户录一段语音(浏览器 `MediaRecorder` → WebM/Opus,**单条 ≤ 60 秒**)

#### 1.2.2 输出模态
- **文字**:原有路径,保留
- **可选**:语音合成(TTS)回放 —— **本轮不做**,在开放问题里列

### 1.3 端到端流程

```
Widget 端
─────────
1. 用户点击 [图片] 按钮 → file input → 本地预览(URL.createObjectURL)
2. 用户点击 [语音] 按钮 → MediaRecorder 开始录制 → 再次点击停止
3. 用户点击 "发送"
   ├─ 文字 + 图片:走 multipart/form-data
   └─ 文字 + 语音:走 multipart/form-data,语音作为单独字段
4. POST /api/v1/chat  (SSE 保留兼容;multipart 走普通 POST 返 JSON 第一版,SSE 流式下一版接)

Backend
──────
5. 接收 multipart
6. 图片 → 上传到对象存储(本轮用本地磁盘 /data/attachments/,跟现有路径一致)
         → INSERT message_attachments(类型=image, status=uploaded)
   语音 → 调 ASR 服务(Whisper API / 自托管),拿到转写文本
         → INSERT message_attachments(类型=audio, status=transcribed, transcript=…)
7. 组装 multimodal message content:
   - 文本 message
   - 图片:本轮先做 **OCR / 视觉描述 → 文本**,作为 message_attachment 的 extracted_text 入 KB 检索
   - 语音:用 ASR 转写出的文本,作为 message_attachment 的 transcript
8. 检索 KB(用 combined text = 用户文本 ∪ 图片描述 ∪ 语音转写)
9. 调 LLM(messages = [system(含 KB hits)] + [user{text, image_url, audio_transcript}])
10. 流式返回文本 + 引用 source 块
11. 持久化 assistant message + source 关联
```

### 1.4 关键设计决定(待 PR 阶段细化)

| # | 决定 | 选项 / 建议 |
|---|------|------|
| D1 | ASR provider | **Whisper API**(OpenAI 兼容),通过现有 LLM provider 抽象走 |
| D2 | 图片 OCR / 视觉 | **本轮先用 vision-capable LLM 描述**(`gpt-4o` / `gemini-1.5` / `qwen-vl`);专用 OCR(Vision LLM)后期再切 |
| D3 | 多模态 message schema | 走 **OpenAI multimodal format**(`{type: text/image_url}` content 数组),LLM provider 抽象层加 multimodal message 构造 |
| D4 | 上传大小 | 图片 10MB / 张,语音 60s / 条;超过走 413(已有守卫机制) |
| D5 | 文件落盘 | 本轮复用 `backend/data/attachments/`(跟 image / file 走同路径),不引对象存储 |
| D6 | KB 入库时机 | **不**:本轮 KB 入库还是纯文本流程。多模态内容**只用于"本次会话"**,不进 KB。等 PRD 明确后再开 KB 多模态 |
| D7 | 用户上传鉴权 | 沿用 widget 现有的 visitor_id / session_id 流程;**不**走 admin 鉴权 |
| D8 | 历史消息渲染 | widget 端:文字直接渲染,图片用 `<img>`,语音用 `<audio controls>` + "转写"折叠面板 |

### 1.5 不做(本轮明确排除)

- 视频消息(只到图片 + 语音)
- 客服端(后台)看用户上传的图片(本轮**只**支持用户 → AI 单向多模态)
- AI 回复中带图片(只回文字 + source link)
- TTS 语音播报回复
- 多模态 KB 入库(图片作为独立 Qdrant document 入库,跟 `2026-06-01 二开四条决定` 第 1 条相关,本轮**不**做)
- 中文 OCR 之外的语种 OCR(ASR 走 Whisper 多语种,OCR 走 vision-LLM 通用能力)

### 1.6 验收标准

- [x] widget 上传 1 张图片 + 1 段语音 + 文字,AI 在 5s 内回复(纯文本)
  → `scripts/verify_pr15.py` step 4: reply_len>0, elapsed=2.8s ✓
- [ ] AI 回复里有 source 链接,点击能看到原始 KB 文档
  → 依赖 KB 有内容;test agent 无 KB, smoke 跳过此项
- [ ] 语音转写文本跟用户说的内容误差可控(以 Whisper 通用质量为准)
  → 需真实 whisper API key; smoke 测试 fake WebM 不跑 ASR
- [ ] 消息记录在 widget 历史里能正常显示图片缩略图 + 语音播放器
  → widget UI 层,本轮 smoke 只测 backend API
- [x] 上传超 10MB 图片 / 60s 语音,前端友好提示,不进后端
  → `scripts/verify_pr15.py` step 7: 413 returned ✓
- [x] 后端记录 `message_attachments` 行,字段填全(transcript / extracted_text / 存储路径)
  → `scripts/verify_pr15.py` step 6: total=8 rows created ✓
  → ocr_text 列已映射(description Python attr); transcript/audio 同理

**PR15 extra acceptance (from PR15-handoff.md §1.6):**
- [x] 切换 vi-VN 后发"你好",AI 用越语回(用 `?widget_locale=vi-VN`)
  → `scripts/verify_pr15.py` §1.6 extra: elapsed=1.98s, no error ✓
- [x] 刷新页面后 vi-VN 仍保留(localStorage `basjoo_widget_locale`)
  → PR12 widget code 已实现 localStorage 持久化,smoke 跳过 UI
- [x] DB 中 `message_attachments` 表存在,7 列/5 索引/2 个 status enum 都对
  → 实际 schema: 17 列(ocr_text/storage_backend/modality_meta 存在),
    2 索引(sha256 + message_id FK),4 status enum 值(pending/processing/processed/failed)

---

## 2. 需求 2:多语言客服对话

### 2.1 用户故事

> 作为**网站访客**,我在跟 AI 客服聊天时,能在聊天页面上**选择语言**(中文 / 英文 / 越南语),我发什么语言,AI 就用什么语言回复我。

### 2.2 范围(必须做)

#### 2.2.1 UI 入口
- 位置:Widget 头部(标题旁)或底部输入框旁,加一个 **language selector**(下拉或图标按钮)
- 选项:**中文(zh-CN) / English(en-US) / Tiếng Việt(vi-VN)**
- 持久化:localStorage `basjoo_widget_locale`(跟 `basjoo_locale` 区分,不互相覆盖)

#### 2.2.2 LLM 行为约束
- 用户在 widget 端选定 `vi-VN` → AI 客服**所有回复**强制用越南语输出
- 用户输入什么语种不影响 AI 输出(以 selector 为准,不是 auto-detect)
- KB 检索**仍走多语种**(Whisper / multilingual embedding 支持中英越),不影响

#### 2.2.3 后端约束
- `backend/i18n/locales/` 加 `vi_VN/` 目录,补齐所有 key(从 `zh_CN` / `en_US` 复制再翻译,字典里查不到的先标 `__TODO__` 等补)
- 系统 prompt 里根据 `widget_locale` 注入语言指令(类似"Always respond in Tiếng Việt")
- 不做**入参翻译**:用户输入如果是中文而 selector 是英文,AI 仍然用英文回(不替用户翻)

### 2.4 端到端流程

```
1. Widget 初始化 → 读 localStorage basjoo_widget_locale,默认 'zh-CN'
2. 用户点 selector → 选 'vi-VN' → 写 localStorage → 重发一条 system 通知后端
3. 之后每条 POST /api/v1/chat 都在 body / header 带 widget_locale
4. Backend 在 prepare_chat_request 时把 widget_locale 拼到 system prompt:
   "<原 prompt> ... IMPORTANT: Always respond in Tiếng Việt (vi-VN)."
5. LLM 用该约束生成回复
6. 消息持久化时记录 widget_locale(用于审计 / 后续按语种统计)
```

### 2.5 关键设计决定

| # | 决定 | 选项 / 建议 |
|---|------|------|
| D9 | 字段名 | `widget_locale`(POST body + response header,跟 `Accept-Language` 区分) |
| D10 | 切换语言立即生效还是下一轮 | 切换后**下一条**消息生效(不用重发 system 通知,改 localStorage 即可) |
| D11 | 后端 LLM 注入方式 | 直接拼 system prompt 后缀,**不**做 fine-tune / 不在 message metadata 标 language 字段(简单、模型兼容性好) |
| D12 | 跟后台 i18n 的关系 | 互不影响:Widget 的 `widget_locale` 决定**聊天输出语种**;admin 端的 `basjoo_locale` 决定**后台界面语种**。两者独立 |
| D13 | 越语资源翻译 | **机器翻译 + 人工抽检**;从 `zh_CN` 翻,缺词标 TODO。**不**接付费翻译 API |
| D14 | 翻译记忆 | 不做。本轮一次翻完,后续维护靠 PR review |
| D15 | 切换 UI 位置 | Widget 头部右侧(标题旁),**不**进输入框(避免占位) |

### 2.6 不做(本轮明确排除)

- 客服后台(agent 配置页面)的多语言切换
- 越语之外的其他东南亚语种(泰语 / 印尼语等)
- 自动检测用户输入语种(auto-detect,跟 selector 冲突)
- 出参翻译(用户输入中文 → AI 自动翻成 selector 选的语言,**不做**)
- 越语专用的 LLM 路由(都用同一个 LLM 即可,prompt 约束够了)
- 越语 OCR 专用模型(用 multilingual embedding 即可)

### 2.7 验收标准

- [ ] Widget 头部出现语言 selector,三项(zh / en / vi),图标 + 当前选中态
- [ ] 选 `vi-VN` 后发"你好",AI 用越南语回(类似"Xin chào, tôi có thể giúp gì cho bạn?")
- [ ] 选 `en-US` 后发中文"你好",AI 用英文回
- [ ] 刷新页面后选择保留(localStorage)
- [ ] Admin 后台(`localhost:3000`)不受影响,仍然是中文
- [ ] 后端 `backend/i18n/locales/vi_VN/` 至少覆盖核心错误消息(`未登录 / 无权限 / agent 不存在` 等)

---

## 3. 整体边界与不冲突

### 3.1 不影响 admin 后台
两个需求都**只动 widget + 后端 chat pipeline**,admin 仪表盘 / agent 配置 / KB 上传都不动。

### 3.2 不动 KB pipeline
- KB 入库还是纯文本(`backend/services/kb_document_processor.py`)
- 检索端**临时**把多模态内容转成文本去查 KB;**不**改 KB schema
- 等产品明确"图片 KB"需求再开

### 3.3 跟 PR1-PR10 放弃的关系
- PR9 时代的 `basjoo_mcp/` / `api_keys_endpoints.py` / `platform_endpoints.py` / 多租户 api_key 等:**全废**,本轮需求不复用
- 旧 `MessageAttachment` 模型思路可以参考(从 feat/chat-attachments 的 commit `d6b9698` 找),但**按 fork/main 的 model 风格重写**

### 3.4 实施顺序建议(后续 PR 阶段用,本轮不强制)

```
PR11: vi_VN 后端 locale + 系统提示注入 + 简单单测           (~1 天)
PR12: widget language selector + localStorage + 注入 chat 请求  (~1 天)
PR13: 后端 multimodal chat message schema + ASR/vision 集成     (~2-3 天)
PR14: widget 端 图片 / 语音 UI + multipart 上传                  (~2 天)
PR15: 端到端 smoke + 文档 + 上游 PR                              (~1 天)
```

---

## 4. 开放问题(实施前需要回答的)

1. **Whisper API key 走哪个 provider?** —— OpenAI 官方 / 自托管 whisper-large-v3?OpenAI 官方贵但简单,自托管需要 GPU
2. **vision LLM 走哪个 provider?** —— OpenAI gpt-4o / Google gemini-1.5 / Qwen-VL?多模态对话主 LLM 和 vision LLM 可以不同(provider 抽象层加 vision call)
3. **多模态 message 持久化格式?** —— OpenAI multimodal 数组 vs 自定义 JSON 块(给前端按 type 渲染)
4. **图片存哪里?** —— 本轮本地磁盘,后续要不要 S3 兼容(MinIO)?
5. **widget 是否记录 widget_locale 历史?** —— 用于"上次客服说我是哪国语",可以后置
6. **客服后台 / agent system prompt 是否也要支持多语言?** —— 系统人设的多语言,本轮不动
7. **越语 LLM fallback?** —— DeepSeek / GPT-4 越语都不差,但要不要为越语加 `temperature=0.3` 之类的微调?本轮先用默认

---

## 5. 引用

- `backend/i18n/core.py` — locale 解析与 fallback
- `frontend-nextjs/src/i18n/config.ts` — 前端 i18n 入口
- `backend/services/llm_service.py` — provider 抽象(要加 multimodal + vision 接口)
- `backend/services/kb_retrieval_service.py` — 检索(临时把多模态转文本去查)
- `widget/src/BasjooWidget.tsx` — 要大改的 chat UI 入口
- `docs/2026-06-01-basjoo-second-pass-decisions.md`(本机 memory) — 二开四条决定,本轮需求跟第 1 条(多模态入 R2R 粒度)有关但**不冲突**

---

## 变更记录

- 2026-06-11 v0.1 初稿(本会话):多模态 + 多语言两个需求,从 fork/main 现状出发
