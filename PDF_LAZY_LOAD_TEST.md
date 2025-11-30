# PDF Lazy Loading Test Plan

## Test Date: November 30, 2025
## Tester: _______________
## Browser: _______________

---

## What We're Testing

The PDF libraries (jsPDF + html2canvas, ~535KB) should now load **only when needed** instead of on every page load.

### Expected Behavior
1. **Initial page load** - PDF libraries NOT loaded
2. **Click "Download PDF"** - Libraries load dynamically (2-3 second delay first time)
3. **Second PDF export** - No delay (libraries cached)

---

## Test Locations

### 1. Simulation Guide (Instructor View)
**Path:** Simulation Manager → "Guide" button (top right)

**Steps:**
1. ✅ Navigate to Simulation Manager
2. ✅ Click "Guide" or "Instructor Guide" button
3. ✅ Page loads normally (no PDF libraries yet)
4. ✅ Click "Download PDF" button
5. ✅ **Expect:** Loading indicator appears
6. ✅ **Expect:** PDF downloads after 2-3 seconds
7. ✅ Click "Download PDF" again
8. ✅ **Expect:** Faster response (cached)

**Network Tab Verification:**
- Check browser DevTools → Network tab
- Filter by "chunk" or "vendor-pdf"
- Should see `vendor-pdf-[hash].js` load ONLY when clicking download

---

### 2. Student Quick Intro
**Path:** Patient Dashboard → "?" or Info button (if visible)

**Steps:**
1. ✅ Navigate to any patient dashboard
2. ✅ Open student guide/quick intro (if accessible)
3. ✅ Page loads normally
4. ✅ Click "Download PDF" button
5. ✅ **Expect:** Loading indicator
6. ✅ **Expect:** PDF downloads after 2-3 seconds

---

### 3. Debrief Report Export
**Path:** Simulation Manager → Complete Simulation → View Debrief

**Steps:**
1. ✅ Navigate to simulation history/debrief
2. ✅ Open a debrief report
3. ✅ Report displays normally
4. ✅ Click "Export to PDF" or download button
5. ✅ **Expect:** Loading overlay
6. ✅ **Expect:** PDF generates and downloads

---

## Browser DevTools Checklist

### Before Clicking Any PDF Button:
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Filter by "js" or "vendor"
- [ ] Refresh page
- [ ] **Verify:** No `vendor-pdf` chunk loaded
- [ ] **Verify:** Only see vendor-react, vendor-supabase, main, etc.

### After Clicking PDF Button (First Time):
- [ ] **Verify:** New network request for `vendor-pdf-[hash].js` (535KB)
- [ ] **Verify:** Takes 1-3 seconds to load
- [ ] **Verify:** PDF generation starts after library loads

### After Clicking PDF Button (Second Time):
- [ ] **Verify:** No new network request for vendor-pdf
- [ ] **Verify:** Uses cached version (from memory)
- [ ] **Verify:** Faster response

---

## Success Criteria

✅ **PASS:** PDF libraries only load when user clicks download  
✅ **PASS:** Libraries cached after first use  
✅ **PASS:** No errors in console  
✅ **PASS:** PDFs generate successfully  
✅ **PASS:** Initial page load doesn't include PDF libraries  

❌ **FAIL:** PDF libraries load on every page  
❌ **FAIL:** Errors when clicking download  
❌ **FAIL:** PDF doesn't generate  

---

## Test Results

### Test 1: Simulation Guide
- Initial Load: ⬜ PASS / ⬜ FAIL
- First PDF Export: ⬜ PASS / ⬜ FAIL
- Second PDF Export: ⬜ PASS / ⬜ FAIL
- Notes: ________________________________

### Test 2: Student Quick Intro
- Initial Load: ⬜ PASS / ⬜ FAIL
- PDF Export: ⬜ PASS / ⬜ FAIL
- Notes: ________________________________

### Test 3: Debrief Report
- Initial Load: ⬜ PASS / ⬜ FAIL
- PDF Export: ⬜ PASS / ⬜ FAIL
- Notes: ________________________________

---

## Known Issues / Notes

_Document any issues found during testing:_

---

## Bundle Size Verification

Before optimization:
- Main chunk: 1,844KB
- Simulation chunk: 1,748KB

After optimization (expected):
- vendor-react: 991KB
- vendor-pdf: 535KB (lazy loaded)
- main: 208KB
- 14 other smaller chunks

**Actual results:**
- Total chunks loaded initially: _____
- vendor-pdf loaded initially: ⬜ YES / ⬜ NO
- vendor-pdf size: _____ KB

---

## Conclusion

Overall Result: ⬜ PASS / ⬜ FAIL

Recommendations:
- [ ] Ready for production
- [ ] Needs fixes (list below)
- [ ] Retest required

---

**Tester Signature:** _______________  
**Date:** _______________
