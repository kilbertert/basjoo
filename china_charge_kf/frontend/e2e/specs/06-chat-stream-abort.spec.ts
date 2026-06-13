import { test, expect, type Request } from '@playwright/test'
import { mockDifyV2StreamResponse, type DifyV2Event } from '../helpers/dify-sse-mocks'
import {
  waitForStreamingStart,
  waitForStreamingEnd,
  getStoppedIndicator,
  getAssistantText,
} from '../helpers/stream-helpers'

/**
 * T6 — M6.3 stream abort: clicking the stop button fires AbortController.abort(),
 * which propagates to fetch() via signal. Frontend must:
 *  - hide the stop button
 *  - mark the assistant bubble with `.stopped` (App.tsx:579)
 *  - render the `.stoppedTag` ("(已停止)" / "(stopped)" / "(đã dừng)")
 *  - NOT receive further message_delta events
 *
 * To give the browser enough wall-clock to render the typing row and stop button,
 * the mock SSE body is intentionally large (≈12 KB across 60 message_delta chunks).
 * route.fulfill returns the body in one shot; the browser/reader chunks delivery
 * internally, yielding enough ticks for the user to click stop.
 */

function buildLongStreamEvents(chunks: number, chunkSize: number): DifyV2Event[] {
  const repeatUnit = '流式分块文本段,用于在 abort 测试中撑出时间窗。'
  const reply = repeatUnit.repeat(Math.ceil((chunks * chunkSize) / repeatUnit.length))
  const events: DifyV2Event[] = [
    { type: 'session_started', session_id: 'mock-t6', started_at: null },
  ]
  for (let i = 0; i < chunks; i++) {
    events.push({ type: 'message_delta', text: reply.slice(i * chunkSize, (i + 1) * chunkSize) })
  }
  events.push({
    type: 'message_complete',
    text: reply,
    total_tokens: 1234,
    elapsed_time: 2.0,
  })
  return events
}

test.describe('T6 — stream abort (M6.3)', () => {
  test('clicking stop button fires AbortController and renders "(已停止)"', async ({
    page,
  }) => {
    // Capture request state to verify abort actually fired
    const abortedRequests: string[] = []
    page.on('requestfailed', (req) => {
      if (req.url().includes('/api/chat/stream')) {
        abortedRequests.push(req.failure()?.errorText ?? 'unknown')
      }
    })

    const events = buildLongStreamEvents(60, 200)
    await mockDifyV2StreamResponse(page, events)

    await page.goto('/')
    await page.locator('.input').fill('tell me a long story')
    await page.locator('.send').click()

    // Wait until streaming actually started (stop button or typing row visible)
    await waitForStreamingStart(page)

    // Click stop — App.tsx:776 .send.stop
    const stopBtn = page.locator('.send.stop')
    await expect(stopBtn).toBeVisible()
    await stopBtn.click()

    // Stop button disappears, .stoppedTag renders
    await expect(page.locator('.send.stop')).toHaveCount(0)
    await expect(page.locator('.row.assistant .stoppedTag')).toBeVisible()
    await expect(page.locator('.row.assistant .stoppedTag')).toHaveText('（已停止）')

    // The indicator helper agrees
    expect(await getStoppedIndicator(page)).toBe(true)

    // AbortController was actually invoked — Playwright surfaces requestfailure
    // with errorText containing 'aborted' for fetch() signals. We accept either
    // 'aborted' or 'NS_BINDING_ABORTED' (Chromium on Windows can return either).
    expect(abortedRequests.length).toBeGreaterThanOrEqual(1)
    expect(abortedRequests[0].toLowerCase()).toMatch(/abort/)
  })

  test('stop before any delta arrives still aborts cleanly', async ({ page }) => {
    // Edge case: user clicks stop within the first 50 ms. Mock a very short
    // initial response so the abort race is realistic.
    await mockDifyV2StreamResponse(page, [
      { type: 'session_started', session_id: 'mock-t6b', started_at: null },
      { type: 'message_delta', text: 'hi' },
      // Many tiny chunks to keep the stream "open" while user reacts
      ...Array.from({ length: 80 }, () => ({
        type: 'message_delta' as const,
        text: '...',
      })),
      { type: 'message_complete', text: 'hi...', total_tokens: 1, elapsed_time: 0.01 },
    ])

    await page.goto('/')
    await page.locator('.input').fill('x')
    await page.locator('.send').click()

    // Race the click — wait for stop button then immediately click
    await page.locator('.send.stop').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('.send.stop').click()

    await expect(page.locator('.row.assistant .stoppedTag')).toBeVisible({ timeout: 5000 })

    // The bubble may have partial text "hi" — that's fine
    const partial = await getAssistantText(page)
    expect(partial.startsWith('hi') || partial === '').toBe(true)
  })

  // Smoke-test: request captured has the expected POST shape (defensive)
  test('stopped request was a POST with text payload', async ({ page }) => {
    let capturedMethod: string | null = null
    let capturedPostData: string | null = null
    await mockDifyV2StreamResponse(page, buildLongStreamEvents(60, 200))

    page.on('request', (req: Request) => {
      if (req.url().includes('/api/chat/stream') && !capturedMethod) {
        capturedMethod = req.method()
        capturedPostData = req.postData()
      }
    })

    await page.goto('/')
    await page.locator('.input').fill('audit')
    await page.locator('.send').click()

    await waitForStreamingStart(page)
    await page.locator('.send.stop').click()

    // Wait for streaming to fully end so the request handler ran
    await waitForStreamingEnd(page, { timeout: 10_000 })

    expect(capturedMethod).toBe('POST')
    expect(capturedPostData).toContain('"text":"audit"')
  })
})