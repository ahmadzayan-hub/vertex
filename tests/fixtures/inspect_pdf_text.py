"""Extract, search and copy text from the downloaded PDF using PDFium."""

import json
import sys
from contextlib import closing

import pypdfium2 as pdfium
from pypdfium2 import raw


def inspect(path, queries):
    pages = []
    with pdfium.PdfDocument(path) as document:
        for page in document:
            with closing(page), closing(page.get_textpage()) as text_page:
                fonts = set()
                for text_object in page.get_objects(filter=[raw.FPDF_PAGEOBJ_TEXT]):
                    font = text_object.get_font()
                    fonts.add((font.get_base_name(), font.is_embedded))

                matches = {}
                for query in queries:
                    with closing(text_page.search(query, match_case=True)) as search:
                        match = search.get_next()
                    if match is not None:
                        matches[query] = text_page.get_text_range(*match, errors="strict")

                pages.append({
                    "text": text_page.get_text_range(errors="strict"),
                    "fonts": sorted(fonts),
                    "matches": matches,
                })
    return pages


if __name__ == "__main__":
    print(json.dumps(inspect(sys.argv[1], sys.argv[2:])))
