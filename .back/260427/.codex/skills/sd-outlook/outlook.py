#!/usr/bin/env python3
"""Outlook mail search & download via Microsoft Graph API.

Usage:
  outlook.py search   --from user@a.com --subject WMS --after 2026-01-01
  outlook.py search   --domain example.com --after 2026-01-01 --before 2026-03-30
  outlook.py download --domain example.com --outdir .tmp/mails --after 2026-01-01
  outlook.py search   --query "from:user@a.com subject:WMS"

Notes:
  --domain runs dual from:/to: search with dedup (OR). Other KQL options are AND.
  Date filtering is client-side ($search + $filter cannot be combined).
  Do NOT use "participants:" in --query (causes Exchange internal server error).
"""

import sys
import io
import json
import time
import re
import argparse
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote as url_quote
from urllib.error import HTTPError

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

GRAPH = "https://graph.microsoft.com/v1.0"
SELECT_LIST = "id,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,bodyPreview"
MAX_PAGES = 20


# ── Config & Auth ─────────────────────────────────────────────────────

def load_config(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        print(f"설정 파일 없음: {path}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(p.read_text(encoding="utf-8"))
    cfg = data.get("outlook")
    if not cfg:
        print("설정 파일에 'outlook' 섹션 없음", file=sys.stderr)
        sys.exit(1)
    return cfg


def get_token(cfg: dict) -> str:
    url = f"https://login.microsoftonline.com/{cfg['tenantId']}/oauth2/v2.0/token"
    body = "&".join(f"{k}={v}" for k, v in {
        "client_id": cfg["clientId"],
        "client_secret": cfg["clientSecret"],
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }.items()).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urlopen(req) as resp:
        data = json.loads(resp.read())
    token = data.get("access_token")
    if not token:
        print(f"토큰 발급 실패: {json.dumps(data, ensure_ascii=False)}", file=sys.stderr)
        sys.exit(1)
    return token


# ── Graph API ─────────────────────────────────────────────────────────

def _api_request(token: str, url: str, accept: str = "application/json") -> bytes:
    req = Request(url, headers={"Authorization": f"Bearer {token}", "Accept": accept})
    for attempt in range(3):
        try:
            with urlopen(req) as resp:
                return resp.read()
        except HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "10"))
                print(f"  429 Rate Limited — {wait}s 대기...", file=sys.stderr)
                time.sleep(wait)
                continue
            body = e.read().decode("utf-8", errors="replace")
            print(f"API 에러 {e.code}: {body}", file=sys.stderr)
            raise
    raise RuntimeError("Max retries exceeded")


def graph_get(token: str, url: str) -> dict:
    return json.loads(_api_request(token, url))


def graph_get_raw(token: str, url: str) -> bytes:
    return _api_request(token, url, accept="application/octet-stream")


def _search_url(user: str, query: str, top: int = 50) -> str:
    q = url_quote(f'"{query}"', safe="")
    return f"{GRAPH}/users/{user}/messages?$search={q}&$select={SELECT_LIST}&$top={top}"


def fetch_search(token: str, user: str, query: str) -> list[dict]:
    url = _search_url(user, query)
    all_msgs: list[dict] = []
    page = 0
    while url and page < MAX_PAGES:
        page += 1
        data = graph_get(token, url)
        batch = data.get("value", [])
        all_msgs.extend(batch)
        url = data.get("@odata.nextLink")
        if url:
            print(f"    p{page}: +{len(batch)} (누적 {len(all_msgs)})", file=sys.stderr)
    return all_msgs


# ── Search Logic ──────────────────────────────────────────────────────

def filter_date(msgs: list[dict], after: str | None, before: str | None) -> list[dict]:
    out = []
    for m in msgs:
        d = m.get("receivedDateTime", "")[:10]
        if after and d < after:
            continue
        if before and d > before:
            continue
        out.append(m)
    return out


