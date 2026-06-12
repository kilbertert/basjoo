import sys
import types
from urllib.parse import urlparse

import pytest

from services.llm_service import (
    GoogleProvider,
    OpenAINativeProvider,
    OpenAIProvider,
    get_llm_service,
)


class _FakeStreamResponse:
    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


class _FakeChatCompletions:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return _FakeStreamResponse()


class _FakeAsyncOpenAI:
    def __init__(self, *args, **kwargs):
        # Capture the base_url so tests can assert on the resolved URL.
        self.base_url = kwargs.get("base_url")
        self.chat = types.SimpleNamespace(completions=_FakeChatCompletions())


class _FakeOpenAIDelta:
    def __init__(self, content=None, reasoning_content=None):
        self.content = content
        self.reasoning_content = reasoning_content


class _FakeOpenAIChoice:
    def __init__(self, delta):
        self.delta = delta


class _FakeOpenAIChunk:
    def __init__(self, *, content=None, reasoning_content=None, usage=None):
        self.choices = [_FakeOpenAIChoice(_FakeOpenAIDelta(content=content, reasoning_content=reasoning_content))]
        self.usage = usage


class _FakeAsyncStream:
    def __init__(self, chunks):
        self._chunks = iter(chunks)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._chunks)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class _FakeOpenAICompletionsWithChunks:
    def __init__(self, chunks):
        self._chunks = chunks
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return _FakeAsyncStream(self._chunks)


class _FakeGooglePart:
    def __init__(self, text=None, thought=False):
        self.text = text
        self.thought = thought


class _FakeGoogleContent:
    def __init__(self, parts):
        self.parts = parts


class _FakeGoogleCandidate:
    def __init__(self, parts):
        self.content = _FakeGoogleContent(parts)


class _FakeGoogleResponse:
    def __init__(self, parts, text=None):
        self.candidates = [_FakeGoogleCandidate(parts)] if parts is not None else []
        self.text = text


class _FakeGenerativeModel:
    def __init__(self, _model, *, stream_chunks=None, response=None):
        self.stream_chunks = stream_chunks or []
        self.response = response
        self.calls = []

    async def generate_content_async(self, prompt, **kwargs):
        self.calls.append({"prompt": prompt, **kwargs})
        if kwargs.get("stream"):
            return _FakeAsyncStream(self.stream_chunks)
        return self.response


@pytest.mark.asyncio
async def test_openai_native_reasoning_models_skip_temperature(monkeypatch):
    fake_openai_module = types.SimpleNamespace(AsyncOpenAI=_FakeAsyncOpenAI)
    monkeypatch.setitem(sys.modules, "openai", fake_openai_module)

    provider = OpenAINativeProvider(api_key="test-key", model="o3-mini")

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0.2,
        max_tokens=128,
    ):
        chunks.append(chunk)

    assert chunks == []
    request = provider.client.chat.completions.calls[0]
    assert request["model"] == "o3-mini"
    assert request["max_tokens"] == 128
    assert "temperature" not in request


@pytest.mark.asyncio
async def test_openai_native_standard_models_keep_temperature(monkeypatch):
    fake_openai_module = types.SimpleNamespace(AsyncOpenAI=_FakeAsyncOpenAI)
    monkeypatch.setitem(sys.modules, "openai", fake_openai_module)

    provider = OpenAINativeProvider(api_key="test-key", model="gpt-4o")

    async for _ in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0.2,
        max_tokens=128,
    ):
        pass

    request = provider.client.chat.completions.calls[0]
    assert request["temperature"] == 0.2
    assert request["max_tokens"] == 128


@pytest.mark.asyncio
async def test_openai_compatible_ignores_reasoning_content(monkeypatch):
    fake_client = types.SimpleNamespace(
        chat=types.SimpleNamespace(
            completions=_FakeOpenAICompletionsWithChunks(
                [
                    _FakeOpenAIChunk(reasoning_content="internal thought "),
                    _FakeOpenAIChunk(content="final answer"),
                ]
            )
        )
    )

    provider = OpenAIProvider(api_key="test-key", model="deepseek-reasoner")
    provider.client = fake_client

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
    ):
        chunks.append(chunk)

    assert chunks == ["final answer"]


def test_minimax_provider_dispatches_to_openai_with_minimax_base_url(monkeypatch):
    """MiniMax 走 OpenAI 兼容接口;provider_type=minimax 时,工厂函数应返回
    OpenAIProvider,base_url 落到 https://api.minimaxi.com/v1,默认 model
    MiniMax-Text-01。
    """
    fake_openai_module = types.SimpleNamespace(AsyncOpenAI=_FakeAsyncOpenAI)
    monkeypatch.setitem(sys.modules, "openai", fake_openai_module)

    service = get_llm_service(
        use_mock=False,
        api_key="sk-cp-test",
        provider_type="minimax",
    )

    assert isinstance(service, OpenAIProvider)
    # 客户端是 AsyncOpenAI 实例,base_url 应已注入
    parsed = urlparse(service.client.base_url)
    assert parsed.hostname == "api.minimaxi.com"
    assert parsed.path.rstrip("/") == "/v1"
    # 默认 model
    assert service.model == "MiniMax-Text-01"


