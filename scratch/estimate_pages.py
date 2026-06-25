import xml.etree.ElementTree as ET
import re

tree = ET.parse('unzipped/word/document.xml')
root = tree.getroot()
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def get_text(element):
    return ''.join(element.itertext())

paragraphs = root.findall('.//w:p', namespaces)

# 1. Extract TOC mapping from bookmark name to page number
toc_pages = {}
for p in paragraphs:
    text = get_text(p).strip()
    # Looking for lines like "CHAPTER 01 PAGEREF _Toc230462589 \h 1"
    match = re.search(r'PAGEREF\s+(_Toc\d+)\s+\\h\s+(\d+)', text)
    if match:
        toc_pages[match.group(1)] = int(match.group(2))

# 2. Find paragraph index for each bookmark
bookmark_paragraphs = {}
for i, p in enumerate(paragraphs):
    for bm in p.findall('.//w:bookmarkStart', namespaces):
        name = bm.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}name')
        if name in toc_pages:
            bookmark_paragraphs[name] = i

# Create a list of (para_idx, page_num) sorted by para_idx
points = []
for name, idx in bookmark_paragraphs.items():
    points.append((idx, toc_pages[name]))
points.sort()

def estimate_page(para_idx):
    if not points:
        return 1
    if para_idx <= points[0][0]:
        return points[0][1]
    if para_idx >= points[-1][0]:
        # Extrapolate slightly or just use the last
        last_idx, last_page = points[-1]
        return last_page + (para_idx - last_idx) // 10  # rough guess
        
    for i in range(len(points) - 1):
        idx1, p1 = points[i]
        idx2, p2 = points[i+1]
        if idx1 <= para_idx <= idx2:
            if idx1 == idx2:
                return p1
            # Linear interpolation
            fraction = (para_idx - idx1) / (idx2 - idx1)
            page = p1 + fraction * (p2 - p1)
            return int(round(page))
    return 1

# 3. Find figures and tables
print("Figures:")
for i, p in enumerate(paragraphs):
    text = get_text(p).strip()
    if text.startswith('Figure ') or text.startswith('Table '):
        if 'PAGEREF' in text or 'TOC' in text:
            continue
        # Check if it has SEQ
        has_seq = False
        for instr in p.findall('.//w:instrText', namespaces):
            if instr.text and 'SEQ' in instr.text:
                has_seq = True
        
        # We know we replaced the number with SEQ field
        if has_seq or re.match(r'^(Figure|Table)\s+\d+\s*:', text):
            # Clean up the text for printing
            clean_text = re.sub(r'\s+', ' ', text)
            print(f"Para {i} -> Page {estimate_page(i)}: {clean_text}")
