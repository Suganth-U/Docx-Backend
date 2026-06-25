import xml.etree.ElementTree as ET
import re

tree = ET.parse('unzipped/word/document.xml')
root = tree.getroot()
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
ET.register_namespace('w', namespaces['w'])

def get_text(element):
    return ''.join(element.itertext())

body = root.find('w:body', namespaces)
paragraphs = list(body.findall('w:p', namespaces))

# 1. Estimate Pages
toc_pages = {}
for p in paragraphs:
    text = get_text(p).strip()
    match = re.search(r'PAGEREF\s+(_Toc\d+)\s+\\h\s+(\d+)', text)
    if match:
        toc_pages[match.group(1)] = int(match.group(2))

bookmark_paragraphs = {}
for i, p in enumerate(paragraphs):
    for bm in p.findall('.//w:bookmarkStart', namespaces):
        name = bm.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}name')
        if name in toc_pages:
            bookmark_paragraphs[name] = i

points = []
for name, idx in bookmark_paragraphs.items():
    points.append((idx, toc_pages[name]))
points.sort()

def estimate_page(para_idx):
    if not points: return 1
    if para_idx <= points[0][0]: return points[0][1]
    if para_idx >= points[-1][0]:
        last_idx, last_page = points[-1]
        return last_page + (para_idx - last_idx) // 10
    for i in range(len(points) - 1):
        idx1, p1 = points[i]
        idx2, p2 = points[i+1]
        if idx1 <= para_idx <= idx2:
            if idx1 == idx2: return p1
            fraction = (para_idx - idx1) / (idx2 - idx1)
            page = p1 + fraction * (p2 - p1)
            return int(round(page))
    return 1

# 2. Extract figures and tables
figures = []
tables = []
for i, p in enumerate(paragraphs):
    text = get_text(p).strip()
    # Check if it has SEQ or if it starts with Figure/Table and a number
    has_seq = False
    for instr in p.findall('.//w:instrText', namespaces):
        if instr.text and 'SEQ' in instr.text:
            has_seq = True
    
    if text.startswith('Figure ') or text.startswith('Table '):
        if 'PAGEREF' in text or 'TOC' in text:
            continue
        if has_seq or re.match(r'^(Figure|Table)\s+\d+\s*:', text):
            clean_text = re.sub(r'\s+', ' ', text)
            pg = estimate_page(i)
            if clean_text.startswith('Figure'):
                figures.append((clean_text, pg))
            elif clean_text.startswith('Table'):
                tables.append((clean_text, pg))

# 3. Remove the dynamic TOC fields
to_remove = []
for p in paragraphs:
    text = get_text(p).strip()
    if "Please right-click and update this field" in text:
        to_remove.append(p)
for p in to_remove:
    body.remove(p)

paragraphs = list(body.findall('w:p', namespaces))

def create_toc_item(text, page):
    p = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
    pPr = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
    pStyle = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pStyle')
    pStyle.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', 'TOC1')
    
    tabs = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tabs')
    tab = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tab')
    tab.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', 'right')
    tab.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}leader', 'dot')
    tab.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pos', '9350')
    tabs.append(tab)
    
    pPr.append(pStyle)
    pPr.append(tabs)
    p.append(pPr)
    
    r1 = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
    t1 = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
    t1.text = text
    r1.append(t1)
    
    r_tab = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
    r_tab.append(ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tab'))
    
    r2 = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
    t2 = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
    t2.text = str(page)
    r2.append(t2)
    
    p.append(r1)
    p.append(r_tab)
    p.append(r2)
    return p

# 4. Insert hardcoded list
for i, p in enumerate(paragraphs):
    text = get_text(p).strip()
    if text == "List of Figures":
        idx = list(body).index(p)
        for f in reversed(figures):
            body.insert(idx + 1, create_toc_item(f[0], f[1]))
    elif text == "List of Tables" or text == "List of Table":
        idx = list(body).index(p)
        for t in reversed(tables):
            body.insert(idx + 1, create_toc_item(t[0], t[1]))

tree.write('unzipped/word/document.xml', xml_declaration=True, encoding='UTF-8', method='xml')
print("Hardcoded list generated.")
