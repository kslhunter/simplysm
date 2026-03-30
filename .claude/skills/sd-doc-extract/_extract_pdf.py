"""PDF handler: extract text, tables, images, and attached files using PyMuPDF."""

import struct
from _common import ensure_packages

PACKAGES = {"pymupdf4llm": "pymupdf4llm", "pymupdf": "fitz"}


def extract(file_path):
    ensure_packages(PACKAGES)
    import fitz
    import pymupdf4llm

    # Text + table extraction (pymupdf4llm)
    md_text = pymupdf4llm.to_markdown(file_path)

    # Image extraction (fitz)
    images = []
    doc = fitz.open(file_path)
    for page_num, page in enumerate(doc, 1):
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

            images.append({
                "data": data,
                "ext": ext,
                "context": f"Page {page_num}",
            })

    # Embedded file attachments (fitz)
    embedded = []
    if doc.embfile_count() > 0:
        for i in range(doc.embfile_count()):
            info = doc.embfile_info(i)
            data = doc.embfile_get(i)
            embedded.append({
                "filename": info.get("name", f"embedded_{i + 1}"),
                "data": data,
            })

    # Also check PDF attachments via annotation-based attachments
    for page in doc:
        for annot in page.annots() or []:
            if annot.type[0] == fitz.PDF_ANNOT_FILE_ATTACHMENT:
                file_info = annot.get_file()
                if file_info:
                    embedded.append({
                        "filename": file_info.get("filename", f"attachment_{len(embedded) + 1}"),
                        "data": file_info.get("content", b""),
                    })

    doc.close()

    return {
        "text": md_text,
        "images": images,
        "embedded": embedded,
        "metadata": {},
    }
