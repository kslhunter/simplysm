"""형식별 핸들러 분기. 재귀 첨부 풀이에서도 동일 함수 사용."""

from __future__ import annotations

from pathlib import Path

from . import _common


def unpack_to(input_path: Path, out_dir: Path) -> None:
    """input_path 를 out_dir 로 풀어 떨군다. out_dir 은 미리 만들어져 있어야 함."""
    _common.save_source(input_path, out_dir)

    ext = input_path.suffix.lower()
    if ext == ".eml":
        from . import eml_handler

        eml_handler.run(input_path, out_dir)
    elif ext == ".msg":
        from . import msg_handler

        msg_handler.run(input_path, out_dir)
    elif ext == ".pdf":
        from . import pdf_handler

        pdf_handler.run(input_path, out_dir)
    elif ext in (".docx", ".pptx", ".xlsx"):
        from . import office_com

        office_com.run(input_path, out_dir)
    elif ext in (".doc", ".ppt", ".xls", ".xlsb"):
        from . import office_com

        office_com.run_legacy(input_path, out_dir)
    else:
        # 비컨테이너: _source 보존 + README 만 작성
        _common.write_readme(
            out_dir,
            source_name=input_path.name,
            source_size=input_path.stat().st_size,
            tool="none (비컨테이너)",
            loss_notes=f"비컨테이너 형식({ext}). 원본만 보존됨.",
        )


def maybe_recurse_attachment(
    saved_attachment_path: Path, attachments_dir: Path
) -> Path | None:
    """저장된 첨부가 컨테이너 형식이면 재귀 풀이.

    - 풀린 폴더(<basename>_<ext>/) 반환 (재귀했을 때).
    - 컨테이너 아니면 None 반환.
    """
    if not _common.is_container(saved_attachment_path):
        return None

    sub_out = _common.output_dir_for(saved_attachment_path)
    _common.mkdir(sub_out)
    unpack_to(saved_attachment_path, sub_out)
    return sub_out