def test_minimax_provider_respects_explicit_base_url_and_model(monkeypatch):
    """调用方显式传 api_base / model 时,工厂函数不应覆盖。
    """
    fake_openai_module = types.SimpleNamespace(AsyncOpenAI=_FakeAsyncOpenAI)
    monkeypatch.setitem(sys.modules, "openai", fake_openai_module)

    service = get_llm_service(
        use_mock=False,
        api_key="sk-cp-test",
        provider_type="minimax",
        api_base="https://custom.example.com/v2",
        model="abab6.5s-chat",
    )

    assert isinstance(service, OpenAIProvider)
    parsed = urlparse(service.client.base_url)
    assert parsed.hostname == "custom.example.com"
    assert parsed.path.rstrip("/") == "/v2"
    assert service.model == "abab6.5s-chat"


@pytest.mark.asyncio
async def test_google_provider_filters_thought_parts(monkeypatch):
    fake_model = _FakeGenerativeModel(
        "gemma-4-31b-it",
        stream_chunks=[
            _FakeGoogleResponse([
                _FakeGooglePart(text="internal thought ", thought=True),
                _FakeGooglePart(text="visible ", thought=False),
            ]),
            _FakeGoogleResponse([
                _FakeGooglePart(text="answer", thought=False),
            ]),
        ],
    )
    fake_genai_module = types.SimpleNamespace(
        configure=lambda **kwargs: None,
        GenerativeModel=lambda _model: fake_model,
    )
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai_module)

    provider = GoogleProvider(api_key="test-key", model="gemma-4-31b-it")
    provider.client = fake_model

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
    ):
        chunks.append(chunk)

    assert chunks == ["visible ", "answer"]


@pytest.mark.asyncio
async def test_google_provider_filters_thought_parts_non_streaming(monkeypatch):
    fake_model = _FakeGenerativeModel(
        "gemma-4-31b-it",
        response=_FakeGoogleResponse(
            [
                _FakeGooglePart(text="internal thought ", thought=True),
                _FakeGooglePart(text="final answer", thought=False),
            ],
            text="internal thought final answer",
        ),
    )
    fake_genai_module = types.SimpleNamespace(
        configure=lambda **kwargs: None,
        GenerativeModel=lambda _model: fake_model,
    )
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai_module)

    provider = GoogleProvider(api_key="test-key", model="gemma-4-31b-it")
    provider.client = fake_model

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        stream=False,
    ):
        chunks.append(chunk)

    assert chunks == ["final answer"]


@pytest.mark.asyncio
async def test_google_provider_handles_empty_parts(monkeypatch):
    fake_model = _FakeGenerativeModel(
        "gemma-4-31b-it",
        response=_FakeGoogleResponse([], text="internal thought final answer"),
    )
    fake_genai_module = types.SimpleNamespace(
        configure=lambda **kwargs: None,
        GenerativeModel=lambda _model: fake_model,
    )
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai_module)

    provider = GoogleProvider(api_key="test-key", model="gemma-4-31b-it")
    provider.client = fake_model

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        stream=False,
    ):
        chunks.append(chunk)

    assert chunks == []


@pytest.mark.asyncio
async def test_google_provider_handles_empty_candidates(monkeypatch):
    fake_model = _FakeGenerativeModel(
        "gemma-4-31b-it",
        response=_FakeGoogleResponse(None, text="internal thought final answer"),
    )
    fake_genai_module = types.SimpleNamespace(
        configure=lambda **kwargs: None,
        GenerativeModel=lambda _model: fake_model,
    )
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai_module)

    provider = GoogleProvider(api_key="test-key", model="gemma-4-31b-it")
    provider.client = fake_model

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        stream=False,
    ):
        chunks.append(chunk)

    assert chunks == []


@pytest.mark.asyncio
async def test_google_provider_falls_back_to_text_without_candidates(monkeypatch):
    fake_model = _FakeGenerativeModel(
        "gemma-4-31b-it",
        response=types.SimpleNamespace(text="final answer"),
    )
    fake_genai_module = types.SimpleNamespace(
        configure=lambda **kwargs: None,
        GenerativeModel=lambda _model: fake_model,
    )
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai_module)

    provider = GoogleProvider(api_key="test-key", model="gemma-4-31b-it")
    provider.client = fake_model

    chunks = []
    async for chunk in provider.chat_completion(
        messages=[{"role": "user", "content": "Hello"}],
        stream=False,
    ):
        chunks.append(chunk)

    assert chunks == ["final answer"]
