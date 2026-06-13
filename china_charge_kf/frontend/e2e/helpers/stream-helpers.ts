import type { Locator, Page } from '@playwright/test'

/**
 * M8.0 — Locator helpers for the H5 widget chat UI.
 *
 * Selectors deliberately avoid CSS class-name coupling where possible.
 * App.tsx exposes stable class hooks (.bubble, .text, .stoppedTag, .errorBanner, .send.stop);
 * the widget never had data-testid attributes, so we rely on the existing class surface.
 */

const DEFAULT_TIMEOUT = 10_000

/** Wait for the most recent assistant bubble to render and return its locator. */
export async function waitForAssistantBubble(
  page: Page,
  options: { timeout?: number } = {},
): Promise<Locator> {
  const bubble = page.locator('.row.assistant .bubble').last()
  await bubble.waitFor({ state: 'visible', timeout: options.timeout ?? DEFAULT_TIMEOUT })
  return bubble
}

/**
 * Read the last assistant bubble's visible text.
 *
 * Filters out the streaming-placeholder (`.typing`) and the no-response tag
 * (`.noResponse`) so callers get the actual answer text. T4 (null text) returns ''.
 */
export async function getAssistantText(page: Page): Promise<string> {
  const locator = page.locator(
    '.row.assistant .bubble .text:not(.typing):not(.noResponse)',
  )
  const count = await locator.count()
  if (count === 0) return ''
  return (await locator.nth(count - 1).textContent())?.trim() ?? ''
}

/**
 * Detect whether a stream is currently in flight.
 *
 * Two signals: the typing-indicator row OR the stop-button replacement of send.
 * (See App.tsx:691-698 typing row, App.tsx:775-778 stop button.)
 */
export async function isStreaming(page: Page): Promise<boolean> {
  const typing = await page.locator('.row.assistant .text.typing').count()
  if (typing > 0) return true
  const stopBtn = await page.locator('.send.stop').count()
  return stopBtn > 0
}

/** Wait for streaming to start (typing row or stop button appears). */
export async function waitForStreamingStart(
  page: Page,
  options: { timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  await Promise.race([
    page.locator('.row.assistant .text.typing').first().waitFor({ state: 'visible', timeout }),
    page.locator('.send.stop').waitFor({ state: 'visible', timeout }),
  ])
}

/** Wait for streaming to end (typing row + stop button both gone). */
export async function waitForStreamingEnd(
  page: Page,
  options: { timeout?: number } = {},
): Promise<void> {
  const typing = page.locator('.row.assistant .text.typing')
  await typing.waitFor({ state: 'detached', timeout: options.timeout ?? DEFAULT_TIMEOUT })
}

/**
 * Read the M6.4 error banner text.
 *
 * Returns null if no banner is shown. Otherwise returns `label + " " + msg`,
 * which is what the user sees (e.g. "出错了 服务暂时不可用,请稍后再试").
 */
export async function getErrorBannerText(page: Page): Promise<string | null> {
  const banner = page.locator('.errorBanner')
  if ((await banner.count()) === 0) return null
  const label = (await banner.locator('.errorLabel').textContent()) ?? ''
  const msg = (await banner.locator('.errorMsg').textContent()) ?? ''
  const combined = `${label} ${msg}`.trim()
  return combined.length > 0 ? combined : null
}

/** True if any assistant bubble shows the `.noResponse` placeholder (T4). */
export async function getNoResponseIndicator(page: Page): Promise<boolean> {
  return (await page.locator('.row.assistant .text.noResponse').count()) > 0
}

/** True if any assistant bubble shows the `.stoppedTag` (T6 — aborted stream). */
export async function getStoppedIndicator(page: Page): Promise<boolean> {
  return (await page.locator('.row.assistant .stoppedTag').count()) > 0
}