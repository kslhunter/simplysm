"""sd-skill eval harness.

지정된 대상 스킬을 평가한다. 각 케이스를 격리된 샌드박스에서 실행하고,
MCP submit_verdict 도구로 채점한 결과를 디스크에 저장한 뒤 stdout으로 summary JSON을 출력한다.

Usage: python run_eval.py <target-skill-name>
"""
from __future__ import annotations

import asyncio
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any


def _ensure_pip(import_name: str, pip_name: str | None = None) -> None:
    import importlib
    try:
        importlib.import_module(import_name)
    except ImportError:
        import subprocess
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", pip_name or import_name]
        )


_ensure_pip("claude_agent_sdk", "claude-agent-sdk")

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    create_sdk_mcp_server,
    query,
    tool,
)

sys.path.insert(0, ".claude/scripts")
from sd_paths import resolve_tmp_base

SCRIPT_DIR = Path(__file__).resolve().parent
SKILLS_DIR = SCRIPT_DIR.parent.parent  # .claude/skills/
PROJECT_ROOT = SKILLS_DIR.parent.parent  # repo root


def load_eval_root(target_skill_name: str) -> Path:
    return resolve_tmp_base() / "evals" / target_skill_name


def sweep_stale(runs_dir: Path, max_age_hours: int = 24) -> None:
    if not runs_dir.exists():
        return
    cutoff = time.time() - max_age_hours * 3600
    for d in runs_dir.iterdir():
        try:
            if d.stat().st_mtime < cutoff:
                shutil.rmtree(d, ignore_errors=True)
        except OSError:
            pass


def serialize_block(block: Any) -> dict:
    if isinstance(block, ToolUseBlock):
        return {"type": "tool_use", "name": block.name, "input": block.input}
    if isinstance(block, TextBlock):
        return {"type": "text", "text": block.text}
    return {"type": type(block).__name__}


def serialize_message(msg: Any) -> dict:
    if isinstance(msg, AssistantMessage):
        return {"type": "assistant", "content": [serialize_block(b) for b in msg.content]}
    if isinstance(msg, ResultMessage):
        return {
            "type": "result",
            "subtype": getattr(msg, "subtype", None),
            "duration_ms": getattr(msg, "duration_ms", None),
        }
    return {"type": type(msg).__name__}


def walk_tree(root: Path, exclude_skill_names: set[str], max_file_bytes: int = 20000) -> dict:
    files: dict[str, str] = {}
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        parts = rel.split("/")
        if len(parts) >= 3 and parts[0] == ".claude" and parts[1] == "skills" and parts[2] in exclude_skill_names:
            continue
        try:
            content = p.read_text(encoding="utf-8")
            if len(content) > max_file_bytes:
                content = content[:max_file_bytes] + f"\n... <truncated, {p.stat().st_size} bytes total>"
            files[rel] = content
        except (UnicodeDecodeError, OSError):
            try:
                size = p.stat().st_size
            except OSError:
                size = -1
            files[rel] = f"<binary or unreadable, {size} bytes>"
    return files


def copy_dot_claude(src_dot_claude: Path, dst_dot_claude: Path) -> None:
    """Copy .claude/ to sandbox, excluding each skill's evals/ subfolder."""
    def _ignore(dir_path: str, names: list[str]) -> list[str]:
        ignored = {"__pycache__"}
        d = Path(dir_path)
        try:
            rel = d.relative_to(src_dot_claude).as_posix()
        except ValueError:
            return list(ignored & set(names))
        parts = rel.split("/") if rel != "." else []
        # .claude/skills/<name>/  → ignore evals
        if len(parts) == 2 and parts[0] == "skills":
            ignored.add("evals")
        return [n for n in names if n in ignored]

    shutil.copytree(src_dot_claude, dst_dot_claude, ignore=_ignore, dirs_exist_ok=True)


def merge_overlay(src: Path, dst: Path) -> None:
    """Copy src tree on top of dst, overwriting files where they collide."""
    for p in src.rglob("*"):
        rel = p.relative_to(src)
        target = dst / rel
        if p.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, target)


