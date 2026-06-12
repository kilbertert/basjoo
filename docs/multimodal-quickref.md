# Multimodal Widget — Developer Quick Reference

> Covers PR11–14.范围:widget image/voice upload → backend multimodal pipeline → SSE reply.
> KB multimodal ingestion is explicitly **NOT** in scope for this round (§1.5 D6).

---

## `message_attachments` Table Schema

```sql
CREATE TABLE message_attachments (
    id              VARCHAR(50) PRIMARY KEY,          -- e.g. att_<12 hex>
    message_id     INTEGER REFERENCES chat_messages(id),  -- back-filled after chat
    agent_id       VARCHAR(50) NOT NULL REFERENCES agents(id),
    kind           VARCHAR(5)  NOT NULL,            -- 'image' or 'audio'
    mime_type      VARCHAR(120) NOT NULL,
    filename       VARCHAR(500),                     -- original filename
    size_bytes     INTEGER,
    storage_backend VARCHAR(20) NOT NULL DEFAULT 'local',
    storage_key    VARCHAR(500) NOT NULL UNIQUE,    -- path under MEDIA_STORAGE_DIR
    sha256         VARCHAR(64) NOT NULL,
    transcript     TEXT,                             -- audio ASR output
    ocr_text       TEXT,                            -- image vision description
    modality_meta  JSON,                             -- reserved
    status         VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending/processing/processed/failed
    error_message  TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME
);
-- Indexes: ix_msg_attach_sha256 (sha256)
-- Note: session_id column was removed in migration 6144374 (PR13 schema drift fix).
--       Attachment ownership is determined via message.chat_session_id, not a direct FK.
```

**Key schema notes:**
- `description` Python attribute maps to `ocr_text` DB column
- `session_id` is NOT a DB column (removed in migration 6144374)
- `duration_ms` is a Python-only attribute (client-supplied, not stored in DB)

---

## API Contract

### `POST /api/v1/chat/attachments`

**Phase 1**: Upload raw bytes, get `att_<id>` before LLM call.

**Request** (`multipart/form-data`):

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | Image (PNG/JPG/WebP ≤ 5 MB) or Audio (WebM/Opus ≤ 3 MB) |
| `agent_id` | string | Yes | Agent ID |
| `session_id` | string | Yes | Business session ID |
| `visitor_id` | string | Yes | Visitor identifier |
| `duration_ms` | int | No | Audio duration in ms (≤ 60 000) |

**Responses**:

| Status | Meaning | Example |
|---|---|---|
| 201 | Uploaded | `{"attachment": {"id":"att_...","kind":"image","status":"pending",...}}` |
| 400 | Missing session_id/visitor_id | `{"detail": "session_id and visitor_id are required"}` |
| 404 | Agent not found | `{"detail": "Agent not found"}` |
| 410 | Attachment processing failed | `{"detail": "Attachment processing failed"}` (GET content only) |
| 413 | File too large | `{"detail": "Image exceeds 5MB"}` or `"Audio exceeds 3MB"` |
| 415 | Unsupported mime | `{"detail": "Unsupported media type: 'text/plain'"}` |
| 403 | Origin not allowed | `{"detail": "Widget origin not allowed"}` |

---

### `GET /api/v1/chat/attachments/{id}/content`

Stream the stored bytes.

**Responses**:

| Status | Meaning |
|---|---|
| 200 | Binary stream with `Content-Disposition: inline` |
| 404 | Attachment not found |
| 410 | Attachment processing failed |
| 403 | Origin not allowed |

---

### `POST /api/v1/chat/stream` — `attachment_ids` field

**Request** (`JSON` body, additional fields):

```json
{
  "agent_id": "agt_...",
  "message": "What's in the image?",
  "session_id": "visitor-session-id",
  "visitor_id": "visitor-001",
  "attachment_ids": ["att_abc123def45", "att_678901234ab"],  // ≤ 3, format att_<12 hex>
  "widget_locale": "vi-VN"   // optional, overrides reply language
}
```

**`attachment_ids` validation** (schema.py):
- Format regex: `^att_[0-9a-f]{12}$` (`ATTACHMENT_ID_PATTERN`)
- Max 3 per message (`MAX_ATTACHMENTS_PER_MESSAGE`)
- Each must belong to the same session (ownership check via `message.chat_session_id`)

**SSE `done` event payload** (after multimodal processing):

