import { test, expect, type Page } from '@playwright/test'
import { mockDifyV2Error } from '../helpers/dify-sse-mocks'

/**
 * T5 — Locale switch (zh ↔ en ↔ vi) renders correct localized strings.
 *
 * Source of truth: App.tsx translations object (lines 104-177) and
 * streamErrorMessages map (lines 194-215).
 *
 * No /api/chat/stream traffic in the title/placeholder tests — pure UI rendering.
 * The error banner copy test triggers a DIFY_AUTH error via mockDifyV2Error.
 */

const LANG_CHIP: Record<'zh' | 'en' | 'vi', string> = {
  zh: '中',
  en: 'EN',
  vi: 'VI',
}

const LANG_LABEL: Record<'zh' | 'en' | 'vi', string> = {
  zh: '普通话',
  en: 'English',
  vi: 'Tiếng Việt',
}

const TITLE: Record<'zh' | 'en' | 'vi', string> = {
  zh: '智能客服',
  en: 'Smart Assistant',
  vi: 'Trợ lý Thông minh',
}

const PLACEHOLDER: Record<'zh' | 'en' | 'vi', string> = {
  zh: '请输入问题…',
  en: 'Type your question…',
  vi: 'Nhập câu hỏi của bạn…',
}

const ERROR_BANNER_LABEL: Record<'zh' | 'en' | 'vi', string> = {
  zh: '出错了',
  en: 'Something went wrong',
  vi: 'Đã xảy ra lỗi',
}

const ERROR_AUTH_MSG: Record<'zh' | 'en' | 'vi', string> = {
  zh: '认证失败',
  en: 'Authentication failed',
  vi: 'Xác thực thất bại',
}

async function switchLocale(page: Page, lang: 'zh' | 'en' | 'vi'): Promise<void> {
  // Open the language menu (App.tsx:602-611 .langSelector button)
  await page.locator('.langSelector').click()
  // Pick the item (App.tsx:613-626 .langItem with text from languageNames map)
  await page.locator('.langItem', { hasText: LANG_LABEL[lang] }).click()
  // Verify chip text updated (App.tsx:608 languageShort map: 中 / EN / VI)
  await expect(page.locator('.langSelector')).toContainText(LANG_CHIP[lang])
}

test.describe('T5 — locale switch (zh / en / vi)', () => {
  test('default locale is zh with correct title and placeholder', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.title')).toHaveText(TITLE.zh)
    await expect(page.locator('.input')).toHaveAttribute('placeholder', PLACEHOLDER.zh)
    await expect(page.locator('.langSelector')).toContainText(LANG_CHIP.zh)
  })

  test('zh → en: title and placeholder update to English', async ({ page }) => {
    await page.goto('/')

    await switchLocale(page, 'en')

    await expect(page.locator('.title')).toHaveText(TITLE.en)
    await expect(page.locator('.input')).toHaveAttribute('placeholder', PLACEHOLDER.en)
  })

  test('en → vi: title and placeholder update to Vietnamese', async ({ page }) => {
    await page.goto('/')

    await switchLocale(page, 'en')
    await switchLocale(page, 'vi')

    await expect(page.locator('.title')).toHaveText(TITLE.vi)
    await expect(page.locator('.input')).toHaveAttribute('placeholder', PLACEHOLDER.vi)
  })

  test('error banner copy localizes per active locale', async ({ page }) => {
    // DIFY_AUTH is the most copy-distinctive code (App.tsx:195-199).
    // Switch locale AFTER the error so the banner copy re-renders.
    await mockDifyV2Error(page, 'DIFY_AUTH', 'mock auth failed')

    await page.goto('/')
    await page.locator('.input').fill('hi')
    await page.locator('.send').click()

    // Default zh banner
    await expect(page.locator('.errorBanner')).toBeVisible()
    await expect(page.locator('.errorBanner .errorLabel')).toHaveText(ERROR_BANNER_LABEL.zh)
    await expect(page.locator('.errorBanner .errorMsg')).toContainText(ERROR_AUTH_MSG.zh)

    // Switch to en — banner copy should re-render
    await switchLocale(page, 'en')
    await expect(page.locator('.errorBanner .errorLabel')).toHaveText(ERROR_BANNER_LABEL.en)
    await expect(page.locator('.errorBanner .errorMsg')).toContainText(ERROR_AUTH_MSG.en)

    // Switch to vi
    await switchLocale(page, 'vi')
    await expect(page.locator('.errorBanner .errorLabel')).toHaveText(ERROR_BANNER_LABEL.vi)
    await expect(page.locator('.errorBanner .errorMsg')).toContainText(ERROR_AUTH_MSG.vi)
  })
})