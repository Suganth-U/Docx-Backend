import xml.etree.ElementTree as ET

tree = ET.parse('unzipped/word/document.xml')
root = tree.getroot()
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def get_text(element):
    return ''.join(element.itertext())

paragraphs = root.findall('.//w:p', namespaces)
for i in range(30):
    text = get_text(paragraphs[i]).strip()
    if text:
        print(f"Paragraph {i}: {text}")