def apply_sabotage(skill_md_path: Path, sabotage: dict) -> None:
    """Apply sabotage patch to a SKILL.md file. Currently supports remove_between."""
    text = skill_md_path.read_text(encoding="utf-8")
    rb = sabotage.get("remove_between")
    if rb:
        start = rb["start"]
        end = rb["end"]
        si = text.find(start)
        if si == -1:
            raise RuntimeError(f"sabotage start anchor not found: {start!r}")
        ei = text.find(end, si + len(start))
        if ei == -1:
            raise RuntimeError(f"sabotage end anchor not found: {end!r}")
        text = text[:si] + text[ei:]
    else:
        raise RuntimeError(f"unsupported sabotage spec: {sabotage}")
    skill_md_path.write_text(text, encoding="utf-8")


EVAL_MODE_PREFIX = """<eval-mode>
- 사용자 응답을 직접 받을 수 없습니다.
- 사용자 입력이 필요한 시점이 오면 합리적인 답변을 자체 생성해서 자동 적용하고 진행하세요.
- 자동 답변한 내용은 텍스트 출력에 명시하세요 (어떤 시점에 어떻게 답변했는지).
- 워크플로 끝까지 완수 후 종료하세요.
</eval-mode>

"""


async def run_target(case_input: str, sandbox: Path) -> list[dict]:
    events: list[dict] = []
    async for msg in query(
        prompt=EVAL_MODE_PREFIX + case_input,
        options=ClaudeAgentOptions(
            cwd=str(sandbox),
            permission_mode="bypassPermissions",
            disallowed_tools=["WebFetch", "WebSearch"],
        ),
    ):
        events.append(serialize_message(msg))
    return events


JUDGE_TOOL_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["PASS", "FAIL"]},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "check": {"type": "string"},
                    "result": {"type": "string", "enum": ["PASS", "FAIL"]},
                    "reason": {"type": "string"},
                },
                "required": ["check", "result"],
            },
        },
    },
    "required": ["verdict", "items"],
}


def build_judge_prompt(case: dict, events: list[dict], tree: dict) -> str:
    rubric_lines = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(case["rubric"]))
    events_str = json.dumps(events, ensure_ascii=False, indent=2)
    tree_str = json.dumps(tree, ensure_ascii=False, indent=2)
    return (
        "당신은 엄격한 평가자입니다.\n\n"
        "[케이스 입력]\n"
        f"{case['input']}\n\n"
        "[에이전트가 일으킨 이벤트]\n"
        f"{events_str}\n\n"
        "[샌드박스 종료 시 파일트리]\n"
        f"{tree_str}\n\n"
        "[Rubric 항목]\n"
        f"{rubric_lines}\n\n"
        "각 rubric 항목을 PASS 또는 FAIL 로 판정합니다.\n"
        "- 모든 항목 PASS → 케이스 verdict = PASS\n"
        "- 한 항목이라도 FAIL → 케이스 verdict = FAIL\n"
        "- FAIL 항목에는 짧은 reason 을 적습니다 (PASS는 reason 생략).\n\n"
        "submit_verdict 호출 시 'items' 배열의 각 'check' 필드에는 위 [Rubric 항목] 의 원문 문장을 "
        "번호 없이 그대로 복사해 넣어야 합니다. 요약·축약·번호화 금지.\n\n"
        "submit_verdict 도구를 정확히 한 번 호출해 결과를 제출하세요. 다른 텍스트 출력 금지."
    )


async def run_judge(case: dict, events: list[dict], tree: dict) -> dict:
    captured: dict = {}

    @tool(
        "submit_verdict",
        "Submit final verdict after evaluating each rubric item.",
        JUDGE_TOOL_SCHEMA,
    )
    async def submit_verdict(args):
        captured.update(args)
        return {"content": [{"type": "text", "text": "ok"}]}

    server = create_sdk_mcp_server(name="judge", tools=[submit_verdict])

    async for _ in query(
        prompt=build_judge_prompt(case, events, tree),
        options=ClaudeAgentOptions(
            mcp_servers={"judge": server},
            allowed_tools=["mcp__judge__submit_verdict"],
            permission_mode="bypassPermissions",
            max_turns=5,
        ),
    ):
        pass

    return captured