def dedup(msgs: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out = []
    for m in msgs:
        if m["id"] not in seen:
            seen.add(m["id"])
            out.append(m)
    return out


def build_kql(args) -> str | None:
    """개별 KQL 옵션들을 조합하여 단일 KQL 쿼리 문자열을 생성한다."""
    parts: list[str] = []
    if getattr(args, "from_addr", None):
        parts.append(f"from:{args.from_addr}")
    if getattr(args, "to_addr", None):
        parts.append(f"to:{args.to_addr}")
    if getattr(args, "cc", None):
        parts.append(f"cc:{args.cc}")
    if getattr(args, "bcc", None):
        parts.append(f"bcc:{args.bcc}")
    if getattr(args, "subject", None):
        parts.append(f"subject:{args.subject}")
    if getattr(args, "body", None):
        parts.append(f"body:{args.body}")
    if getattr(args, "keyword", None):
        parts.append(args.keyword)
    if getattr(args, "has_attachment", False):
        parts.append("hasattachment:yes")
    if getattr(args, "importance", None):
        parts.append(f"importance:{args.importance}")
    return " ".join(parts) if parts else None


def do_search(token: str, user: str, args) -> list[dict]:
    domain = getattr(args, "domain", None)
    query = getattr(args, "query", None)
    after = getattr(args, "after", None)
    before = getattr(args, "before", None)

    if domain:
        # --domain: from/to 양방향 OR 검색
        extra = build_kql(args) or ""
        from_q = f"from:{domain} {extra}".strip()
        to_q = f"to:{domain} {extra}".strip()

        print(f"검색: {from_q}", file=sys.stderr)
        from_msgs = fetch_search(token, user, from_q)
        print(f"  → {len(from_msgs)}건", file=sys.stderr)

        print(f"검색: {to_q}", file=sys.stderr)
        to_msgs = fetch_search(token, user, to_q)
        print(f"  → {len(to_msgs)}건", file=sys.stderr)

        msgs = dedup(from_msgs + to_msgs)
        print(f"중복제거: {len(msgs)}건", file=sys.stderr)
    elif query:
        print(f"검색: {query}", file=sys.stderr)
        msgs = fetch_search(token, user, query)
        print(f"  → {len(msgs)}건", file=sys.stderr)
    else:
        kql = build_kql(args)
        if not kql:
            print("검색 조건 필요 (--domain, --query, 또는 개별 옵션)", file=sys.stderr)
            sys.exit(1)
        print(f"검색: {kql}", file=sys.stderr)
        msgs = fetch_search(token, user, kql)
        print(f"  → {len(msgs)}건", file=sys.stderr)

    msgs = filter_date(msgs, after, before)
    print(f"날짜필터: {len(msgs)}건", file=sys.stderr)

    msgs.sort(key=lambda m: m.get("receivedDateTime", ""))
    return msgs


# ── Output ────────────────────────────────────────────────────────────

def fmt_table(msgs: list[dict]) -> str:
    lines = [
        "| # | 날짜 | 보낸사람 | 제목 | 첨부 |",
        "|---|------|---------|------|------|",
    ]
    for i, m in enumerate(msgs, 1):
        dt = m.get("receivedDateTime", "")[:16].replace("T", " ")
        frm = m.get("from", {}).get("emailAddress", {}).get("address", "")
        subj = m.get("subject", "") or "(제목없음)"
        att = "O" if m.get("hasAttachments") else "-"
        lines.append(f"| {i} | {dt} | {frm} | {subj} | {att} |")
    return "\n".join(lines)


def safe_name(s: str, max_len: int = 60) -> str:
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s)
    s = re.sub(r"_+", "_", s).strip("_. ")
    return s[:max_len] if len(s) > max_len else s


