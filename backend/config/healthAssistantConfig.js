const HEALTH_CHAT_DISCLAIMER =
    'DocX Health Assistant shares general health guidance only. It cannot diagnose, prescribe, or replace urgent medical care.';

const STARTER_QUICK_REPLIES = [
    'I have a headache',
    'I have a fever',
    'I have a cough',
    'I have stomach pain',
];

const DEFAULT_QUICK_REPLIES = [
    'How long has this been happening?',
    'How severe is it?',
    'Any fever?',
    'Any breathing trouble?',
];

const FOLLOW_UP_PATTERNS = [
    /\bhow long\b/i,
    /\bhow severe\b/i,
    /\bwhat should i do\b/i,
    /\bany fever\b/i,
    /\bany breathing trouble\b/i,
    /\bis it urgent\b/i,
    /\bshould i see a doctor\b/i,
    /\bshould i book\b/i,
];

const HEALTH_TOPIC_PATTERNS = [
    /\b(symptom|symptoms|health|doctor|appointment|specialist|medicine|medication|prescription|pharmacy)\b/i,
    /\b(pain|ache|fever|cough|cold|flu|nausea|vomiting|diarrhea|constipation|rash|swelling|infection)\b/i,
    /\b(headache|migraine|dizziness|fatigue|weakness|fainting|palpitations|blood pressure|breathing|wheezing)\b/i,
    /\b(chest|heart|lung|throat|ear|nose|eye|vision|tooth|gum|skin|hair|stomach|abdomen|back|joint|bone)\b/i,
    /\b(allergy|sleep|stress|anxiety|depression|pregnancy|pregnant|period|menstrual|child|baby|wellness|diet|exercise)\b/i,
    /\b(side effect|reaction|drug interaction|missed dose|refill|tablet|capsule|cream|ointment|syrup)\b/i,
    /\b(lab|report|result|blood test|scan|mri|ct|x ray|x-ray|ultrasound|cbc|fbc|hba1c|cholesterol|ldl|hdl|triglycerides|thyroid|glucose|sugar)\b/i,
    /\b(diabetes|thyroid|asthma|eczema|acne|hypertension|bp|pressure|infection|vaccination|vaccine)\b/i,
];

const OFF_TOPIC_PATTERNS = [
    /\b(javascript|reactjs|python|node|html|css|sql|code|coding|programming|bug|debug|software)\b/i,
    /\b(movie|movies|music|song|songs|celebrity|actor|actress|anime|gaming|game|football|cricket|nba|score)\b/i,
    /\b(bitcoin|crypto|stocks|stock market|investment|finance|tax|loan|mortgage|salary)\b/i,
    /\b(recipe|cooking|flight|hotel|travel|tourism|shopping|amazon|iphone|laptop)\b/i,
    /\b(politics|election|president|prime minister|government|party)\b/i,
    /\b(joke|meme|poem|essay|assignment|homework|interview answer)\b/i,
];

