"""Tests for the widget_locale / vi-VN plumbing introduced in PR11.

Coverage:
- ``i18n.core`` accepts ``vi`` / ``vi_VN`` / ``vi-VN`` and resolves them to
  the canonical ``vi-VN`` form, and gettext returns the Vietnamese translation
  for core error messages.
- ``widget_locale_response_instruction`` (in ``api.v1.endpoints``) returns the
  expected LLM-facing directive for the known widget locales, an empty string
  for the default (``zh-CN``) and for unknown values.
- ``ChatRequest`` exposes the new ``widget_locale`` field with the documented
  length cap and tolerates it being absent (backwards compatible).
"""

import pytest

from api.v1.endpoints import widget_locale_response_instruction
from i18n.core import (
    SUPPORTED_LOCALES,
    _,
    _LOCALE_ALIAS_MAP,
    build_locale_fallbacks,
    normalize_locale,
)
from i18n.core import parse_accept_language as _parse_accept_language


# --- i18n core: vi-VN resolution + gettext translation ----------------------


class TestViVnLocale:
    def test_supported_locales_includes_vi_vn(self):
        assert "vi-VN" in SUPPORTED_LOCALES

    def test_alias_map_maps_vi_to_vi_vn(self):
        assert _LOCALE_ALIAS_MAP.get("vi") == "vi-VN"

    @pytest.mark.parametrize(
        "raw",
        ["vi", "vi_VN", "vi-VN", "VI", "Vi", "vI-vN"],
    )
    def test_normalize_locale_resolves_vi_aliases(self, raw):
        assert normalize_locale(raw) == "vi-VN"

    def test_normalize_locale_passes_through_unknown(self):
        # Unknown codes should stay unchanged (no alias) so the rest of the
        # pipeline can decide what to do (e.g. fall through to a default).
        assert normalize_locale("xx-YY") == "xx-YY"

    def test_gettext_vi_vn_translates_core_error(self):
        # The two messages explicitly required by the PR11 acceptance criteria
        # ("未登录" and "Agent not found") must render in Vietnamese.
        assert _("Not logged in", "vi-VN") == "Chưa đăng nhập, vui lòng đăng nhập trước"
        assert _("Agent not found", "vi-VN") == "Không tìm thấy Agent được chỉ định"
        assert _("Request body too large", "vi-VN") == "Kích thước yêu cầu quá lớn"

    def test_gettext_default_locale_unchanged(self):
        # Sanity: the default (zh-CN) path is not disturbed by the vi-VN work.
        assert _("Not logged in", "zh-CN") == "未登录，请先登录"

    def test_build_locale_fallbacks_for_vi_vn(self):
        chain = build_locale_fallbacks("vi-VN")
        assert chain[0] == "vi-VN"
        # Must include the runtime fallbacks so a partially-translated vi-VN
        # request still falls through to a fully-translated locale.
        assert "en-US" in chain
        assert "zh-CN" in chain

    def test_parse_accept_language_prefers_vi_vn(self):
        ordered = _parse_accept_language("vi-VN,zh-CN;q=0.9")
        assert ordered[0] == "vi-VN"
        assert "zh-CN" in ordered


# --- widget_locale_response_instruction: LLM prompt directive ---------------


class TestWidgetLocaleResponseInstruction:
    """Maps the widget-side language selector to a system-prompt suffix."""

    def test_none_returns_empty(self):
        assert widget_locale_response_instruction(None) == ""

    def test_blank_returns_empty(self):
        assert widget_locale_response_instruction("") == ""

    @pytest.mark.parametrize("raw", ["zh-CN", "zh_CN", "zh-cn", "zh-Hans"])
    def test_default_zh_cn_returns_empty(self, raw):
        # The default locale must not append an extra directive — keeps the
        # existing system prompt identical for the vast majority of requests.
        assert widget_locale_response_instruction(raw) == ""

    @pytest.mark.parametrize(
        "raw",
        ["en-US", "en_US", "en", "EN-us", "EN-US"],
    )
    def test_en_us_injects_english_directive(self, raw):
        assert widget_locale_response_instruction(raw) == (
            "\n\nIMPORTANT: Always respond in English (en-US)."
        )

    @pytest.mark.parametrize(
        "raw",
        ["vi-VN", "vi_VN", "vi", "VI", "VI-vn", "Vi-Vn"],
    )
    def test_vi_vn_injects_vietnamese_directive(self, raw):
        assert widget_locale_response_instruction(raw) == (
            "\n\nIMPORTANT: Always respond in Tiếng Việt (vi-VN)."
        )

    @pytest.mark.parametrize("raw", ["ja-JP", "xx-YY", "fr-FR", "de-DE"])
    def test_unknown_locale_returns_empty(self, raw):
        # Unknown codes are intentionally ignored so we do not accidentally
        # inject a directive for a locale the LLM is unlikely to speak well.
        assert widget_locale_response_instruction(raw) == ""


# --- ChatRequest schema: widget_locale field ---------------------------------


class TestChatRequestWidgetLocale:
    def test_widget_locale_optional(self):
        from api.v1.schemas import ChatRequest

        # The field is optional and backwards compatible — requests without
        # widget_locale must still validate.
        req = ChatRequest(agent_id="a1", message="hi")
        assert req.widget_locale is None
        assert req.locale is None

    def test_widget_locale_accepts_known_codes(self):
        from api.v1.schemas import ChatRequest

        req = ChatRequest(agent_id="a1", message="hi", widget_locale="vi-VN")
        assert req.widget_locale == "vi-VN"

    def test_widget_locale_rejects_oversize(self):
        from pydantic import ValidationError

        from api.v1.schemas import ChatRequest

        # Field has max_length=10; an 11-character code must be rejected.
        with pytest.raises(ValidationError):
            ChatRequest(agent_id="a1", message="hi", widget_locale="a" * 11)

    def test_widget_locale_independent_from_admin_locale(self):
        # The two locales are separate concerns (D12): the admin-side locale
        # comes from Accept-Language and lives in ``request.locale``; the
        # widget selector lives in ``widget_locale``. We allow them to differ
        # so e.g. a Chinese admin can test the vi-VN widget selector.
        from api.v1.schemas import ChatRequest

        req = ChatRequest(
            agent_id="a1", message="hi", locale="zh-CN", widget_locale="vi-VN"
        )
        assert req.locale == "zh-CN"
        assert req.widget_locale == "vi-VN"