def download_all(token: str, user: str, msgs: list[dict], outdir: Path) -> list[dict]:
    outdir.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    entries: list[dict] = []

    for i, m in enumerate(msgs, 1):
        mid = m["id"]
        dt = m.get("receivedDateTime", "")[:16].replace("T", "_").replace(":", "")
        subj = safe_name(m.get("subject", "") or "제목없음")
        fname = f"{dt}_{subj}"
        while fname in used:
            fname += f"_{i}"
        used.add(fname)

        # MIME 원본(.eml) 다운로드
        url = f"{GRAPH}/users/{user}/messages/{mid}/$value"
        raw = graph_get_raw(token, url)
        eml_path = outdir / f"{fname}.eml"
        eml_path.write_bytes(raw)

        frm = m.get("from", {}).get("emailAddress", {}).get("address", "")
        att = "O" if m.get("hasAttachments") else "-"
        entries.append({
            "i": i,
            "date": m.get("receivedDateTime", "")[:16].replace("T", " "),
            "from": frm,
            "subject": m.get("subject", ""),
            "file": f"{fname}.eml",
            "att": att,
        })
        print(f"  [{i}/{len(msgs)}] {fname}.eml", file=sys.stderr)

    # index.md
    lines = [f"# 메일 수집 결과\n", f"총 {len(entries)}건\n"]
    lines.append("| # | 날짜 | 보낸사람 | 제목 | 첨부 | 파일 |")
    lines.append("|---|------|---------|------|------|------|")
    for e in entries:
        lines.append(f"| {e['i']} | {e['date']} | {e['from']} | {e['subject']} | {e['att']} | [{e['file']}]({e['file']}) |")
    idx = outdir / "index.md"
    idx.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n인덱스: {idx}", file=sys.stderr)
    return entries


# ── CLI ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Outlook mail search & download")
    sub = parser.add_subparsers(dest="cmd", required=True)

    def add_common(p):
        # 검색 모드 (택1 또는 개별 KQL 옵션 조합)
        p.add_argument("--domain", help="도메인 양방향(from+to OR) 검색")
        p.add_argument("--query", help="KQL 직접 입력 (다른 KQL ���션과 배타)")
        # 개별 KQL 옵션 (AND 조합)
        p.add_argument("--from", dest="from_addr", help="보낸사람 (이메일/도메인)")
        p.add_argument("--to", dest="to_addr", help="받는사람 (이메일/도메인)")
        p.add_argument("--cc", help="참조 (이메일/도메인)")
        p.add_argument("--bcc", help="숨은참조 (이메일/도메인)")
        p.add_argument("--subject", help="제목 키워드")
        p.add_argument("--body", help="본문 키워드")
        p.add_argument("--keyword", help="전체 키워드 (제목+본문)")
        p.add_argument("--has-attachment", action="store_true", help="첨부 있는 메일만")
        p.add_argument("--importance", choices=["high", "normal", "low"], help="중요도")
        # 날짜 필터 (클라이언트)
        p.add_argument("--after", help="시작일 YYYY-MM-DD (이상)")
        p.add_argument("--before", help="종료일 YYYY-MM-DD (이하)")
        # 인증
        p.add_argument("--user", help="계정 (기본: config defaultUser)")
        p.add_argument("--config", default=".claude/simplysm.json", help="설정 파일")

    p_s = sub.add_parser("search", help="메일 검색")
    add_common(p_s)

    p_d = sub.add_parser("download", help="메일 다운로드")
    add_common(p_d)
    p_d.add_argument("--outdir", required=True, help="저장 디렉토리")

    args = parser.parse_args()

    # --query는 다른 KQL 옵션과 배타
    kql_opts = [args.from_addr, args.to_addr, args.cc, args.bcc,
                args.subject, args.body, args.keyword, args.importance]
    if args.query and any(kql_opts):
        parser.error("--query는 개별 KQL 옵션(--from, --to 등)과 함께 사용할 수 없습니다")

    cfg = load_config(args.config)
    user = args.user or cfg.get("defaultUser")
    if not user:
        print("계정 미지정 (--user 또는 config defaultUser 필요)", file=sys.stderr)
        sys.exit(1)

    token = get_token(cfg)
    print(f"토큰 발급 완료 (user: {user})", file=sys.stderr)

    msgs = do_search(token, user, args)
    if not msgs:
        print("검색 결과 없음")
        return

    if args.cmd == "search":
        print(fmt_table(msgs))
    else:
        outdir = Path(args.outdir)
        print(f"\n{len(msgs)}건 다운로드 시작...", file=sys.stderr)
        download_all(token, user, msgs, outdir)
        print(str(outdir / "index.md"))


if __name__ == "__main__":
    main()
