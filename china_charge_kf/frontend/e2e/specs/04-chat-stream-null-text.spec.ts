import { test, expect } from '@playwright/test'
import { mockDifyV2StreamResponse } from '../helpers/dify-sse-mocks'
import {
  waitForAssistantBubble,
  getAssistantText,
  getNoResponseIndicator,
  waitForStreamingEnd,
} from '../helpers/stream-helpers'

/**
 * T4 — M6.1 null-text path: backend yields `message_complete.text === null`
 * without any preceding message_delta. Frontend must:
 *  - render the assistant bubble (no crash)
 *  - show the `.noResponse` placeholder ("(无回复)" / "(no response)" / "(không có phản hồi)")
 *  - emit zero pageerror
 *
 * App.tsx:562 condition: `if (ev.text === null && !m.text) → noResponse: true`.
 * If message_delta ran first, m.text is non-empty → noResponse stays false (uses m.text).
 */

test.describe('T4 — null text path (M6.1)', () => {
  test('no deltas + null message_complete.text renders "(无回复)" placeholder', async ({
    page,
  }) => {
    const pageErrors: Error[] = []
    page.on('pageerror', (err) => pageErrors.push(err))

    await mockDifyV2StreamResponse(page, [
      { type: 'session_started', session_id: 'mock-t4', started_at: null },
      // Intentionally NO message_delta — message_complete arrives with null text directly.
      {
        type: 'message_complete',
        text: null,
        total_tokens: 0,
        elapsed_time: 0,
      },
    ])

    await page.goto('/')
    await page.locator('.input').fill('silence please')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)

    // No crash
    expect(pageErrors).toHaveLength(0)

    // Bubble renders, but its visible text is empty (placeholder is in .noResponse,
    // which getAssistantText filters out by design).
    expect(await getAssistantText(page)).toBe('')

    // The .noResponse placeholder is rendered
    expect(await getNoResponseIndicator(page)).toBe(true)

    // Placeholder localized to Chinese (default lang)
    await expect(page.locator('.row.assistant .text.noResponse')).toHaveText('（无回复）')
  })

  test('null message_complete.text WITH prior deltas uses accumulated text, not noResponse', async ({
    page,
  }) => {
    // Edge case: M6.1 logic preserves accumulated delta text even if backend later
    // claims text=null (defensive against backend flakiness).
    await mockDifyV2StreamResponse(page, [
      { type: 'session_started', session_id: 'mock-t4b', started_at: null },
      { type: 'message_delta', text: 'partial ' },
      { type: 'message_delta', text: 'reply' },
      {
        type: 'message_complete',
        text: null,
        total_tokens: 0,
        elapsed_time: 0,
      },
    ])

    await page.goto('/')
    await page.locator('.input').fill('mixed')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)

    expect(await getAssistantText(page)).toBe('partial reply')
    expect(await getNoResponseIndicator(page)).toBe(false)
  })
})