```json
{
  "type": "done",
  "message_id": 42,
  "session_id": "visitor-session-id",
  "usage": {"prompt_tokens": 200, "completion_tokens": 50, "total_tokens": 250},
  "taken_over": false,
  "attachments": [
    {
      "id": "att_abc123def45",
      "kind": "image",
      "mime_type": "image/png",
      "filename": "test.png",
      "size_bytes": 1234,
      "url": "/api/v1/chat/attachments/att_abc123def45/content",
      "status": "processed",           // or "pending"/"failed"
      "transcript": null,
      "description": "a small red square",  // vision LLM output
      "duration_ms": null,
      "error_message": null,
      "created_at": "2026-06-12T..."
    }
  ]
}
```

---

## Limits & Constants

| Constant | Value | Location | Rationale |
|---|---|---|---|
| `MAX_IMAGE_BYTES` | 5 MB | `config.py:286` | Practical limit for mobile upload |
| `MAX_AUDIO_BYTES` | 3 MB | `config.py:287` | 60 s Opus @ ~80 kbps ≈ 600 KB; 3 MB headroom |
| `MAX_AUDIO_DURATION_MS` | 60 000 ms | `config.py:288` | 60 seconds per audio message |
| `MAX_ATTACHMENTS_PER_MESSAGE` | 3 | `config.py:289` | D4 cap |
| `ATTACHMENT_ID_PATTERN` | `^att_[0-9a-f]{12}$` | `config.py:299` | 12 hex chars from uuid4 |

To adjust: edit the constants in `backend/config.py` and rebuild `backend-dev`.

---

## Processing Flow

```
Widget                          Backend                          External
  │                                 │                                 │
  │  1. POST /chat/attachments       │                                 │
  │     (multipart/form-data)        │                                 │
  │─────────────────────────────────>│                                 │
  │                                 │  store bytes → storage_key        │
  │                                 │  INSERT message_attachment       │
  │  ←─ 201 {att_<id>, status=pending}                                 │
  │                                 │                                 │
  │  2. POST /chat/stream            │                                 │
  │     (attachment_ids=[...])       │                                 │
  │─────────────────────────────────>│                                 │
  │                                 │  fetch attachment rows            │
  │                                 │  for each image:                                        │
  │                                 │    vision_service.describe_image()
  │                                 │  for each audio:                 │
  │                                 │    asr_service.transcribe()      │
  │                                 │  UPDATE status→processed         │
  │                                 │  ＋ description/transcript        │
  │                                 │                                 │
  │  ←─ SSE stream (content events)                                 │
  │  ←─ SSE done {attachments: [...]}                                 │
  │                                 │                                 │
  │  3. GET /chat/attachments/<id>/content                          │
  │     (optional, for rendering)                                     │
  │─────────────────────────────────>│                                 │
  │  ←─ binary stream                                                  │
```

---

## NOT in Scope

From §1.5 / PR13 commit message, explicitly excluded:

- ❌ Video messages
- ❌ Admin UI viewing user-uploaded images
- ❌ AI reply with images (text-only responses)
- ❌ TTS voice playback
- ❌ KB multimodal ingestion (chat-time only this round)
- ❌ Non-Chinese OCR (Whisper is multilingual; vision LLM is model-dependent)
- ❌ Server-side audio duration decoding (client supplies `duration_ms`)
- ❌ Self-hosted whisper sidecar (uses hosted OpenAI Whisper API)
- ❌ Per-byte attachment quota enforcement (columns exist, not enforced)
- ❌ Waveform rendering / lightbox / custom audio UI
- ❌ HEIC client-side conversion
- ❌ LLM multimodal `content: [...]` array adaptation

---

## Failure & GC

- **Retry**: Not implemented. Attachments with `status=failed` need re-upload.
- **Orphan GC**: Not implemented. `message_attachments` rows with no `message_id` (never linked to a chat) accumulate. Manual cleanup via SQL if needed.

---

## Files Changed (PR11–14)

| File | Change |
|---|---|
| `backend/models.py` | `MessageAttachment` model (session_id/description mapping fixes in PR15) |
| `backend/api/v1/attachments_endpoints.py` | Upload + content streaming endpoints |
| `backend/api/v1/schemas.py` | `attachment_ids` validator, `AttachmentResponse` |
| `backend/api/v1/endpoints.py` | Multimodal processing in `prepare_chat_request`, `persist_chat_response` |
| `backend/services/media_storage.py` | Blob storage |
| `backend/services/vision_service.py` | Vision LLM integration |
| `backend/services/asr_service.py` | Whisper transcription |
| `backend/static/sdk.js` | Auto-generated from `widget/src/BasjooWidget.tsx` |
| `widget/src/BasjooWidget.tsx` | Image picker + voice recorder UI |
| `widget/src/locales.ts` | i18n strings |
| `scripts/verify_pr15.py` | End-to-end smoke test (PR15) |
