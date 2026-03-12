# GST Manager Pro

## Current State
OCRCapture.tsx dynamically imports `pdfjs-dist` and uses `tesseract.js` for OCR, but neither package is listed in package.json dependencies. The PDF.js worker setup uses a `?url` import that fails at runtime. This causes OCR to fail for all PDFs and images with a generic error message.

## Requested Changes (Diff)

### Add
- `tesseract.js` and `pdfjs-dist` as proper package.json dependencies
- Real progress bar with page-by-page status during OCR
- Detailed error surfacing showing actual failure reason
- Retry button without re-uploading the file

### Modify
- OCRCapture.tsx: Fix PDF.js worker initialization using CDN URL instead of broken `?url` import
- OCRCapture.tsx: Improve robustness of PDF-to-canvas pipeline
- OCRCapture.tsx: Add image pre-processing (grayscale + contrast boost) for better accuracy
- OCRCapture.tsx: Show actual error reason in UI instead of generic message
- package.json: Add `tesseract.js` and `pdfjs-dist` dependencies

### Remove
- Broken `pdfjs-dist/build/pdf.worker.mjs?url` import pattern

## Implementation Plan
1. Add `tesseract.js@^5.0.0` and `pdfjs-dist@^4.0.0` to package.json
2. Rewrite pdfToCanvas() using CDN worker URL for PDF.js
3. Add canvas pre-processing (grayscale) before Tesseract
4. Add per-page progress tracking for multi-page PDFs
5. Surface actual error message in UI with retry capability
6. Add retry state so user can retry without re-uploading