const EMERGENCY_RULES = [
    {
        urgency: 'emergency',
        pattern: /\b(chest pain|chest pressure|tightness in chest)\b.*\b(shortness of breath|breathing trouble|pain in arm|jaw pain|sweating|fainting)\b/i,
        answer: 'Chest pain with breathing trouble, fainting, sweating, or pain spreading to the arm or jaw can be an emergency. Please seek emergency medical help right away.',
    },
    {
        urgency: 'emergency',
        pattern: /\b(face droop|facial droop|slurred speech|one sided weakness|one-sided weakness|sudden weakness|stroke symptoms)\b/i,
        answer: 'Sudden weakness, facial droop, or slurred speech can be signs of a stroke. Please get emergency medical help immediately.',
    },
    {
        urgency: 'emergency',
        pattern: /\b(severe bleeding|bleeding heavily|cannot stop bleeding|can\'t stop bleeding|vomiting blood|coughing blood)\b/i,
        answer: 'Heavy bleeding or vomiting or coughing blood needs urgent in-person emergency care. Please seek emergency medical help now.',
    },
    {
        urgency: 'emergency',
        pattern: /\b(unconscious|not waking up|passed out|seizure|convulsion)\b/i,
        answer: 'Loss of consciousness or a seizure needs emergency assessment. Please seek emergency medical help immediately.',
    },
    {
        urgency: 'emergency',
        pattern: /\b(suicidal|suicide|self harm|self-harm|kill myself|overdose)\b/i,
        answer: 'If you may harm yourself or someone else, please contact emergency services or an immediate crisis line right now and stay with a trusted person if possible.',
    },
    {
        urgency: 'emergency',
        pattern: /\b(anaphylaxis|severe allergic reaction|throat closing|swollen tongue|swollen throat)\b/i,
        answer: 'Trouble breathing or throat swelling during an allergic reaction can be life-threatening. Please seek emergency medical help immediately.',
    },
];

const HEALTH_SPECIALTIES = [
    {
        slug: 'cardiology',
        name: 'Cardiology',
        doctorFilter: 'cardiology',
        keywords: ['heart', 'chest pain', 'palpitations', 'blood pressure', 'cardio', 'cardiologist', 'cholesterol', 'ldl', 'hdl', 'triglycerides'],
    },
    {
        slug: 'neurology',
        name: 'Neurology',
        doctorFilter: 'neurology',
        keywords: ['headache', 'migraine', 'seizure', 'numbness', 'tremor', 'memory', 'dizziness', 'stroke'],
    },
    {
        slug: 'pediatrics',
        name: 'Pediatrics',
        doctorFilter: 'pediatrics',
        keywords: ['child', 'children', 'baby', 'infant', 'pediatric', 'pediatrics'],
    },
    {
        slug: 'dentistry',
        name: 'Dentistry',
        doctorFilter: 'dentistry',
        keywords: ['tooth', 'teeth', 'gum', 'dental', 'jaw pain', 'dentist'],
    },
    {
        slug: 'ophthalmology',
        name: 'Ophthalmology',
        doctorFilter: 'ophthalmology',
        keywords: ['eye', 'vision', 'blurred vision', 'eye pain', 'red eye', 'ophthalmology'],
    },
    {
        slug: 'orthopedics',
        name: 'Orthopedics',
        doctorFilter: 'orthopedics',
        keywords: ['bone', 'joint', 'back pain', 'knee pain', 'shoulder pain', 'fracture', 'orthopedic'],
    },
    {
        slug: 'pulmonology',
        name: 'Pulmonology',
        doctorFilter: 'pulmonology',
        keywords: ['lung', 'breathing', 'shortness of breath', 'wheezing', 'asthma', 'cough', 'respiratory'],
    },
    {
        slug: 'general-medicine',
        name: 'General Medicine',
        doctorFilter: 'general',
        keywords: ['fever', 'flu', 'cold', 'fatigue', 'general physician', 'primary care', 'general medicine'],
    },
    {
        slug: 'dermatology',
        name: 'Dermatology',
        doctorFilter: 'dermatology',
        keywords: ['skin', 'rash', 'itching', 'acne', 'hair', 'nail', 'dermatology'],
    },
    {
        slug: 'allergy-immunology',
        name: 'Allergy & Immunology',
        doctorFilter: 'allergy',
        keywords: ['allergy', 'allergies', 'hives', 'itchy eyes', 'sneezing', 'swelling', 'immunology'],
    },
    {
        slug: 'pharmacology',
        name: 'Pharmacology',
        doctorFilter: 'pharmacology',
        keywords: ['medicine', 'medication', 'drug reaction', 'side effect', 'refill', 'dose'],
    },
    {
        slug: 'pathology',
        name: 'Pathology',
        doctorFilter: 'pathology',
        keywords: ['lab result', 'biopsy', 'screening result', 'pathology', 'diagnostic result', 'blood report', 'cholesterol report', 'ldl', 'hdl', 'triglycerides'],
    },
    {
        slug: 'surgery',
        name: 'Surgery',
        doctorFilter: 'surgery',
        keywords: ['surgery', 'surgeon', 'post op', 'post-op', 'wound', 'lump'],
    },
    {
        slug: 'ent',
        name: 'ENT (Otolaryngology)',
        doctorFilter: 'ent',
        keywords: ['ear', 'nose', 'throat', 'sinus', 'hearing', 'hoarseness', 'ent'],
    },
    {
        slug: 'genetics',
        name: 'Genetics',
        doctorFilter: 'genetics',
        keywords: ['genetic', 'genetics', 'family history', 'inherited', 'prenatal'],
    },
];

const normalizeText = (value = '') =>
    value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const sanitizeQuickReplies = (replies = [], fallback = DEFAULT_QUICK_REPLIES) => {
    const cleaned = [...new Set(
        (Array.isArray(replies) ? replies : [])
            .filter((value) => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value && value.length <= 60)
    )];

    return cleaned.slice(0, 4).length ? cleaned.slice(0, 4) : fallback;
};

const isFollowUpMessage = (message = '') =>
    FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(message));

