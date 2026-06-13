import { test, expect, type Route, type Request } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  waitForAssistantBubble,
  getAssistantText,
  waitForStreamingEnd,
} from '../helpers/stream-helpers'

/**
 * T2 — Image upload + follow-up chat stream.
 *
 * Flow under test (App.tsx):
 *  1) user picks file via hidden <input type="file"> (App.tsx:817-829)
 *  2) on send, App.tsx:519-541 calls uploadFile(file, apiBase, signal)
 *  3) uploadFile POSTs FormData to /api/files/upload → expects { file_id }
 *  4) App.tsx:544-550 calls streamChat with file_ids=[uploadResult.file_id]
 *  5) assistant bubble renders reply
 *
 * M7 verified manually (see e2e/M7-REPORT.md §2 T2).
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURE_PATH = resolve(__dirname, '../fixtures/test-image-100x100.png')

test.describe('T2 — image upload + chat stream', () => {
  test('uploads image, sends message with file_ids, renders reply', async ({ page }) => {
    const FILE_ID = 'mock-file-id-7c5e'
    const REPLY = '看到一张红色 100x100 PNG 图'

    // Mock /api/files/upload (frontend fileUpload.ts POSTs FormData here)
    await page.route('**/api/files/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          file_id: FILE_ID,
          name: 'test-image-100x100.png',
          size: 286,
          mime_type: 'image/png',
        }),
      })
    })

    // Mock /api/chat/stream directly so we can capture request.postData() for file_ids assertion
    const chatBodies: unknown[] = []
    await page.route('**/api/chat/stream', async (route: Route, request: Request) => {
      try {
        chatBodies.push(JSON.parse(request.postData() ?? '{}'))
      } catch {
        chatBodies.push(null)
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: [
          'event: session_started\ndata: {"session_id":"mock-t2","started_at":null}\n\n',
          `event: message_delta\ndata: {"text":"${REPLY}"}\n\n`,
          `event: message_complete\ndata: {"text":"${REPLY}","total_tokens":21,"elapsed_time":0.3}\n\n`,
        ].join(''),
      })
    })

    await page.goto('/')

    // Attach file via the hidden <input type="file"> (App.tsx:817)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(FIXTURE_PATH)

    // File picker chip should appear (App.tsx:801 .selectedHint with t.photo text)
    await expect(page.locator('.selectedHint')).toBeVisible()

    // Type and send
    await page.locator('.input').fill('这是什么图?')
    await page.locator('.send').click()

    // Wait for upload + stream completion
    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)

    // Reply rendered
    expect(await getAssistantText(page)).toBe(REPLY)

    // /api/chat/stream was called with file_ids propagated
    expect(chatBodies).toHaveLength(1)
    const body = chatBodies[0] as { file_ids?: unknown }
    expect(body.file_ids).toEqual([FILE_ID])

    // User bubble rendered with image preview
    const userImage = page.locator('.row.user .bubble .img')
    await expect(userImage).toBeVisible()
  })

  test('upload error renders in assistant bubble (not banner)', async ({ page }) => {
    // Note: file upload failure path in App.tsx:519-541 writes to assistant bubble text,
    // NOT to the M6.4 banner. This is intentional — upload is part of the send operation.
    await page.route('**/api/files/upload', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'mock upload failed' }),
      })
    })

    await page.goto('/')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(FIXTURE_PATH)
    await expect(page.locator('.selectedHint')).toBeVisible()

    await page.locator('.input').fill('hi')
    await page.locator('.send').click()

    await waitForAssistantBubble(page)
    await waitForStreamingEnd(page)

    const text = await getAssistantText(page)
    expect(text).toMatch(/请求失败|upload failed|500/i)

    // No banner — upload error is inline
    expect(await page.locator('.errorBanner').count()).toBe(0)
  })
})