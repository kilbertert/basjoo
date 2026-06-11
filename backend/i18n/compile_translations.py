"""Compile all .po files in this directory into .mo files.

We do not depend on the system gettext ``msgfmt`` binary (not always available on
Windows dev boxes). The encoder is intentionally minimal — it produces the
subset of the GNU .mo format that CPython's ``gettext`` stdlib module reads:
GNU extended header (28 bytes; hash_size/hash_off = 0), one orig table and
one trans table, then a contiguous run of msgid strings followed by a
contiguous run of msgstr strings. No plural forms.

Run from any working directory:

    python backend/i18n/compile_translations.py
"""

from __future__ import annotations

import re
import struct
import sys
from pathlib import Path

LOCALE_RE = re.compile(r"^[A-Za-z]{2,3}(?:[_-][A-Za-z0-9]{2,8})*$")
HEADER_BYTES = 28  # magic + revision + n + orig_off + trans_off + hash_size + hash_off
ENTRY_BYTES = 8  # one (length, offset) pair per string entry


def parse_po(text: str) -> list[tuple[str, str]]:
    """Return [(msgid, msgstr), ...] from a .po file body, skipping the header."""
    pairs: list[tuple[str, str]] = []
    cur_id: list[str] = []
    cur_str: list[str] = []
    state: str | None = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line:
            if state in ("id", "str") and cur_id:
                pairs.append(("\n".join(cur_id), "\n".join(cur_str)))
                cur_id, cur_str, state = [], [], None
            continue
        if line.startswith("#"):
            continue
        if line.startswith("msgid "):
            if state in ("id", "str") and cur_id:
                pairs.append(("\n".join(cur_id), "\n".join(cur_str)))
            cur_id = [_unquote(line[len("msgid "):])]
            cur_str = []
            state = "id"
        elif line.startswith("msgstr "):
            cur_str = [_unquote(line[len("msgstr "):])]
            state = "str"
        elif line.startswith('"') and line.endswith('"') and state in ("id", "str"):
            (cur_id if state == "id" else cur_str).append(line[1:-1])
    if state in ("id", "str") and cur_id:
        pairs.append(("\n".join(cur_id), "\n".join(cur_str)))
    # Drop the empty-msgid header entry; we'll synthesize our own.
    return [(i, s) for i, s in pairs if i != ""]


def _unquote(token: str) -> str:
    token = token.strip()
    if not (token.startswith('"') and token.endswith('"')):
        return ""
    return token[1:-1]


def encode_mo(pairs: list[tuple[str, str]], language: str) -> bytes:
    """Build a .mo file for the given (msgid, msgstr) pairs and language tag."""
    header = (
        "",
        f"Content-Type: text/plain; charset=UTF-8\nLanguage: {language}\n",
    )
    all_pairs = [header, *pairs]
    n = len(all_pairs)
    msgid_bytes = [k.encode("utf-8") + b"\x00" for k, _ in all_pairs]
    msgstr_bytes = [v.encode("utf-8") + b"\x00" for _, v in all_pairs]

    strings_start = HEADER_BYTES + 2 * n * ENTRY_BYTES
    cur = strings_start
    orig_entries: list[tuple[int, int]] = []
    for b in msgid_bytes:
        orig_entries.append((len(b) - 1, cur))  # mlen excludes trailing NUL
        cur += len(b)
    trans_entries: list[tuple[int, int]] = []
    for b in msgstr_bytes:
        trans_entries.append((len(b) - 1, cur))
        cur += len(b)

    out = bytearray()
    # magic, revision, n, orig_off, trans_off
    out += struct.pack(
        "<IIIII",
        0x950412DE,
        0,
        n,
        HEADER_BYTES,
        HEADER_BYTES + n * ENTRY_BYTES,
    )
    # hash_size, hash_off — disabled (no hash table)
    out += struct.pack("<II", 0, 0)
    for mlen, moff in orig_entries:
        out += struct.pack("<II", mlen, moff)
    for tlen, toff in trans_entries:
        out += struct.pack("<II", tlen, toff)
    for b in msgid_bytes:
        out += b
    for b in msgstr_bytes:
        out += b
    return bytes(out)


def compile_locale(locale_dir: Path, force: bool = False) -> Path:
    if not LOCALE_RE.match(locale_dir.name):
        raise ValueError(f"Unexpected locale directory name: {locale_dir.name}")
    po_path = locale_dir / "LC_MESSAGES" / "messages.po"
    mo_path = locale_dir / "LC_MESSAGES" / "messages.mo"
    if not po_path.exists():
        raise FileNotFoundError(po_path)
    if (
        not force
        and mo_path.exists()
        and mo_path.stat().st_mtime >= po_path.stat().st_mtime
    ):
        return mo_path
    pairs = parse_po(po_path.read_text(encoding="utf-8"))
    mo_path.parent.mkdir(parents=True, exist_ok=True)
    mo_path.write_bytes(encode_mo(pairs, locale_dir.name))
    return mo_path


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recompile every locale even when the .mo is newer than the .po.",
    )
    args = parser.parse_args(argv)

    here = Path(__file__).resolve().parent
    locales_dir = here / "locales"
    if not locales_dir.is_dir():
        print(f"locales directory not found: {locales_dir}", file=sys.stderr)
        return 1
    compiled = 0
    skipped = 0
    for locale_dir in sorted(locales_dir.iterdir()):
        if not locale_dir.is_dir():
            continue
        try:
            mo = compile_locale(locale_dir, force=args.force)
        except (FileNotFoundError, ValueError) as e:
            print(f"  skip {locale_dir.name}: {e}")
            continue
        was_up_to_date = (
            mo.exists() and mo.stat().st_mtime >= (locale_dir / "LC_MESSAGES" / "messages.po").stat().st_mtime
        )
        # Distinguish the "we wrote it" from "already current" cases.
        was_just_compiled = not was_up_to_date or args.force
        if was_just_compiled:
            print(f"  compiled {mo.relative_to(here)}")
            compiled += 1
        else:
            print(f"  up-to-date {mo.relative_to(here)}")
            skipped += 1
    print(f"done, {compiled} compiled, {skipped} up-to-date")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