const isHealthTopic = (message = '', history = []) => {
    const normalizedMessage = normalizeText(message);

    if (!normalizedMessage) {
        return false;
    }

    if (HEALTH_TOPIC_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
        return true;
    }

    if (Array.isArray(history) && history.length > 0 && (isFollowUpMessage(normalizedMessage) || normalizedMessage.split(' ').length <= 4)) {
        return true;
    }

    return false;
};

const isClearlyOffTopic = (message = '', history = []) => {
    if (isHealthTopic(message, history)) {
        return false;
    }

    return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(message));
};

const detectEmergency = (message = '') => {
    const normalizedMessage = normalizeText(message);

    return EMERGENCY_RULES.find((rule) => rule.pattern.test(normalizedMessage)) || null;
};

const mapSpecialtySlugs = (slugs = []) => {
    const resolved = new Map();

    (Array.isArray(slugs) ? slugs : []).forEach((slug) => {
        const specialty = HEALTH_SPECIALTIES.find((item) => item.slug === slug);
        if (specialty) {
            resolved.set(specialty.slug, specialty);
        }
    });

    return [...resolved.values()];
};

const findSpecialtiesFromText = (text = '') => {
    const normalizedText = normalizeText(text);

    if (!normalizedText) {
        return [];
    }

    return HEALTH_SPECIALTIES.filter((specialty) =>
        specialty.keywords.some((keyword) => normalizedText.includes(normalizeText(keyword)))
    ).slice(0, 2);
};

const buildActions = ({ specialties = [], status = 'ok', urgency = 'routine' }) => {
    if (status === 'refused' || urgency === 'emergency') {
        return [];
    }

    if (!specialties.length) {
        return [
            { label: 'Find doctors', path: '/find-doctors' },
            { label: 'Browse specialties', path: '/services' },
        ];
    }

    const actions = [
        { label: `View ${specialties[0].name}`, path: `/specialties/${specialties[0].slug}` },
        {
            label: `Book ${specialties[0].name}`,
            path: `/find-doctors?specialty=${encodeURIComponent(specialties[0].doctorFilter)}`,
        },
    ];

    if (specialties[1]) {
        actions.push({
            label: `View ${specialties[1].name}`,
            path: `/specialties/${specialties[1].slug}`,
        });
    }

    return actions.slice(0, 3);
};

const buildSystemPrompt = ({ groundingSummary = '' } = {}) => {
    const specialtyGuide = HEALTH_SPECIALTIES.map((specialty) => `${specialty.slug}: ${specialty.name}`).join(', ');

    return `
You are the DocX Health Assistant.

Allowed scope:
- Symptoms, wellness questions, common-condition education, medication side effects, lab-result basics, prevention basics, and when to seek care
- Suggesting the most relevant DocX specialty from the allowed list
- Recommending the most relevant next DocX action using action hints only

Strict guardrails:
- Refuse unrelated topics
- Do not diagnose
- Do not prescribe medication
- Do not give medication dosing
- Do not promise treatment certainty
- Use possibility language such as "can", "may", or "could"
- Ask for 1 to 3 clarifying details first when important information is missing
- Keep answers calm, direct, and usually under 160 words
- If symptoms sound urgent, recommend prompt in-person medical care
- Never output raw URLs or paths

Public DocX grounding for this turn:
${groundingSummary || '- No additional grounded service facts were found for this turn.'}

Return JSON only with this exact shape:
{
  "status": "ok" | "refused" | "urgent",
  "mode": "guidance" | "follow_up" | "urgent" | "refused",
  "urgency": "routine" | "soon" | "urgent" | "emergency",
  "answer": "short plain-text answer",
  "specialtySlugs": ["allowed-slug"],
  "quickReplies": ["short follow-up question"],
  "actionHints": ["specialty_page" | "book_specialty" | "virtual_consult" | "pharmacy" | "digital_prescription" | "find_doctors"]
}

Specialty slugs you may use:
${specialtyGuide}

If the topic is unrelated, set status to "refused", urgency to "routine", specialtySlugs to [], and explain that you only answer health or symptom questions.
If a symptom sounds urgent or dangerous, set status to "urgent", mode to "urgent", and use urgency "urgent" or "emergency".
If more details are needed before stronger guidance, set mode to "follow_up" and make the answer itself ask for the most important missing detail.
If giving normal guidance, set mode to "guidance".
`;
};

module.exports = {
    HEALTH_SPECIALTIES,
    HEALTH_CHAT_DISCLAIMER,
    STARTER_QUICK_REPLIES,
    DEFAULT_QUICK_REPLIES,
    buildActions,
    buildSystemPrompt,
    detectEmergency,
    findSpecialtiesFromText,
    isClearlyOffTopic,
    mapSpecialtySlugs,
    sanitizeQuickReplies,
};
