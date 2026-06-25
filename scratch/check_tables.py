import xml.etree.ElementTree as ET

tree = ET.parse('unzipped/word/document.xml')
root = tree.getroot()
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def get_text(element):
    return ''.join(element.itertext())

paragraphs = root.findall('.//w:p', namespaces)
for i, p in enumerate(paragraphs):
    text = get_text(p).strip()
    if 'TOC' in text or 'List of' in text or text.startswith('Figure ') or text.startswith('Table '):
        print(f"Paragraph {i}: {text[:80]}")
