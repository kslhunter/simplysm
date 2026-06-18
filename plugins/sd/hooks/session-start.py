"""SessionStart hook (플러그인 sd).

각 책무를 try/except 로 격리(fail-open, 세션을 막지 않음). 출력은 plain stdout —
SessionStart 는 stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를
stdout 에 절대 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.

stdout(=주입 컨텍스트)은 hook command 당 약 10,000자에서 잘리고 프리뷰 2KB만
인라인됨. 이 판정은 hook command 별로 개별 적용되므로, 콘텐츠를 H1/H2 섹션 경계로
~8K 청크로 나눠 `--part N` 으로 분할 출력하고, hooks.json 에서 SessionStart command
를 여러 개(`--part 0..N`) 등록함. 각 part 는 같은 콘텐츠를 동일하게 재청킹한 뒤
자기 청크만 출력하므로(결정적) part 간 경계가 일관됨. 섹션 경계에서만 자르므로
문장·섹션이 중간에서 끊기지 않음. 슬롯이 청크 수보다 많으면 남는 part 는 무출력.
마지막 슬롯(`--last`)은 남은 청크를 모두 떠안고, 슬롯이 부족해 둘 이상이 몰리면
잘림(주입 누락)이 생기므로 silent skip 대신 경고+해결법을 컨텍스트에 출력함.

책무:
  1. 개인 지식 위키 목차(~/.claude/wiki/index.md) 주입(없으면 part 0 에서 부트스트랩).
  2. ${CLAUDE_PLUGIN_ROOT}/rules/*.md 행동·설계·위키 룰 주입.
  3. 프로젝트의 @simplysm/sd-cli major → 활성 references 카탈로그 주입.
  4. (part 0 에서만) sd-statusline.py 를 ${CLAUDE_PLUGIN_DATA} 로 복제 + ~/.claude/settings.json
     의 statusLine 키가 없을 때만 멱등 주입.
"""
import argparse, json, os, re, sys, tempfile, shutil
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

parser = argparse.ArgumentParser()
parser.add_argument("--part", type=int, default=0)
parser.add_argument("--last", action="store_true")  # 마지막 슬롯: 남은 청크를 모두 떠안음
ARGS, _ = parser.parse_known_args()
PART = ARGS.part
IS_LAST = ARGS.last

try:
    stdin_data = json.load(sys.stdin)
except Exception:
    stdin_data = {}

HOME = Path.home()
PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT")
PLUGIN_DATA = os.environ.get("CLAUDE_PLUGIN_DATA")
PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR") or stdin_data.get("cwd") or os.getcwd()

CHUNK_LIMIT = 8000  # 문자 수(바이트 아님). hook 당 ~10,000자 truncation 한계의 안전 마진.

out = []  # plain stdout 으로 주입할 컨텍스트 조각

# --- 1. 위키 목차 ---
try:
    wiki_dir = HOME / ".claude" / "wiki"
    index_path = wiki_dir / "index.md"
    if index_path.is_file():
        wiki_text = index_path.read_text(encoding="utf-8")
    else:
        wiki_text = "# 지식 위키 목차\n\n_아직 등재된 페이지 없음._\n"
        if PART == 0:  # 부트스트랩 write 는 part 0 에서만(다중 part 동시 실행 race 방지).
            wiki_dir.mkdir(parents=True, exist_ok=True)
            index_path.write_text(wiki_text, encoding="utf-8")
    out.append(f"## 개인 지식 위키 목차 ({index_path})\n\n" + wiki_text)
except Exception:
    pass

# --- 2. rules 주입 ---
try:
    if PLUGIN_ROOT:
        ctx_dir = Path(PLUGIN_ROOT) / "rules"
        for md in sorted(ctx_dir.glob("*.md")):
            out.append(md.read_text(encoding="utf-8"))
except Exception:
    pass

# --- 3. active major ---
try:
    pkg_path = Path(PROJECT_DIR) / "package.json"
    major = None
    if pkg_path.is_file():
        pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
        rng = (pkg.get("dependencies", {}).get("@simplysm/sd-cli")
               or pkg.get("devDependencies", {}).get("@simplysm/sd-cli"))
        if rng:
            m = re.search(r"\d+", str(rng))
            if m:
                major = m.group(0)
    ref_root_str = str(Path(PLUGIN_ROOT) / "references").replace("\\", "/") if PLUGIN_ROOT else None
    if ref_root_str:
        lines = [f"## 활성 references (`{ref_root_str}`)\n"]
        if major:
            lines.append(
                f"- `{ref_root_str}/simplysm{major}/README.md` — `@simplysm/*` API·개발 매뉴얼 트리거 표. "
                f"`@simplysm/*` 심볼·동작을 쓰거나 해석할 때 먼저 Read."
            )
        else:
            lines.append(
                "- (`@simplysm/sd-cli` 의존 미선언 — 버전별 `simplysm<major>` references 비활성)"
            )
        lines.append(
            f"- `{ref_root_str}/requirement-source-handling.md` — 요구사항 원본(회의록·메일·문서 등 비정형 자료)의 "
            f"부정확성 처리 규칙(STT 보정·모호 발화·용어 다의성). 비정형 요구사항을 분석·해석할 때 Read."
        )
        out.append("\n".join(lines))
