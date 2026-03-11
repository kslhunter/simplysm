import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from shutil import which

_is_windows = platform.system() == "Windows"


# --- Windows Job Object for reliable process-tree cleanup ---

def _create_win_job():
    try:
        import ctypes
        import ctypes.wintypes as wintypes
    except ImportError:
        return None

    kernel32 = ctypes.windll.kernel32
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE

    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        return None

    class _BASIC(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", ctypes.wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", ctypes.wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", ctypes.wintypes.DWORD),
            ("SchedulingClass", ctypes.wintypes.DWORD),
        ]

    class _IO(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_uint64),
            ("WriteOperationCount", ctypes.c_uint64),
            ("OtherOperationCount", ctypes.c_uint64),
            ("ReadTransferCount", ctypes.c_uint64),
            ("WriteTransferCount", ctypes.c_uint64),
            ("OtherTransferCount", ctypes.c_uint64),
        ]

    class _EXT(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", _BASIC),
            ("IoInfo", _IO),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    info = _EXT()
    info.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE

    if not kernel32.SetInformationJobObject(
        job, 9, ctypes.byref(info), ctypes.sizeof(info),
    ):
        kernel32.CloseHandle(job)
        return None

    return job


def _win_assign_job(job, proc_handle: int) -> None:
    """Assign a process to a job object using its handle directly."""
    import ctypes

    kernel32 = ctypes.windll.kernel32
    kernel32.AssignProcessToJobObject(job, int(proc_handle))


def _win_terminate_job(job) -> None:
    import ctypes

    kernel32 = ctypes.windll.kernel32
    kernel32.TerminateJobObject(job, 1)
    kernel32.CloseHandle(job)


def _win_resume_process(pid: int) -> None:
    """Resume all threads of a suspended process."""
    import ctypes
    import ctypes.wintypes as wintypes

    TH32CS_SNAPTHREAD = 0x00000004
    THREAD_SUSPEND_RESUME = 0x0002

    class THREADENTRY32(ctypes.Structure):
        _fields_ = [
            ("dwSize", wintypes.DWORD),
            ("cntUsage", wintypes.DWORD),
            ("th32ThreadID", wintypes.DWORD),
            ("th32OwnerProcessID", wintypes.DWORD),
            ("tpBasePri", ctypes.c_long),
            ("tpDeltaPri", ctypes.c_long),
            ("dwFlags", wintypes.DWORD),
        ]

    kernel32 = ctypes.windll.kernel32
    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.OpenThread.restype = wintypes.HANDLE

    snap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0)
    if snap == -1:
        return

    te = THREADENTRY32()
    te.dwSize = ctypes.sizeof(THREADENTRY32)

    try:
        if kernel32.Thread32First(snap, ctypes.byref(te)):
            while True:
                if te.th32OwnerProcessID == pid:
                    h = kernel32.OpenThread(THREAD_SUSPEND_RESUME, False, te.th32ThreadID)
                    if h:
                        kernel32.ResumeThread(h)
                        kernel32.CloseHandle(h)
                if not kernel32.Thread32Next(snap, ctypes.byref(te)):
                    break
    finally:
        kernel32.CloseHandle(snap)


def _win_kill_tree(pid: int) -> None:
    """Kill a process tree on Windows using ctypes (no taskkill)."""
    import ctypes
    import ctypes.wintypes as wintypes

    TH32CS_SNAPPROCESS = 0x00000002
    PROCESS_TERMINATE = 0x0001

    class PROCESSENTRY32W(ctypes.Structure):
        _fields_ = [
            ("dwSize", wintypes.DWORD),
            ("cntUsage", wintypes.DWORD),
            ("th32ProcessID", wintypes.DWORD),
            ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)),
            ("th32ModuleID", wintypes.DWORD),
            ("cntThreads", wintypes.DWORD),
            ("th32ParentProcessID", wintypes.DWORD),
            ("pcPriClassBase", ctypes.c_long),
            ("dwFlags", wintypes.DWORD),
            ("szExeFile", ctypes.c_wchar * 260),
        ]

    kernel32 = ctypes.windll.kernel32
    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.OpenProcess.restype = wintypes.HANDLE

    snap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snap == -1:
        return

    children: dict[int, list[int]] = {}
    pe = PROCESSENTRY32W()
    pe.dwSize = ctypes.sizeof(PROCESSENTRY32W)

    try:
        if kernel32.Process32FirstW(snap, ctypes.byref(pe)):
            while True:
                children.setdefault(pe.th32ParentProcessID, []).append(pe.th32ProcessID)
                if not kernel32.Process32NextW(snap, ctypes.byref(pe)):
                    break
    finally:
        kernel32.CloseHandle(snap)

    # Collect all descendants (BFS)
    to_kill = []
    stack = [pid]
    while stack:
        p = stack.pop()
        to_kill.append(p)
        stack.extend(children.get(p, []))

    # Kill children first, then parent
    for p in reversed(to_kill):
        h = kernel32.OpenProcess(PROCESS_TERMINATE, False, p)
        if h:
            kernel32.TerminateProcess(h, 1)
            kernel32.CloseHandle(h)


