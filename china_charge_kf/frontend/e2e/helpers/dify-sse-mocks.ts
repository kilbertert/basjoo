import type { Page, Route } from '@playwright/test'

/**
 * M8.0 — Dify v2 SSE byte-stream mocks.
 *
 * Format reference (see frontend/src/services/difyStream.ts doc-block + M3 SseProxyLayer):
 *   event: session_started\ndata: {"session_id":"...","started_at":null}\n\n
 *   event: message_delta\ndata: {"text":"..."}\n\n
 *   event: message_complete\ndata: {"text":"...","total_tokens":int,"elapsed_time":float}\n\n
 *   event: error\ndata: {"code":"DIFY_AUTH|...","message":"..."}\n\n
 *   event: end\ndata: {}\n\n
 *
 * Frontend parser splits on the FIRST `\n\n`, so events MUST end with `\n\n`.
 */

export type DifyV2Event =
  | { type: 'session_started'; session_id?: string; started_at?: string | null }
  | { type: 'message_delta'; text: string }
  | {
      type: 'message_complete'
      text: string | null
      total_tokens?: number
      elapsed_time?: number
    }
  | {
      type: 'error'
      code: 'DIFY_AUTH' | 'DIFY_BAD_REQUEST' | 'DIFY_UPSTREAM' | 'DIFY_UNKNOWN'
      message: string
    }
  | { type: 'end' }

export interface MockStreamOptions {
  /** Split reply into N message_delta chunks (default 1 — single chunk). */
  totalDeltaChunks?: number
  /** Full assistant reply text (used when totalDeltaChunks provided). */
  replyText?: string
  /**
   * Placeholder — Playwright route.fulfill does not stream bytes chunk-by-chunk,
   * so per-event delays cannot be honored today. Kept for forward-compat.
   */
  chunkDelayMs?: number
}

const CHAT_STREAM_GLOB = '**/api/chat/stream'

/**
 * Mock /api/chat/stream with a full Dify v2 SSE byte stream.
 *
 * Two overloads:
 *  - (events) — caller builds the exact event list
 *  - (options) — helper synthesizes session_started → N×message_delta → message_complete
 */
export async function mockDifyV2StreamResponse(
  page: Page,
  eventsOrOptions: DifyV2Event[] | MockStreamOptions,
): Promise<void> {
  const events = Array.isArray(eventsOrOptions)
    ? eventsOrOptions
    : buildHappyPathEvents(eventsOrOptions)

  await page.route(CHAT_STREAM_GLOB, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: encodeSseEvents(events),
    })
  })
}

/**
 * Mock /api/chat/stream returning an inline `event: error` SSE event.
 * Frontend routes this to the M6.4 banner (NOT the assistant bubble).
 */
export async function mockDifyV2Error(
  page: Page,
  code: 'DIFY_AUTH' | 'DIFY_BAD_REQUEST' | 'DIFY_UPSTREAM' | 'DIFY_UNKNOWN',
  message: string,
): Promise<void> {
  await page.route(CHAT_STREAM_GLOB, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: encodeSseEvents([{ type: 'error', code, message }]),
    })
  })
}

/**
 * Mock /api/chat/stream with a plain HTTP error (5xx, 4xx).
 * Frontend route should turn this into the M6.4 banner via DifyStreamError(BAD_HTTP).
 */
export async function mockHttpError(page: Page, status: number): Promise<void> {
  await page.route(CHAT_STREAM_GLOB, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ detail: `HTTP ${status} from mock` }),
    })
  })
}

function buildHappyPathEvents(opts: MockStreamOptions): DifyV2Event[] {
  const chunks = Math.max(1, opts.totalDeltaChunks ?? 1)
  const reply = opts.replyText ?? 'Hello from mock Dify'
  const events: DifyV2Event[] = [
    {
      type: 'session_started',
      session_id: 'mock-session-id',
      started_at: null,
    },
  ]

  if (chunks === 1) {
    events.push({ type: 'message_delta', text: reply })
  } else {
    const sliceLen = Math.max(1, Math.ceil(reply.length / chunks))
    for (let i = 0; i < chunks; i++) {
      const slice = reply.slice(i * sliceLen, (i + 1) * sliceLen)
      if (slice.length > 0) {
        events.push({ type: 'message_delta', text: slice })
      }
    }
  }

  events.push({
    type: 'message_complete',
    text: reply,
    total_tokens: 42,
    elapsed_time: 0.5,
  })
  return events
}

/**
 * Serialize DifyV2Event[] into the exact SSE byte wire format the frontend parser expects.
 * Critical: every event block ends with `\n\n` (the parser splits on that delimiter).
 */
export function encodeSseEvents(events: DifyV2Event[]): string {
  return events.map(encodeSingleEvent).join('')
}

function encodeSingleEvent(ev: DifyV2Event): string {
  if (ev.type === 'end') {
    return 'event: end\ndata: {}\n\n'
  }
  const data = JSON.stringify(serializeEvent(ev))
  return `event: ${ev.type}\ndata: ${data}\n\n`
}

function serializeEvent(ev: DifyV2Event): Record<string, unknown> {
  switch (ev.type) {
    case 'session_started':
      return { session_id: ev.session_id, started_at: ev.started_at ?? null }
    case 'message_delta':
      return { text: ev.text }
    case 'message_complete':
      return {
        text: ev.text,
        total_tokens: ev.total_tokens ?? 0,
        elapsed_time: ev.elapsed_time ?? 0,
      }
    case 'error':
      return { code: ev.code, message: ev.message }
    case 'end':
      // 'end' is handled in encodeSingleEvent directly with a fixed body; never reached here.
      throw new Error(`unreachable: serializeEvent called with 'end'`)
  }
}