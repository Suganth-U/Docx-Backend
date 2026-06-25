import xml.etree.ElementTree as ET

tree = ET.parse('unzipped/word/document.xml')
root = tree.getroot()
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def get_text(element):
    return ''.join(element.itertext())

paragraphs = root.findall('.//w:p', namespaces)
for p in paragraphs:
    text = get_text(p).strip()
    if text == "List of Table":
        # Find the text node that contains "Table"
        for t in p.findall('.//w:t', namespaces):
            if t.text and 'Table' in t.text:
                t.text = t.text.replace('Table', 'Tables')

tree.write('unzipped/word/document.xml', xml_declaration=True, encoding='UTF-8', method='xml')
print("Fixed spelling")
