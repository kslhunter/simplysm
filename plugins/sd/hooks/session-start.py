"""SessionStart hook (플러그인 sd).

각 책무를 try/except 로 격리(fail-open, 세션을 막지 않음). 출력은 plain stdout —
SessionStart 는 stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를
stdout 에 절대 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.

references 카탈로그는 단일 출력으로 hook command 당 ~10,000자 truncation 한계
안에 들어옴(청크 분할 불요).

(원격 지식 위키 목차 주입·작성 규칙은 별도 플러그인 sd-wiki 가 담당.)

책무:
  1. 프로젝트의 @simplysm/sd-cli major → 활성 references 카탈로그 주입.
  2. statusline.py 를 ~/.claude/sd/ 로 복제 + ~/.claude/settings.json
     의 statusLine 키가 없을 때만 멱등 주입.
"""
import json, os, re, sys, tempfile, shutil
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT")

try:
    stdin_data = json.load(sys.stdin)
except Exception:
    stdin_data = {}

HOME = Path.home()
PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR") or stdin_data.get("cwd") or os.getcwd()

out = []  # plain stdout 으로 주입할 컨텍스트 조각

# --- 1. active major ---
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
    ref_root = (Path(PLUGIN_ROOT) / "references") if PLUGIN_ROOT else None
    ref_root_str = str(ref_root).replace("\\", "/") if ref_root else None
    if ref_root_str:
        lines = [f"## 활성 references (`{ref_root_str}`)\n"]
        if major:
            readme_path = ref_root / f"simplysm{major}" / "README.md"
            if readme_path.is_file():
                base = f"{ref_root_str}/simplysm{major}"
                lines.append(
                    f"아래는 `{base}/README.md` 전문. 본문의 `./` 상대링크는 `{base}/` 기준으로 Read."
                )
                lines.append(readme_path.read_text(encoding="utf-8").strip())
            else:
                lines.append(f"- (`simplysm{major}` references 디렉터리 없음)")
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

# --- 2. statusline 복제 + settings 멱등 주입 ---
try:
    if PLUGIN_ROOT:
        data_dir = HOME / ".claude" / "sd"
        data_dir.mkdir(parents=True, exist_ok=True)
        src = Path(PLUGIN_ROOT) / "scripts" / "statusline.py"
        dst = data_dir / "statusline.py"
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

if out:
    sys.stdout.write("\n\n".join(out))