def kill_tree(pid: int) -> None:
    try:
        if _is_windows:
            _win_kill_tree(pid)
        else:
            os.killpg(pid, 15)
    except OSError:
        pass


# --- Worktree management ---

def get_project_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, check=True,
    )
    return Path(result.stdout.strip())


def _force_remove_dir(path: Path) -> None:
    if _is_windows:
        subprocess.run(
            ["cmd", "/c", "rmdir", "/s", "/q", str(path)],
            capture_output=True, text=True,
        )
    else:
        shutil.rmtree(path, ignore_errors=True)


def create_worktree(project_root: Path, base_name: str) -> tuple[Path, str]:
    hash_str = os.urandom(3).hex()
    name = f"{base_name}-{hash_str}"
    worktree_dir = project_root / ".worktrees" / name

    subprocess.run(
        ["git", "worktree", "add", str(worktree_dir), "-b", name],
        check=True,
    )

    wt_claude = worktree_dir / ".claude"
    if wt_claude.exists():
        _force_remove_dir(wt_claude)
    shutil.copytree(project_root / ".claude", wt_claude)

    return worktree_dir, name


def remove_worktree(project_root: Path, worktree_dir: Path, branch_name: str) -> None:
    if worktree_dir.is_dir():
        _force_remove_dir(worktree_dir)
        subprocess.run(
            ["git", "worktree", "prune"],
            cwd=str(project_root),
            capture_output=True, text=True,
        )

    result = subprocess.run(
        ["git", "branch", "--list", branch_name],
        cwd=str(project_root),
        capture_output=True, text=True,
    )
    if branch_name in result.stdout:
        subprocess.run(
            ["git", "branch", "-d", branch_name],
            cwd=str(project_root),
            capture_output=True, text=True,
        )


# --- Isolated Claude execution ---

def _parse_stream_json(raw_jsonl: str, output_file: Path) -> None:
    """Parse stream-json output and write human-readable results to output_file."""
    with output_file.open("w", encoding="utf-8") as f:
        for line in raw_jsonl.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "assistant":
                for block in (msg.get("message") or {}).get("content") or []:
                    if block.get("type") == "text":
                        f.write(block["text"] + "\n")
                    elif block.get("type") == "tool_use":
                        f.write(f"[Tool: {block['name']}] {json.dumps(block['input'])}\n")
            elif msg.get("type") == "result":
                f.write(f"\n--- Result ({msg.get('subtype', '')}) ---\n{msg.get('result', '')}\n")


