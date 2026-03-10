

## Plan: Signature Darkness/Opacity Control + Zoom Preview Fix

### What to do

1. **Database**: Add `signature_darkness` column (integer, default 100, range 50-200) to `profiles` table via migration.

2. **SettingsPage.tsx**:
   - Add `signatureDarkness` state (default 100), load/save from profile.
   - Add a "Intensidade da Cor" slider (50% to 200%) in the signature config section.
   - Apply CSS `filter: contrast(${darkness/100})` on the preview image so the user sees the effect live alongside zoom/position.
   - Ensure the zoom slider change is visually reflected in the preview (it already applies `scale()` — verify it works correctly).

3. **PDF Generation (`technical-report-pdf.ts`)**:
   - Add `signatureDarkness` to `SignatureOptions`.
   - Before adding the signature image to the PDF, draw it onto an offscreen canvas with adjusted contrast/brightness to darken or lighten it, then use that processed image.

4. **Data passing** (`TechnicalReportForm.tsx`, `TechnicalReportsList.tsx`):
   - Fetch `signature_darkness` from profile and pass it in `signatureOpts`.

### Technical Detail

For PDF darkening, use a canvas approach:
```typescript
// Draw image, then overlay with multiply blend or adjust pixel data
ctx.filter = `contrast(${darkness/100}) brightness(${Math.min(1, 200/darkness)})`;
ctx.drawImage(img, 0, 0);
```

The preview will use CSS filter: `filter: contrast(${signatureDarkness / 100})` for instant feedback.

