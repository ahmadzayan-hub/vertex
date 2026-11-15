# VERTEX Arabic PDF text verification

The Playwright spec downloads both project and submission reports from the production PDF generator. The browser fixture uses the application translations and synthetic records. It blocks and detects requests to external origins.

```sh
npm ci
npm run e2e:install
python3 -m pip install pypdfium2==5.13.0
npm run e2e -- tests/e2e/pdf-report-text.spec.ts
```

PDFium searches for the original fixture values in the downloaded file and copies each match by character range. The spec compares the resulting Unicode, allowing direction marks, canonical Unicode equivalence, and layout whitespace. It checks the fonts actually used by text objects on every page, rejects replacement characters and Arabic presentation forms in the Arabic output, and checks the footer on each page. English project and submission exports run in the same spec.

The Arabic renderer uses Noto Sans Arabic, HarfBuzz for joins, ligatures and mark placement, and the Unicode Bidirectional Algorithm for mixed text. The generated PDF includes a `ToUnicode` map and `ActualText` for the original line. The browser loads the shaping engine on the first Arabic export.

Reader-specific processing can affect the order of mixed or right-to-left text returned by extraction. The test verifies PDFium extraction, search, and copy. The authenticated Supabase end-to-end spec is a separate check and requires the test project described in [follow-ups](FOLLOWUPS.md).