except Exception:
    pass

# --- 4. statusline 복제 + settings 멱등 주입 (part 0 에서만; 다중 part race·중복 방지) ---
if PART == 0:
    try:
        if PLUGIN_DATA and PLUGIN_ROOT:
            data_dir = Path(PLUGIN_DATA)
            data_dir.mkdir(parents=True, exist_ok=True)
            src = Path(PLUGIN_ROOT) / "scripts" / "sd-statusline.py"
            dst = data_dir / "sd-statusline.py"
            need_copy = True
            if dst.is_file() and src.is_file():
                ss, ds = src.stat(), dst.stat()
                if ss.st_size == ds.st_size and int(ss.st_mtime) == int(ds.st_mtime):
                    need_copy = False
            if src.is_file() and need_copy:
                shutil.copy2(src, dst)

            settings_path = HOME / ".claude" / "settings.json"
            settings = {}
            if settings_path.is_file():
                try:
                    settings = json.loads(settings_path.read_text(encoding="utf-8"))
                except Exception:
                    settings = {}
            if "statusLine" not in settings:
                cmd_path = str(dst).replace("\\", "/")
                settings["statusLine"] = {"type": "command", "command": f'python "{cmd_path}"'}
                settings_path.parent.mkdir(parents=True, exist_ok=True)
                fd, tmp_name = tempfile.mkstemp(dir=str(settings_path.parent), suffix=".tmp")
                try:
                    with os.fdopen(fd, "w", encoding="utf-8") as f:
                        json.dump(settings, f, ensure_ascii=False, indent=2)
                    os.replace(tmp_name, settings_path)
                except Exception:
                    try:
                        os.unlink(tmp_name)
                    except OSError:
                        pass
    except Exception:
        pass


def chunk_by_section(text, limit):
    """H1/H2(`# `·`## `) 헤더 경계로만 분할해 ~limit 문자 청크로 그리디 패킹.
    헤더를 lookahead 로 split 하므로 섹션은 헤더부터 온전히 유지됨(H3 이하는 분할 안 함).
    각 H2 섹션이 limit 미만이면 모든 청크가 limit 이하 → 문장·섹션 중간 절단 없음."""
    secs = [s for s in re.split(r"(?=^#{1,2} )", text, flags=re.M) if s.strip()]
    chunks, cur = [], ""
    for s in secs:
        if cur and len(cur) + len(s) > limit:
            chunks.append(cur)
            cur = s
        else:
            cur += s
    if cur:
        chunks.append(cur)
    return chunks


if out:
    chunks = chunk_by_section("\n\n".join(out), CHUNK_LIMIT)
    if IS_LAST:
        # 마지막 슬롯은 자기 인덱스 이후의 남은 청크를 모두 떠안음. 둘 이상이 몰리면
        # 이 출력이 ~10,000자에서 잘려 일부 룰이 누락되므로, silent 하지 않게 경고+해결법을 앞에 붙임.
        rest = chunks[PART:]
        if len(rest) > 1:
            warn = (
                "## ⚠️ [시스템] SessionStart 룰 주입 슬롯 부족 — 사용자에게 즉시 보고할 것\n\n"
                f"룰 콘텐츠가 {len(chunks)} 청크인데 등록 슬롯이 부족해 마지막 슬롯에 "
                f"{len(rest)} 청크가 몰림 → 이 출력이 ~10,000자에서 잘려 **일부 룰이 컨텍스트에서 누락**될 수 있음. "
                "해결: `plugins/sd/hooks/hooks.json` 의 SessionStart 에 `--part N` command 를 늘리고"
                "(`--last` 는 새 마지막 슬롯으로 옮길 것), 또는 `session-start.py` 의 `CHUNK_LIMIT` 를 낮춰 청크 수를 줄일 것.\n"
            )
            sys.stdout.write(warn + "\n" + "\n\n".join(rest))
        elif rest:
            sys.stdout.write(rest[0])
    elif 0 <= PART < len(chunks):
        sys.stdout.write(chunks[PART])
