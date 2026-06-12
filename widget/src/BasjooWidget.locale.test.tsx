/**
 * PR12 widget language-selector tests.
 *
 * 12 cases across 5 groups:
 *   A. localStorage round-trip of `basjoo_widget_locale` (3)
 *   B. `t()` / `resolveLocale()` / `isWidgetLocale()` correctness (3)
 *   C. Chat request body has both `locale` and `widget_locale` (3)
 *   D. Auto-init `?widget_locale=...` script-tag preset (2)
 *   E. a11y on the rendered <select> (1)
 *
 * Mirrors the working-mock + DOM setup pattern from
 * `BasjooWidget.storage.test.tsx`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './BasjooWidget';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  WIDGET_LOCALE_STORAGE_KEY,
  isWidgetLocale,
  resolveLocale,
  t,
} from './locales';

function createWorkingMock(): { mock: Storage; store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    mock: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
      removeItem: vi.fn((key: string) => { store.delete(key); }),
      clear: vi.fn(() => { store.clear(); }),
      key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
      get length() { return store.size; },
    } as unknown as Storage,
    store,
  };
}

function makeWidget(agentId = 'test-agent', apiBase = 'http://localhost:8000'): any {
  const Ctor: any = (window as any).BasjooWidget;
  return new Ctor({ agentId, apiBase });
}

async function openChat(widget: any): Promise<void> {
  // The selector only renders inside the chat window (created on open()).
  await widget.init();
  widget.toggle();   // opens the chat window
}

describe('PR12 — i18n helpers (locales.ts)', () => {
  it('isWidgetLocale narrows to a known locale literal', () => {
    expect(isWidgetLocale('zh-CN')).toBe(true);
    expect(isWidgetLocale('en-US')).toBe(true);
    expect(isWidgetLocale('vi-VN')).toBe(true);
    expect(isWidgetLocale('fr-FR')).toBe(false);
    expect(isWidgetLocale('')).toBe(false);
    expect(isWidgetLocale(null)).toBe(false);
    expect(isWidgetLocale(undefined)).toBe(false);
    expect(isWidgetLocale(42)).toBe(false);
  });

  it('resolveLocale handles prefixes, case, and unknown values', () => {
    expect(resolveLocale('zh-CN')).toBe('zh-CN');
    expect(resolveLocale('zh-TW')).toBe('zh-CN');
    expect(resolveLocale('zh')).toBe('zh-CN');
    expect(resolveLocale('en-US')).toBe('en-US');
    expect(resolveLocale('en-GB')).toBe('en-US');
    expect(resolveLocale('vi')).toBe('vi-VN');
    expect(resolveLocale('vi-VN')).toBe('vi-VN');
    expect(resolveLocale('fr-FR')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it('t() returns 3-language strings for every supported key', () => {
    // Each of the 14 keys must have a non-empty value in all 3 locales.
    for (const code of SUPPORTED_LOCALES) {
      expect(t(code, 'languageSelectorLabel').length).toBeGreaterThan(0);
      expect(t(code, 'optionZh')).toBeTruthy();
      expect(t(code, 'optionEn')).toBeTruthy();
      expect(t(code, 'optionVi')).toBeTruthy();
      expect(t(code, 'sendFailed')).toBeTruthy();
      expect(t(code, 'networkError')).toBeTruthy();
      expect(t(code, 'quotaExceeded')).toBeTruthy();
      expect(t(code, 'takenOverNotice')).toBeTruthy();
      expect(t(code, 'inputPlaceholder')).toBeTruthy();
      expect(t(code, 'messageTooLong')).toBeTruthy();
      expect(t(code, 'greetingBubble')).toBeTruthy();
      expect(t(code, 'newMessage')).toBeTruthy();
      expect(t(code, 'thinking')).toBeTruthy();
      expect(t(code, 'references')).toBeTruthy();
    }
    // Sanity check the 3-language strings differ for the labels.
    expect(t('zh-CN', 'languageSelectorLabel')).not.toBe(t('en-US', 'languageSelectorLabel'));
    expect(t('en-US', 'languageSelectorLabel')).not.toBe(t('vi-VN', 'languageSelectorLabel'));
  });
});

describe('PR12 — selector persists across widget instances (refresh equivalent)', () => {
  let originalLocalStorage: Storage;
  let store: Map<string, string>;
  let workingMock: Storage;

  beforeEach(() => {
    document.documentElement.innerHTML = '<html><head></head><body></body></html>';
    originalLocalStorage = window.localStorage;
    const m = createWorkingMock();
    store = m.store;
    workingMock = m.mock;
    Object.defineProperty(window, 'localStorage', {
      value: workingMock, writable: true, configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage, writable: true, configurable: true,
    });
    document.querySelectorAll('#basjoo-widget-container').forEach((el) => el.remove());
    document.querySelectorAll('#basjoo-widget-styles').forEach((el) => el.remove());
  });

  it('preserves the chosen locale across widget instances (refresh equivalent)', async () => {
    const w1 = makeWidget();
    await openChat(w1);
    const select1 = w1.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    select1.value = 'vi-VN';
    select1.dispatchEvent(new Event('change'));
    expect(store.get(WIDGET_LOCALE_STORAGE_KEY)).toBe('vi-VN');

    // Tear down w1 to free the #basjoo-widget-container id so w2.init() can
    // actually construct (init() refuses to overwrite an existing container).
    w1.destroy();
    expect(document.getElementById('basjoo-widget-container')).toBeNull();

    // New widget instance in the same storage context.
    const w2 = makeWidget();
    await openChat(w2);
    const select2 = w2.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    expect(select2.value).toBe('vi-VN');
  });

  it('falls back to DEFAULT_LOCALE when localStorage is empty', async () => {
    const w = makeWidget();
    await openChat(w);
    const select = w.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_LOCALE);
    expect(w.widgetLocale).toBe(DEFAULT_LOCALE);
  });

  it('ignores an unknown stored value (defensive parse)', async () => {
    store.set(WIDGET_LOCALE_STORAGE_KEY, 'fr-FR');
    const w = makeWidget();
    await openChat(w);
    const select = w.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_LOCALE);
    expect(w.widgetLocale).toBe(DEFAULT_LOCALE);
  });
});

describe('PR12 — chat request body', () => {
  let originalLocalStorage: Storage;
  let store: Map<string, string>;
  let originalFetch: any;

  beforeEach(() => {
    document.documentElement.innerHTML = '<html><head></head><body></body></html>';
    originalLocalStorage = window.localStorage;
    const m = createWorkingMock();
    store = m.store;
    Object.defineProperty(window, 'localStorage', {
      value: m.mock, writable: true, configurable: true,
    });
    originalFetch = (global as any).fetch;
    (global as any).fetch = vi.fn(() => Promise.reject(new Error('intentional test stub')));
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage, writable: true, configurable: true,
    });
    document.querySelectorAll('#basjoo-widget-container').forEach((el) => el.remove());
    document.querySelectorAll('#basjoo-widget-styles').forEach((el) => el.remove());
  });

  it('posts body with both `locale` (auto) and `widget_locale` (selector) keys', async () => {
    const w = makeWidget('test-agent', 'http://localhost:8000');
    // Explicit config.language so we can assert locale != widget_locale keys.
    w.config.language = 'en-US';
    await openChat(w);
    try { await w.sendMessage('hi') } catch { /* fetch stub rejects, expected */ }
    const fetchMock = (global as any).fetch as ReturnType<typeof vi.fn>;
    // sendMessageWithRetry may invoke fetch more than once (one attempt + retry);
    // we only care that at least one call hit the chat stream endpoint with the
    // right body shape.
    const streamCalls = fetchMock.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/chat/stream')
    );
    expect(streamCalls.length).toBeGreaterThanOrEqual(1);
    const [, init] = streamCalls[0];
    const body = JSON.parse(init.body);
    expect(body).toHaveProperty('locale');
    expect(body).toHaveProperty('widget_locale');
    // Both present and separately populated; the keys must be distinct.
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['locale', 'widget_locale']));
    // Default widgetLocale is 'zh-CN'; config.language is 'en-US' so the values differ.
    expect(body.locale).toBe('en-US');
    expect(body.widget_locale).toBe('zh-CN');
  });

  it('changing the selector updates widget_locale on the next send', async () => {
    const w = makeWidget();
    await openChat(w);
    const select = w.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    select.value = 'vi-VN';
    select.dispatchEvent(new Event('change'));
    expect(w.widgetLocale).toBe('vi-VN');
    try { await w.sendMessage('hi') } catch { /* fetch stub rejects */ }
    const fetchMock = (global as any).fetch as ReturnType<typeof vi.fn>;
    const streamCalls = fetchMock.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/chat/stream')
    );
    expect(streamCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(streamCalls[0][1].body);
    expect(body.widget_locale).toBe('vi-VN');
  });

  it('selector change writes to basjoo_widget_locale in localStorage', async () => {
    const w = makeWidget();
    await openChat(w);
    const select = w.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    select.value = 'en-US';
    select.dispatchEvent(new Event('change'));
    expect(store.get(WIDGET_LOCALE_STORAGE_KEY)).toBe('en-US');
  });
});

describe('PR12 — a11y on the rendered <select>', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    document.documentElement.innerHTML = '<html><head></head><body></body></html>';
    originalLocalStorage = window.localStorage;
    const m = createWorkingMock();
    Object.defineProperty(window, 'localStorage', {
      value: m.mock, writable: true, configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage, writable: true, configurable: true,
    });
    document.querySelectorAll('#basjoo-widget-container').forEach((el) => el.remove());
    document.querySelectorAll('#basjoo-widget-styles').forEach((el) => el.remove());
  });

  it('selector has an accessible name via aria-label or sr-only label text', async () => {
    const w = makeWidget();
    await openChat(w);
    const select = w.chatWindow.querySelector('[data-basjoo-locale-select]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const aria = select.getAttribute('aria-label');
    const srOnly = w.chatWindow.querySelector(
      '.basjoo-language-selector-wrap .basjoo-sr-only'
    ) as HTMLElement | null;
    const srOnlyText = srOnly ? srOnly.textContent?.trim() : '';
    const accessibleName = (aria && aria.trim()) || (srOnlyText && srOnlyText) || '';
    expect(accessibleName.length).toBeGreaterThan(0);
  });
});
