#!/usr/bin/env python3
"""APK Decompiler - jadx, apktool, dex2jar+CFR을 이용한 APK 디컴파일"""

import subprocess
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

TOOLS_DIR = Path(__file__).parent / "tools"


def run_jadx(apk_path: Path, output_dir: Path):
    cmd = [
        "jadx", str(apk_path),
        "-d", str(output_dir / "jadx"),
        "--show-bad-code",
        "--threads-count", "4",
        "--deobf", "--deobf-min", "3",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return "jadx", result.returncode, result.stderr


def run_apktool(apk_path: Path, output_dir: Path):
    cmd = [
        "java", "-jar", str(TOOLS_DIR / "apktool.jar"),
        "d", str(apk_path),
        "-o", str(output_dir / "apktool"),
        "-f",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return "apktool", result.returncode, result.stderr


def run_dex2jar(apk_path: Path, output_dir: Path):
    lib_dir = TOOLS_DIR / "dex2jar" / "lib"
    jars = list(lib_dir.glob("*.jar"))
    classpath = ";".join(["."] + [str(j) for j in jars])

    cmd = [
        "java", "-Xms512m", "-Xmx2048m",
        "-classpath", classpath,
        "com.googlecode.dex2jar.tools.Dex2jarCmd",
        str(apk_path),
        "-o", str(output_dir / "app.jar"),
        "--force",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return "dex2jar", result.returncode, result.stderr


def run_cfr(output_dir: Path):
    cmd = [
        "java", "-jar", str(TOOLS_DIR / "cfr.jar"),
        str(output_dir / "app.jar"),
        "--outputdir", str(output_dir / "cfr"),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return "cfr", result.returncode, result.stderr


def main():
    if len(sys.argv) != 2:
        print("Usage: python decompile.py <APK_PATH>")
        sys.exit(1)

    apk_path = Path(sys.argv[1]).resolve()

    if not apk_path.exists():
        print(f"ERROR: 파일이 존재하지 않습니다: {apk_path}")
        sys.exit(1)
    if apk_path.suffix.lower() != ".apk":
        print(f"ERROR: APK 파일이 아닙니다: {apk_path}")
        sys.exit(1)
    if not shutil.which("jadx"):
        print("ERROR: jadx가 설치되어 있지 않습니다. 설치: scoop install jadx")
        sys.exit(1)
    if not shutil.which("java"):
        print("ERROR: java가 설치되어 있지 않습니다.")
        sys.exit(1)

    output_dir = apk_path.parent / f"{apk_path.stem}_decompiled"
    output_dir.mkdir(exist_ok=True)

    print(f"출력 디렉토리: {output_dir}")
    print("디컴파일 시작...")

    results = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(run_jadx, apk_path, output_dir): "jadx",
            executor.submit(run_apktool, apk_path, output_dir): "apktool",
            executor.submit(run_dex2jar, apk_path, output_dir): "dex2jar",
        }
        for future in as_completed(futures):
            name, returncode, stderr = future.result()
            results[name] = (returncode, stderr)
            print(f"  [{name}] {'성공' if returncode == 0 else '실패'}")

    if results.get("dex2jar", (1,))[0] == 0:
        name, returncode, stderr = run_cfr(output_dir)
        results[name] = (returncode, stderr)
        print(f"  [{name}] {'성공' if returncode == 0 else '실패'}")
    else:
        print("  [cfr] 건너뜀 (dex2jar 실패)")

    print("\n===== 결과 =====")
    print(f"출력: {output_dir}")

    has_failure = False
    for name, (returncode, stderr) in results.items():
        if returncode != 0:
            has_failure = True
            print(f"\n[{name}] 실패:\n  {stderr[:500]}")

    if not has_failure:
        print(f"""
{apk_path.stem}_decompiled/
  jadx/        <- Java 소스 (해석 A) + 리소스
  apktool/     <- smali + 리소스 완벽 디코딩
  cfr/         <- Java 소스 (해석 B)
  app.jar      <- dex2jar 중간 산출물""")

    sys.exit(1 if has_failure else 0)


if __name__ == "__main__":
    main()
