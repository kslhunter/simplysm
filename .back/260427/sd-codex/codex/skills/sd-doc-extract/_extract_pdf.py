"""PDF handler: extract text, tables, images, and attached files using PyMuPDF."""

import struct
from _common import ensure_packages

PACKAGES = {"pymupdf4llm": "pymupdf4llm", "pymupdf": "fitz"}


def extract(file_path):
    ensure_packages(PACKAGES)
    import fitz
    import pymupdf4llm

    # Text extraction per page (pymupdf4llm)
    page_chunks = pymupdf4llm.to_markdown(file_path, page_chunks=True)

    # Image extraction per page (fitz)
    images = []
    img_idx = 0
    doc = fitz.open(file_path)

    page_img_indices = {}  # page_num -> list of img_idx
    for page_num, page in enumerate(doc, 1):
        page_img_indices[page_num] = []
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            base_image = doc.extract_image(xref)
            if base_image is None:
                continue
            data = base_image["image"]
            ext = base_image.get("ext", "png")

            # Filter small mask/decorative images by checking PNG IHDR dimensions
            if data[:4] == b'\x89PNG' and len(data) >= 24:
                w = struct.unpack('>I', data[16:20])[0]
                h = struct.unpack('>I', data[20:24])[0]
                if w <= 4 or h <= 4:
                    continue

            # Get image position on page
            try:
                rects = page.get_image_rects(xref)
                if rects:
                    r = rects[0]
                    bbox_str = f" bbox:({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f})"
                else:
                    bbox_str = ""
            except Exception:
                bbox_str = ""

            img_idx += 1
            images.append({
                "data": data,
                "ext": ext,
                "context": f"Page {page_num}{bbox_str}",
            })
            page_img_indices[page_num].append(img_idx)

    # Build text with inline image markers per page
    text_parts = []
    if isinstance(page_chunks, list):
        for i, chunk in enumerate(page_chunks):
            page_num = i + 1
            page_text = chunk.get("text", str(chunk)) if isinstance(chunk, dict) else str(chunk)
            text_parts.append(page_text.rstrip())
            for idx in page_img_indices.get(page_num, []):
                text_parts.append(f"\n[IMG:{idx}]")
            text_parts.append("")
    else:
        # Fallback: non-chunked output
        text_parts.append(str(page_chunks))
        for idx in range(1, img_idx + 1):
            text_parts.append(f"[IMG:{idx}]")

    # Embedded file attachments (fitz)
    embedded = []
    emb_idx = 0
    if doc.embfile_count() > 0:
        for i in range(doc.embfile_count()):
            info = doc.embfile_info(i)
            data = doc.embfile_get(i)
            emb_idx += 1
            embedded.append({
                "filename": info.get("name", f"embedded_{i + 1}"),
                "data": data,
            })
            text_parts.append(f"[EMB:{emb_idx}]")

    # Also check PDF attachments via annotation-based attachments
    for page in doc:
        for annot in page.annots() or []:
            if annot.type[0] == fitz.PDF_ANNOT_FILE_ATTACHMENT:
                file_info = annot.get_file()
                if file_info:
                    emb_idx += 1
                    embedded.append({
                        "filename": file_info.get("filename", f"attachment_{len(embedded)}"),
                        "data": file_info.get("content", b""),
                    })
                    text_parts.append(f"[EMB:{emb_idx}]")

    doc.close()

    return {
        "text": "\n".join(text_parts),
        "images": images,
        "embedded": embedded,
        "metadata": {},
    }