def run_isolated_claude(
    worktree_dir: Path,
    prompt_file: Path,
    output_file: Path,
    model: str | None,
    effort: str | None,
) -> int:
    """Run an isolated Claude CLI session in the worktree.

    Redirects stdout/stderr to temp files instead of pipes to avoid
    Windows shell buffering issues. Parses results after process exits.

    Returns the process exit code (0 = success).
    """
    prompt = (
        f"Read the file at {prompt_file.resolve()} and follow its instructions. "
        "IMPORTANT: This is a non-interactive isolated session. "
        "Do NOT use AskUserQuestion — there is no user to respond. "
        "Make your own best judgment for any ambiguous decisions and proceed autonomously."
    )

    output_file.parent.mkdir(parents=True, exist_ok=True)

    env = {
        k: v for k, v in os.environ.items()
        if k not in ("CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT")
    }

    claude_bin = which("claude")
    if not claude_bin:
        with output_file.open("w", encoding="utf-8") as f:
            f.write("[ERROR] 'claude' CLI not found in PATH.\n")
        return 1

    cli_args = [
        claude_bin,
        "-p", prompt,
        "--verbose",
        "--output-format", "stream-json",
        "--dangerously-skip-permissions",
        "--strict-mcp-config",
        "--mcp-config", json.dumps({"mcpServers": {}}),
    ]
    if model:
        cli_args.extend(["--model", model])
    if effort:
        cli_args.extend(["--effort", effort])

    stdout_tmp = tempfile.NamedTemporaryFile(
        mode="w+b", suffix=".jsonl", delete=False,
    )
    stderr_tmp = tempfile.NamedTemporaryFile(
        mode="w+b", suffix=".err", delete=False,
    )

    job = _create_win_job() if _is_windows else None

    try:
        if _is_windows:
            CREATE_SUSPENDED = 0x00000004
            proc = subprocess.Popen(
                cli_args,
                env=env,
                cwd=str(worktree_dir),
                stdin=subprocess.DEVNULL,
                stdout=stdout_tmp,
                stderr=stderr_tmp,
                creationflags=CREATE_SUSPENDED,
            )
            if job:
                _win_assign_job(job, proc._handle)
            _win_resume_process(proc.pid)
        else:
            proc = subprocess.Popen(
                cli_args,
                env=env,
                cwd=str(worktree_dir),
                stdin=subprocess.DEVNULL,
                stdout=stdout_tmp,
                stderr=stderr_tmp,
                start_new_session=True,
            )

        proc.wait()
    finally:
        if job:
            _win_terminate_job(job)
            time.sleep(1)
        stdout_tmp.close()
        stderr_tmp.close()

    # Read captured output
    stdout_path = Path(stdout_tmp.name)
    stderr_path = Path(stderr_tmp.name)

    raw_stdout = stdout_path.read_text(encoding="utf-8", errors="replace")
    raw_stderr = stderr_path.read_text(encoding="utf-8", errors="replace")

    # Clean up temp files
    stdout_path.unlink(missing_ok=True)
    stderr_path.unlink(missing_ok=True)

    # Parse stream-json and write to output file
    if raw_stdout.strip():
        _parse_stream_json(raw_stdout, output_file)
        # If parse produced nothing, dump raw for diagnosis
        if output_file.stat().st_size == 0:
            with output_file.open("w", encoding="utf-8") as f:
                f.write("[ERROR] stream-json parsed but no matching messages found.\n")
                f.write(f"[ERROR] Exit code: {proc.returncode}\n")
                f.write(f"[RAW_STDOUT_FIRST_2000]\n{raw_stdout[:2000]}\n")
                if raw_stderr.strip():
                    f.write(f"[STDERR]\n{raw_stderr[:2000]}\n")
    else:
        with output_file.open("w", encoding="utf-8") as f:
            f.write("[ERROR] Claude CLI produced no stdout.\n")
            f.write(f"[ERROR] Exit code: {proc.returncode}\n")
            if raw_stderr.strip():
                f.write(f"[STDERR]\n{raw_stderr[:2000]}\n")

    return proc.returncode or 0


# --- Main ---

def usage() -> None:
    print("Usage: python test-runner.py --prompt-file <file> --output <file> --base-name <name>")
    print("           [--model <model>] [--effort <level>]")
    print()
    print("Options:")
    print("  --prompt-file  Prompt file path (must exist, written by the caller)")
    print("  --output       Output file path (script writes incrementally)")
    print("  --base-name    Worktree base name (e.g. sd-brainstorm-create-1)")
    print("  --model        Model to use (e.g. claude-opus-4-6)")
    print("  --effort       Reasoning effort level (e.g. low, medium, high)")


def main() -> None:
    args = sys.argv[1:]

    def get_arg(name: str) -> str | None:
        flag = f"--{name}"
        if flag in args:
            idx = args.index(flag)
            if idx + 1 < len(args):
                return args[idx + 1]
        return None

    prompt_file = get_arg("prompt-file")
    output = get_arg("output")
    base_name = get_arg("base-name")
    model = get_arg("model")
    effort = get_arg("effort")

    if not prompt_file or not output or not base_name:
        usage()
        sys.exit(1)

    prompt_path = Path(prompt_file).resolve()
    if not prompt_path.is_file():
        print(f"ERROR: Prompt file not found: {prompt_path}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(output).resolve()
    project_root = get_project_root()

    worktree_dir = None
    branch_name = None

    try:
        worktree_dir, branch_name = create_worktree(project_root, base_name)
        print(f"Worktree created: {worktree_dir} (branch: {branch_name})")

        exit_code = run_isolated_claude(
            worktree_dir, prompt_path, output_path, model, effort,
        )

        if exit_code != 0:
            print(f"Claude exited with code {exit_code}", file=sys.stderr)
    finally:
        if worktree_dir and branch_name:
            remove_worktree(project_root, worktree_dir, branch_name)
            print(f"Worktree cleaned up: {worktree_dir}")

    if exit_code != 0:
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