async def run_case(
    case: dict,
    run_id: str,
    eval_root: Path,
    fixtures_dir: Path,
) -> dict:
    case_id = case["id"]
    sandbox = eval_root / "runs" / run_id / case_id
    case_results = eval_root / "results" / run_id / "cases" / case_id
    case_results.mkdir(parents=True, exist_ok=True)

    fixture_dir = fixtures_dir / case["fixture"]
    src_dot_claude = PROJECT_ROOT / ".claude"
    src_skills_dir = src_dot_claude / "skills"
    fixture_skills_dir = fixture_dir / ".claude" / "skills"

    pre_existing_skills = {d.name for d in src_skills_dir.iterdir() if d.is_dir()}
    fixture_skills = (
        {d.name for d in fixture_skills_dir.iterdir() if d.is_dir()}
        if fixture_skills_dir.exists()
        else set()
    )
    exclude_skill_names = pre_existing_skills - fixture_skills

    expected_verdict = case.get("expected_verdict", "PASS")
    sabotage = case.get("sabotage_skill_patch")

    try:
        if sandbox.exists():
            shutil.rmtree(sandbox, ignore_errors=True)
        sandbox.mkdir(parents=True, exist_ok=True)

        copy_dot_claude(src_dot_claude, sandbox / ".claude")
        merge_overlay(fixture_dir, sandbox)

        if sabotage:
            for skill_dir in (sandbox / ".claude" / "skills").iterdir():
                if (skill_dir / "scripts" / "run_eval.py").exists():
                    apply_sabotage(skill_dir / "SKILL.md", sabotage)
                    break

        events = await run_target(case["input"], sandbox)
        tree = walk_tree(sandbox, exclude_skill_names=exclude_skill_names)

        (case_results / "events.json").write_text(
            json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        (case_results / "tree.json").write_text(
            json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        verdict_data = await run_judge(case, events, tree)
        (case_results / "judge_output.json").write_text(
            json.dumps(verdict_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        judge_verdict = verdict_data.get("verdict", "ERROR")
        if judge_verdict == "ERROR":
            meta_verdict = "ERROR"
        elif judge_verdict == expected_verdict:
            meta_verdict = "PASS"
        else:
            meta_verdict = "FAIL"

        return {
            "id": case_id,
            "verdict": meta_verdict,
            "judge_verdict": judge_verdict,
            "expected_verdict": expected_verdict,
            "dir": str(case_results),
        }
    except Exception as e:
        (case_results / "error.txt").write_text(f"{type(e).__name__}: {e}", encoding="utf-8")
        return {
            "id": case_id,
            "verdict": "ERROR",
            "error": f"{type(e).__name__}: {e}",
            "dir": str(case_results),
        }
    finally:
        shutil.rmtree(sandbox, ignore_errors=True)


def load_cases(golden_path: Path) -> list[dict]:
    cases = []
    for line in golden_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            cases.append(json.loads(line))
    return cases


async def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python run_eval.py <target-skill-name>\n")
        sys.exit(2)
    target_skill_name = sys.argv[1]
    target_skill_dir = SKILLS_DIR / target_skill_name
    if not target_skill_dir.is_dir():
        sys.stderr.write(f"target skill not found: {target_skill_dir}\n")
        sys.exit(2)

    target_evals_dir = target_skill_dir / "evals"
    fixtures_dir = target_evals_dir / "fixtures"
    golden_path = target_evals_dir / "golden.jsonl"

    eval_root = load_eval_root(target_skill_name)
    runs_dir = eval_root / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    sweep_stale(runs_dir)

    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    results_run_dir = eval_root / "results" / run_id
    results_run_dir.mkdir(parents=True, exist_ok=True)

    cases = load_cases(golden_path)
    case_results = await asyncio.gather(
        *(run_case(c, run_id, eval_root, fixtures_dir) for c in cases)
    )

    pass_count = sum(1 for r in case_results if r["verdict"] == "PASS")
    fail_count = sum(1 for r in case_results if r["verdict"] == "FAIL")
    error_count = sum(1 for r in case_results if r["verdict"] == "ERROR")

    summary = {
        "run_id": run_id,
        "results_dir": str(results_run_dir),
        "summary": {
            "total": len(case_results),
            "pass": pass_count,
            "fail": fail_count,
            "error": error_count,
        },
        "cases": case_results,
    }

    (results_run_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    sys.stdout.write(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
