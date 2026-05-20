"""Office COM 작업 worker subprocess.

호출자(office_com.py)가 subprocess.run 으로 띄움. 한 번 호출 = 한 작업.
process 종료 = OS 가 COM cleanup 강제 → IUnknown::Release RPC timeout(60s) 회피.
hang 시 호출자가 timeout 으로 kill → 안정성 확보.

sub-commands:
- word_pdf <input> <output_pdf>
- ppt_png <input> <out_dir> <slide_titles_json>
- excel_sheets <input> <sheets_dir> <sheet_names_json>  → stdout: sheet_ranges JSON
- convert_legacy <ext> <input> <output>

Office 외 작업 (.xlsx zip strip, .md/.formulas.json 추출 등) 은 호출자에서 처리.
worker 는 COM 호출만 담당.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path


# ====================================================================
# path helpers (worker 단독 동작 위해 inline)
# ====================================================================

def long_str(p: Path) -> str:
    s = str(p)
    if os.name != "nt":
        return s
    if s.startswith("\\\\?\\") or s.startswith("\\\\.\\"):
        return s
    if not p.is_absolute():
        s = str(p.resolve())
        if s.startswith("\\\\?\\"):
            return s
    return "\\\\?\\" + s


def short_str(p: Path) -> str:
    s = str(p)
    if s.startswith("\\\\?\\"):
        return s[4:]
    return s


# ====================================================================
# Word
# ====================================================================

def cmd_word_pdf(args) -> None:
    import pythoncom
    import win32com.client

    input_path = Path(args.input)
    output_pdf = Path(args.output)

    pythoncom.CoInitialize()
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        try:
            doc = word.Documents.Open(short_str(input_path), ReadOnly=True)
            try:
                doc.RemovePersonalInformation = False
                doc.ExportAsFixedFormat(
                    OutputFileName=short_str(output_pdf),
                    ExportFormat=17,  # wdExportFormatPDF
                )
            finally:
                doc.Close(SaveChanges=False)
        finally:
            word.Quit()
    finally:
        pythoncom.CoUninitialize()


# ====================================================================
# PowerPoint
# ====================================================================

def cmd_ppt_png(args) -> None:
    import pythoncom
    import win32com.client

    input_path = Path(args.input)
    out_dir = Path(args.out_dir)
    slide_titles = json.loads(args.slide_titles)  # [[idx, safe_title], ...]

    pythoncom.CoInitialize()
    try:
        ppt = win32com.client.DispatchEx("PowerPoint.Application")
        try:
            pres = ppt.Presentations.Open(short_str(input_path), WithWindow=False)
            try:
                pres.RemovePersonalInformation = False
                target_dpi = 300
                width_px = int(pres.PageSetup.SlideWidth / 72 * target_dpi)
                height_px = int(pres.PageSetup.SlideHeight / 72 * target_dpi)
                for i, slide in enumerate(pres.Slides, start=1):
                    if i - 1 < len(slide_titles):
                        idx, safe_title = slide_titles[i - 1]
                    else:
                        idx, safe_title = f"{i:02d}", f"슬라이드{i}"
                    out_png = out_dir / f"{idx}_{safe_title}.png"
                    slide.Export(short_str(out_png), "PNG", width_px, height_px)
            finally:
                pres.Close()
        finally:
            ppt.Quit()
    finally:
        pythoncom.CoUninitialize()


# ====================================================================
# Excel sheets PNG (ChartObject + CopyPicture hack)
# ====================================================================

def cmd_excel_sheets(args) -> None:
    """input 은 이미 sheetProtection strip 된 사본 (호출자가 처리). 결과 sheet_ranges 는 stdout JSON."""
    import pythoncom
    import win32com.client

    input_path = Path(args.input)
    sheets_dir = Path(args.sheets_dir)
    sheet_names = json.loads(args.sheet_names)  # [[idx, safe_name, raw_name], ...]

    sheet_ranges: dict[str, tuple[int, int]] = {}
    tmp_dir = Path(tempfile.mkdtemp(prefix="sd-unpack-worker-"))

    pythoncom.CoInitialize()
    try:
        excel = win32com.client.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        # 자동 이벤트/매크로/화면갱신 차단. (Calculation 은 워크북 필요 → Open 후로)
        excel.ScreenUpdating = False
        excel.EnableEvents = False
        excel.AutomationSecurity = 3  # msoAutomationSecurityForceDisable
        try:
            wb = excel.Workbooks.Open(short_str(input_path), ReadOnly=True)
            try:
                excel.Calculation = -4135  # xlCalculationManual
                wb.RemovePersonalInformation = False
                for idx, safe_name, raw_name in sheet_names:
                    _export_one_sheet(wb, tmp_dir, sheets_dir, idx, safe_name, raw_name, sheet_ranges)
            finally:
                wb.Close(SaveChanges=False)
        finally:
            excel.Quit()
    finally:
        pythoncom.CoUninitialize()
        shutil.rmtree(tmp_dir, ignore_errors=True)

    sys.stdout.write(json.dumps(sheet_ranges))


def _export_one_sheet(wb, tmp: Path, sheets_dir: Path,
                      idx: str, safe_name: str, raw_name: str,
                      sheet_ranges: dict) -> None:
    """한 시트 데이터 영역 → PNG. sheet_ranges 에 (last_row, last_col) 기록."""
    ws = wb.Worksheets(raw_name)
    # xlSheetVisible=-1, xlSheetHidden=0, xlSheetVeryHidden=2
    # Hidden/VeryHidden 시트도 export 하려면 임시로 보이게.
    original_visible = getattr(ws, "Visible", -1)
    if original_visible != -1:
        ws.Visible = -1
    last_row = last_col = 0
    chart_w = chart_h = 0.0
    try:
        # 진짜 데이터(값) 가 있는 마지막 행·열을 Find 로 산출.
        # UsedRange 는 서식만 남은 빈 영역까지 포함 → 부적절.
        # xlFormulas=-4123, xlPart=2, xlByRows=1, xlByColumns=2, xlPrevious=2
        a1 = ws.Cells(1, 1)
        last_row_cell = ws.Cells.Find(
            What="*", After=a1, LookIn=-4123, LookAt=2,
            SearchOrder=1, SearchDirection=2, MatchCase=False,
        )
        last_col_cell = ws.Cells.Find(
            What="*", After=a1, LookIn=-4123, LookAt=2,
            SearchOrder=2, SearchDirection=2, MatchCase=False,
        )
        if last_row_cell is None or last_col_cell is None:
            return  # 빈 시트 → PNG skip, sheet_ranges 도 미기록
        last_row = last_row_cell.Row
        last_col = last_col_cell.Column
        sheet_ranges[raw_name] = (last_row, last_col)

        data_range = ws.Range(ws.Cells(1, 1), ws.Cells(last_row, last_col))
        # Range → 클립보드 EMF → 임시 ChartObject paste → Chart.Export("PNG").
        # xlScreen=1, xlPicture=-4147
        # Format=xlBitmap(2) 는 화면 픽셀 버퍼 캡처라 Excel.Visible=False headless 환경에서 빈/부분 비트맵 생성됨 → xlPicture(EMF) 사용.
        # EMF 는 메타파일 명령으로 시트 콘텐츠 직접 직렬화 → 화면 렌더 의존 없음.
        # ChartObject pt 그대로. PNG 는 시각/레이아웃용, 정확한 텍스트는 .md 가 책임.
        # 사이즈 키우면 큰 시트가 Chart.Export PNG dimension 16-bit cap (65535px) 에 걸림.
        chart_w = data_range.Width
        chart_h = data_range.Height
        try:
            data_range.CopyPicture(Appearance=1, Format=-4147)
            chart_obj = ws.ChartObjects().Add(0, 0, chart_w, chart_h)
            try:
                chart_obj.Activate()
                chart_obj.Chart.Paste()
                tmp_png = tmp / f"sheet_{idx}.png"
                chart_obj.Chart.Export(short_str(tmp_png), "PNG")
                if tmp_png.exists():
                    # long-path-safe copy
                    shutil.copy2(long_str(tmp_png), long_str(sheets_dir / f"{idx}_{safe_name}.png"))
            finally:
                chart_obj.Delete()
        except Exception as e:
            diag = [
                f"raw_name={raw_name!r}",
                f"type={getattr(ws, 'Type', '?')}",
                f"visible={original_visible}",
                f"last_row={last_row}, last_col={last_col}",
                f"chart_w_pt={chart_w:.1f}, chart_h_pt={chart_h:.1f}",
            ]
            for attr in ("ProtectContents", "ProtectDrawingObjects", "AutoFilterMode"):
                try:
                    diag.append(f"{attr}={getattr(ws, attr)}")
                except Exception as ee:
                    diag.append(f"{attr}_FAIL={ee}")
            try:
                diag.append(f"chartobj_count={ws.ChartObjects().Count}")
            except Exception as ee:
                diag.append(f"chartobj_count_FAIL={ee}")
            raise RuntimeError(
                "Excel sheet PNG export failed: "
                + " | ".join(diag)
                + f" | original_error={e}"
            ) from e
    finally:
        if original_visible != -1:
            ws.Visible = original_visible


# ====================================================================
# Convert legacy (.doc/.ppt/.xls/.xlsb → .docx/.pptx/.xlsx)
# ====================================================================

def cmd_convert_legacy(args) -> None:
    import pythoncom
    import win32com.client

    ext = args.ext.lower()
    input_path = Path(args.input)
    output_path = Path(args.output)

    pythoncom.CoInitialize()
    try:
        try:
            if ext == ".doc":
                app = win32com.client.DispatchEx("Word.Application")
                app.Visible = False
                app.DisplayAlerts = 0
                try:
                    doc = app.Documents.Open(short_str(input_path), ReadOnly=True)
                    try:
                        doc.RemovePersonalInformation = False
                        doc.SaveAs2(short_str(output_path), FileFormat=16)  # wdFormatDocumentDefault
                    finally:
                        doc.Close(SaveChanges=False)
                finally:
                    app.Quit()
            elif ext == ".ppt":
                app = win32com.client.DispatchEx("PowerPoint.Application")
                try:
                    pres = app.Presentations.Open(short_str(input_path), WithWindow=False)
                    try:
                        pres.RemovePersonalInformation = False
                        pres.SaveAs(short_str(output_path), FileFormat=24)  # ppSaveAsOpenXMLPresentation
                    finally:
                        pres.Close()
                finally:
                    app.Quit()
            elif ext in (".xls", ".xlsb"):
                app = win32com.client.DispatchEx("Excel.Application")
                app.Visible = False
                app.DisplayAlerts = False
                # 변환 시간 단축: 자동 매크로/이벤트/화면갱신 끔.
                app.ScreenUpdating = False
                app.EnableEvents = False
                app.AutomationSecurity = 3
                try:
                    wb = app.Workbooks.Open(short_str(input_path), ReadOnly=True)
                    try:
                        app.Calculation = -4135  # xlCalculationManual (워크북 열린 후만 가능)
                        wb.RemovePersonalInformation = False
                        wb.SaveAs(short_str(output_path), FileFormat=51)  # xlOpenXMLWorkbook
                    finally:
                        wb.Close(SaveChanges=False)
                finally:
                    app.Quit()
            else:
                raise ValueError(f"unsupported legacy ext: {ext}")
        except Exception as e:
            raise RuntimeError(
                f"convert_legacy failed: ext={ext!r} input={input_path.name!r} "
                f"output={output_path.name!r}: {e}"
            ) from e
    finally:
        pythoncom.CoUninitialize()


# ====================================================================
# main
# ====================================================================

def main() -> None:
    parser = argparse.ArgumentParser()
    subs = parser.add_subparsers(dest="cmd", required=True)

    p = subs.add_parser("word_pdf")
    p.add_argument("input")
    p.add_argument("output")

    p = subs.add_parser("ppt_png")
    p.add_argument("input")
    p.add_argument("out_dir")
    p.add_argument("slide_titles")

    p = subs.add_parser("excel_sheets")
    p.add_argument("input")
    p.add_argument("sheets_dir")
    p.add_argument("sheet_names")

    p = subs.add_parser("convert_legacy")
    p.add_argument("ext")
    p.add_argument("input")
    p.add_argument("output")

    args = parser.parse_args()

    if args.cmd == "word_pdf":
        cmd_word_pdf(args)
    elif args.cmd == "ppt_png":
        cmd_ppt_png(args)
    elif args.cmd == "excel_sheets":
        cmd_excel_sheets(args)
    elif args.cmd == "convert_legacy":
        cmd_convert_legacy(args)


if __name__ == "__main__":
    main()
