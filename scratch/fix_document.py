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

for i, p in enumerate(paragraphs):
    text = get_text(p).strip()
    
    # FIX 1: Cover Page fixes
    if text == "Center of Open and Distance Learning":
        # Replace with Faculty of Information Technology
        for t in p.findall('.//w:t', namespaces):
            if "Center of Open and Distance Learning" in t.text:
                t.text = t.text.replace("Center of Open and Distance Learning", "Faculty of Information Technology")
                
    if text == "Sri Lanka":
        # We need to insert the mandatory text after this, or maybe replace "Sri Lanka" with "Sri Lanka" and then a new paragraph
        # Let's find "June 2026"
        pass
        
    if text == "June 2026":
        # Insert the mandatory text BEFORE "June 2026"
        idx = list(body).index(p)
        
        # Check if already added
        prev_p_text = get_text(list(body)[idx-1]).strip()
        if "Dissertation submitted" not in prev_p_text:
            new_p = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
            pPr = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
            jc = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}jc')
            jc.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', 'center')
            pPr.append(jc)
            new_p.append(pPr)
            
            r = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
            t = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
            t.text = "Dissertation submitted to the Faculty of Information Technology, University of Moratuwa, Sri Lanka in partial fulfillment of the requirements of the Degree of Bachelor of Information Technology(External) in Information Technology."
            r.append(t)
            new_p.append(r)
            
            body.insert(idx, new_p)

    # FIX 2: Abstract Abbreviations
    if "Electronic Health Record (EHR)" in text and "Abstract" not in get_text(paragraphs[i-1]):
        # Just searching for the specific abstract paragraphs
        # The abstract might be around the beginning
        if i < 100:
            for t in p.findall('.//w:t', namespaces):
                if "Electronic Health Record (EHR)" in t.text:
                    t.text = t.text.replace("Electronic Health Record (EHR)", "Electronic Health Record")
                if "Role-Based Access Control (RBAC)" in t.text:
                    t.text = t.text.replace("Role-Based Access Control (RBAC)", "Role-Based Access Control")
                if "JSON Web Tokens (JWT)" in t.text:
                    t.text = t.text.replace("JSON Web Tokens (JWT)", "JSON Web Tokens")
                if "MERN stack (MongoDB, Express.js, React and Node.js)" in t.text:
                    t.text = t.text.replace("MERN stack (MongoDB, Express.js, React and Node.js)", "modern stack (MongoDB, Express, React and Node)")

    # FIX 3: Chapter Summaries
    if "2.4.1 Summary of Comparative Findings" in text:
        for t in p.findall('.//w:t', namespaces):
            if "2.4.1 Summary of Comparative Findings" in t.text:
                t.text = t.text.replace("2.4.1 Summary of Comparative Findings", "2.5 Summary")

    if "8.5 Final Thoughts" in text:
        for t in p.findall('.//w:t', namespaces):
            if "8.5 Final Thoughts" in t.text:
                t.text = t.text.replace("8.5 Final Thoughts", "8.5 Summary")

    # FIX 4: Uncited Figures
    if "The following figures demonstrate the final user interfaces" in text:
        for t in p.findall('.//w:t', namespaces):
            if "The following figures demonstrate the final user interfaces" in t.text:
                t.text = t.text.replace("The following figures demonstrate the final user interfaces", "The following figures (Figure 19 to Figure 53) demonstrate the final user interfaces")

tree.write('unzipped/word/document.xml', xml_declaration=True, encoding='UTF-8', method='xml')
print("Document updated successfully.")
