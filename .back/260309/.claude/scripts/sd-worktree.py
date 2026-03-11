import os
import platform
import subprocess
import sys
from pathlib import Path


def get_project_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, check=True,
    )
    return Path(result.stdout.strip())


def detect_pm(project_root: Path) -> str | None:
    if (project_root / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (project_root / "yarn.lock").exists():
        return "yarn"
    if (project_root / "package-lock.json").exists():
        return "npm"
    return None


def cmd_add(project_root: Path, base_name: str) -> None:
    hash_str = os.urandom(3).hex()
    name = f"{base_name}-{hash_str}"
    worktree_dir = project_root / ".worktrees" / name

    subprocess.run(
        ["git", "worktree", "add", str(worktree_dir), "-b", name],
        check=True,
    )

    pm = detect_pm(project_root)
    if pm:
        print(f"Running {pm} install...")
        subprocess.run([pm, "install"], cwd=str(worktree_dir), check=True)

    print()
    print(f"Worktree created: {worktree_dir} (branch: {name})")


def cmd_merge(project_root: Path, name: str) -> None:
    subprocess.run(
        ["git", "merge", name, "--no-ff"],
        cwd=str(project_root), check=True,
    )
    result = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=str(project_root), capture_output=True, text=True, check=True,
    )
    print(f"Merged branch '{name}' into {result.stdout.strip()}.")


def _force_remove_dir(path: Path) -> None:
    if platform.system() == "Windows":
        subprocess.run(
            ["cmd", "/c", "rmdir", "/s", "/q", str(path)],
            capture_output=True, text=True,
        )
    else:
        import shutil
        shutil.rmtree(path, ignore_errors=True)


def cmd_remove(project_root: Path, name: str) -> None:
    worktree_dir = project_root / ".worktrees" / name

    if worktree_dir.is_dir():
        _force_remove_dir(worktree_dir)
        subprocess.run(["git", "worktree", "prune"], check=True)
        print(f"Removed worktree: {worktree_dir}")
    else:
        print(f"Worktree directory not found: {worktree_dir} (skipping)")

    result = subprocess.run(
        ["git", "branch", "--list", name],
        capture_output=True, text=True,
    )
    if name in result.stdout:
        subprocess.run(["git", "branch", "-D", name], check=True)
        print(f"Deleted branch: {name}")
    else:
        print(f"Branch not found: {name} (skipping)")


def usage() -> None:
    print("Usage: sd-worktree.py <command> <name>")
    print()
    print("Commands:")
    print("  add <name>     Create worktree at .worktrees/<name> and run PM install")
    print("  merge <name>   Merge branch <name> into current branch with --no-ff")
    print("  remove <name>  Remove worktree directory and delete branch")


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 1:
        usage()
        sys.exit(1)

    command = args[0]
    if command not in ("add", "merge", "remove"):
        print(f"ERROR: Unknown command '{command}'", file=sys.stderr)
        usage()
        sys.exit(1)

    if len(args) < 2:
        print("ERROR: <name> is required.", file=sys.stderr)
        usage()
        sys.exit(1)

    project_root = get_project_root()
    name = args[1]

    if command == "add":
        cmd_add(project_root, name)
    elif command == "merge":
        cmd_merge(project_root, name)
    elif command == "remove":
        cmd_remove(project_root, name)


if __name__ == "__main__":
    main()
