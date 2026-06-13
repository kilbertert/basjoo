import { test, expect } from '@playwright/test'
import { mockDifyV2Error, mockHttpError } from '../helpers/dify-sse-mocks'
import { getErrorBannerText } from '../helpers/stream-helpers'

/**
 * T3 — M6.4 error banner (segregated from assistant bubble).
 *
 * Three error paths all surface in the SAME `.errorBanner` element at the top of
 * the chat (App.tsx:653-668), NOT inside any assistant `.bubble`:
 *   A) HTTP 5xx from backend → DifyStreamError(BAD_HTTP) → banner (DIFY_UNKNOWN copy)
 *   B) v2 SSE `event: error` with code=DIFY_UPSTREAM → banner (upstream-specific copy)
 *   C) v2 SSE `event: error` with code=DIFY_AUTH → banner (auth-specific copy)
 *
 * Localized copy lives in App.tsx:194-215 (streamErrorMessages map).
 */

test.describe('T3 — error banner (M6.4)', () => {
  test('A — HTTP 5xx surfaces generic banner with dismiss button', async ({ page }) => {
    await mockHttpError(page, 500)

    await page.goto('/')
    await page.locator('.input').fill('hello')
    await page.locator('.send').click()

    const banner = page.locator('.errorBanner')
    await expect(banner).toBeVisible()

    // Banner is at chat-top, not inside any assistant bubble (M6.4 invariant)
    const inlineBanner = await page.locator('.row.assistant .bubble .errorBanner').count()
    expect(inlineBanner).toBe(0)

    // Dismiss button present and functional
    const dismiss = page.locator('.errorBanner .errorDismiss')
    await expect(dismiss).toBeVisible()

    const text = await getErrorBannerText(page)
    expect(text).toBeTruthy()
    expect(text).toMatch(/出错了/)

    // After dismiss, banner disappears
    await dismiss.click()
    await expect(banner).toHaveCount(0)
  })

  test('B — DIFY_UPSTREAM shows specific upstream message', async ({ page }) => {
    await mockDifyV2Error(page, 'DIFY_UPSTREAM', 'mock upstream failed')

    await page.goto('/')
    await page.locator('.input').fill('hello')
    await page.locator('.send').click()

    const banner = page.locator('.errorBanner')
    await expect(banner).toBeVisible()

    const text = await getErrorBannerText(page)
    expect(text).toMatch(/服务暂时不可用|请稍后再试/)

    // Assistant bubble may not exist for the error path — but if it does, it must be empty
    // (no error text inside .bubble)
    const inlineError = await page
      .locator('.row.assistant .bubble')
      .evaluateAll((nodes) =>
        nodes.some((n) => n.textContent && /mock upstream failed/.test(n.textContent)),
      )
    expect(inlineError).toBe(false)
  })

  test('C — DIFY_AUTH shows auth-specific message', async ({ page }) => {
    await mockDifyV2Error(page, 'DIFY_AUTH', 'mock auth failed')

    await page.goto('/')
    await page.locator('.input').fill('hello')
    await page.locator('.send').click()

    const banner = page.locator('.errorBanner')
    await expect(banner).toBeVisible()

    const text = await getErrorBannerText(page)
    expect(text).toMatch(/认证失败|please contact support|liên hệ hỗ trợ/)
  })
})