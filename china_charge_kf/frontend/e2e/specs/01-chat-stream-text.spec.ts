import { test, expect, type Page } from '@playwright/test'
import { mockDifyV2StreamResponse } from '../helpers/dify-sse-mocks'
import {
  waitForAssistantBubble,
  getAssistantText,
  waitForStreamingEnd,
  isStreaming,
} from '../helpers/stream-helpers'

/**
 * T1 — Text-only chat stream renders full assistant reply from mocked v2 SSE.
 * T7 — Same flow against real Dify backend (opt-in via RUN_REAL_DIFY=1).
 *
 * M7 verified the same scenarios manually via Playwright MCP (see e2e/M7-REPORT.md §2);
 * this spec freezes them as a re-runnable CI gate.
 */

test.describe('T1 — text chat stream (mock SSE)', () => {
  test('renders assistant bubble with mocked SSE reply', async ({ page }) => {
    const REPLY = '你好,我是 mock Dify 助手'

    await mockDifyV2StreamResponse(page, [
      { type: 'session_started', session_id: 'mock-t1', started_at: null },
      { type: 'message_delta', text: REPLY },
      {
        type: 'message_complete',
        text: REPLY,
        total_tokens: 42,
        elapsed_time: 0.5,
      },
    ])

    await page.goto('/')
    await expect(page.locator('.title')).toHaveText('智能客服')

    await page.locator('.input').fill('hello')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)

    expect(await getAssistantText(page)).toBe(REPLY)
    expect(await isStreaming(page)).toBe(false)
  })

  test('multi-chunk delta accumulates into final bubble text', async ({ page }) => {
    const chunks = ['你好', '我是', '助手']
    const fullReply = chunks.join('')

    await mockDifyV2StreamResponse(page, [
      { type: 'session_started', session_id: 'mock-t1b', started_at: null },
      { type: 'message_delta', text: chunks[0] },
      { type: 'message_delta', text: chunks[1] },
      { type: 'message_delta', text: chunks[2] },
      {
        type: 'message_complete',
        text: fullReply,
        total_tokens: 18,
        elapsed_time: 0.2,
      },
    ])

    await page.goto('/')
    await page.locator('.input').fill('hi')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)

    expect(await getAssistantText(page)).toBe(fullReply)
  })

  test('end terminator (no message_complete) still flushes final delta', async ({ page }) => {
    const REPLY = 'partial only'

    await mockDifyV2StreamResponse(page, [
      { type: 'session_started', session_id: 'mock-t1c', started_at: null },
      { type: 'message_delta', text: REPLY },
      { type: 'end' },
    ])

    await page.goto('/')
    await page.locator('.input').fill('ping')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)
    expect(await getAssistantText(page)).toBe(REPLY)
  })
})

test.describe('T7 — real Dify happy path', () => {
  test('@real-dify end-to-end stream against live Dify backend', async ({ page }) => {
    test.skip(
      !process.env.RUN_REAL_DIFY,
      'set RUN_REAL_DIFY=1 to run against real Dify (see e2e/M8-REPORT.md)',
    )

    // No mock — pass-through to /api/chat/stream → uvicorn → real Dify v2.
    await page.goto('/')
    await expect(page.locator('.title')).toHaveText('智能客服')

    await page.locator('.input').fill('你好,你是谁?')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page, { timeout: 30_000 })

    const reply = await getAssistantText(page)
    expect(reply.length).toBeGreaterThan(0)
    expect(reply).not.toBe('（无回复）')
  })
})

/** Shared sanity check that page bootstrap works — used by other specs as reference. */
export async function gotoAndExpectTitle(page: Page, expected: string): Promise<void> {
  await page.goto('/')
  await expect(page.locator('.title')).toHaveText(expected)
}