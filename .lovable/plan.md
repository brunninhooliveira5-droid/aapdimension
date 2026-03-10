

## Plan: Align Client Signature Height with Technician Signature

### Problem
The client signature in the PDF uses its own aspect ratio scaling independently, causing it to render larger than the technician signature and misaligning the two columns.

### Solution
In `src/lib/technical-report-pdf.ts`, calculate the technician signature's actual rendered height first, then constrain the client signature to the **same height**. If no technician signature exists, use a fixed default (e.g. 25mm).

### Changes

**`src/lib/technical-report-pdf.ts`** (lines 260-270):
- Track the technician signature's rendered height (`techSigH`)
- Use that same height as `cSigMaxH` for the client signature instead of `signatureOpts?.signatureSize || 35`

```typescript
// After technician signature is drawn, store its height
let techSigH = 15; // default fallback
// ... in tech sig block: techSigH = sigH;

// Client signature uses same max height
const cSigMaxH = techSigH; // match technician height
const cRatio = Math.min(cSigMaxW / clientImg.width, cSigMaxH / clientImg.height);
```

This ensures both signatures occupy the same vertical space and the lines align horizontally.

