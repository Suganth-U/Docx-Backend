const axios = require('axios');
const Doctor = require('../models/Doctor');
const DoctorVirtualSchedule = require('../models/DoctorVirtualSchedule');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const assistantNavigationMap = require('../shared/assistantNavigationMap.json');
const {
    HEALTH_CHAT_DISCLAIMER,
    HEALTH_SPECIALTIES,
    STARTER_QUICK_REPLIES,
    DEFAULT_QUICK_REPLIES,
    buildSystemPrompt,
    detectEmergency,
    findSpecialtiesFromText,
    isClearlyOffTopic,
    mapSpecialtySlugs,
    sanitizeQuickReplies,
} = require('../config/healthAssistantConfig');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DOCTOR_SEARCH_DEFAULTS = assistantNavigationMap.doctorSearchDefaults || {
    availability: 'open',
    sort: 'next-available',
};
const PHARMACY_CATEGORY_MAPPINGS = assistantNavigationMap.pharmacyCategoryMappings || [];
const SYMPTOM_RECOMMENDATION_MAPPINGS = assistantNavigationMap.symptomRecommendationMappings || [];
const QUERY_ONLY_SPECIALTY_SLUGS = new Set(
    assistantNavigationMap.queryOnlySpecialtySlugs || []
);
const MODE_VALUES = ['guidance', 'follow_up', 'urgent', 'refused'];
const ACTION_HINT_VALUES = [
    'specialty_page',
    'book_specialty',
    'virtual_consult',
    'pharmacy',
    'digital_prescription',
    'find_doctors',
];
const STOP_WORDS = new Set([
    'about',
    'after',
    'again',
    'also',
    'been',
    'before',
    'does',
    'from',
    'have',
    'just',
    'main',
    'more',
    'pain',
    'that',
    'there',
    'this',
    'what',
    'when',
    'with',
    'your',
]);
const MEDICATION_CONTEXT_PATTERN =
    /\b(medicine|medication|drug|tablet|capsule|cream|ointment|syrup|side effect|reaction|prescription|refill|dose|pharmacy)\b/i;
const PRESCRIPTION_CONTEXT_PATTERN =
    /\b(prescription|refill|repeat medicine|digital prescription|pharmacy order)\b/i;
const VIRTUAL_CONTEXT_PATTERN =
    /\b(virtual|video|online consult|online consultation|telemedicine|zoom call)\b/i;
const BOOKING_CONTEXT_PATTERN =
    /\b(book|appointment|doctor|specialist|consult|clinic|hospital)\b/i;
const LAB_CONTEXT_PATTERN =
    /\b(lab|report|result|blood test|cbc|fbc|hba1c|cholesterol|thyroid|scan|mri|ct|x ray|x-ray|ultrasound|glucose|sugar)\b/i;

const GEMINI_RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        status: {
            type: 'STRING',
            enum: ['ok', 'refused', 'urgent'],
        },
        mode: {
            type: 'STRING',
            enum: MODE_VALUES,
        },
        urgency: {
            type: 'STRING',
            enum: ['routine', 'soon', 'urgent', 'emergency'],
        },
        answer: {
            type: 'STRING',
        },
        specialtySlugs: {
            type: 'ARRAY',
            items: {
                type: 'STRING',
            },
        },
        quickReplies: {
            type: 'ARRAY',
            items: {
                type: 'STRING',
            },
        },
        actionHints: {
            type: 'ARRAY',
            items: {
                type: 'STRING',
                enum: ACTION_HINT_VALUES,
            },
        },
    },
    required: ['status', 'mode', 'urgency', 'answer', 'specialtySlugs', 'quickReplies', 'actionHints'],
};

const normalizeSearchText = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeSpecialtyTerm = (value = '') =>
    normalizeSearchText(value)
        .replace(/\b(consultant|specialist|medicine|medical)\b/g, ' ')
        .replace(/(ologist|ology|iatrist|iatry|ician|icians|logist|ics|ic|ist|ian|ry)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const matchesSpecialtyQuery = (doctorSpecialty = '', query = '') => {
    const left = normalizeSearchText(doctorSpecialty);
    const right = normalizeSearchText(query);

    if (!right) return true;
    if (left.includes(right) || right.includes(left)) return true;

    const normalizedLeft = normalizeSpecialtyTerm(left);
    const normalizedRight = normalizeSpecialtyTerm(right);

    return Boolean(
        normalizedLeft &&
            normalizedRight &&
            (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    );
};

const escapeRegex = (value = '') =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uniqueBy = (items = [], getKey = (item) => item) => {
    const seen = new Set();
    const nextItems = [];

    items.forEach((item) => {
        const key = getKey(item);
        if (!key || seen.has(key)) {
            return;
        }

        seen.add(key);
        nextItems.push(item);
    });

    return nextItems;
};

const extractSearchTokens = (text = '') =>
    uniqueBy(
        normalizeSearchText(text)
            .split(' ')
            .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
            .slice(0, 8)
    );

const normalizeDisplayText = (value = '') =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const buildDoctorSearchPath = ({
    specialty = '',
    keyword = '',
    availability = DOCTOR_SEARCH_DEFAULTS.availability,
    sort = DOCTOR_SEARCH_DEFAULTS.sort,
} = {}) => {
    const params = new URLSearchParams();

    if (specialty) {
        params.set('specialty', specialty);
    }

    if (keyword) {
        params.set('keyword', normalizeDisplayText(keyword).slice(0, 80));
    }

    if (availability) {
        params.set('availability', availability);
    }

    if (sort) {
        params.set('sort', sort);
    }

    const search = params.toString();
    return `/find-doctors${search ? `?${search}` : ''}`;
};

const buildPharmacySearchPath = ({
    query = '',
    category = '',
    rxOnly = false,
} = {}) => {
    const params = new URLSearchParams();

    if (query) {
        params.set('q', normalizeDisplayText(query).slice(0, 90));
    }

    if (category) {
        params.set('category', category);
    }

    if (rxOnly) {
        params.set('rx', '1');
    }

    const search = params.toString();
    return `/pharmacy${search ? `?${search}` : ''}`;
};

const normalizeAssistantActions = ({
    actions = [],
    specialties = [],
    grounding = null,
} = {}) => {
    if (!Array.isArray(actions) || actions.length === 0) {
        return [];
    }

    const primarySpecialty =
        specialties[0] || findSpecialtyBySlug(grounding?.specialtyStats?.[0]?.slug || '');
    const pharmacyNavigation = grounding
        ? inferPharmacyNavigation({
            text: grounding.combinedText,
            specialties,
            grounding,
        })
        : null;

    return actions.map((action) => {
        const nextAction = {
            ...action,
        };
        const rawPath = String(action?.path || '');
        const queryString = rawPath.includes('?') ? rawPath.split('?')[1] : '';
        const params = new URLSearchParams(queryString);

        if (action?.type === 'booking' || action?.type === 'directory' || rawPath.startsWith('/find-doctors')) {
            nextAction.path = buildDoctorSearchPath({
                specialty: params.get('specialty') || (action?.type === 'booking' ? primarySpecialty?.slug || '' : ''),
                keyword: params.get('keyword') || '',
                availability: params.get('availability') || DOCTOR_SEARCH_DEFAULTS.availability,
                sort: params.get('sort') || DOCTOR_SEARCH_DEFAULTS.sort,
            });
        }

        if (action?.type === 'pharmacy' || rawPath.startsWith('/pharmacy')) {
            const nextNavigation = {
                query: params.get('q') || pharmacyNavigation?.query || '',
                category: params.get('category') || pharmacyNavigation?.category || '',
                rxOnly: params.get('rx') === '1' || Boolean(pharmacyNavigation?.rxOnly),
                symptomLabel: pharmacyNavigation?.symptomLabel || '',
            };

            nextAction.path = buildPharmacySearchPath(nextNavigation);

            if (!action?.label || /matching pharmacy|search pharmacy/i.test(action.label)) {
                nextAction.label = pharmacyNavigation?.exactMedicineName
                    ? `Search ${pharmacyNavigation.exactMedicineName}`
                    : nextNavigation.symptomLabel
                        ? `See medicines for ${nextNavigation.symptomLabel}`
                    : nextNavigation.category
                        ? `Browse ${nextNavigation.category}`
                        : 'Search pharmacy';
            }
        }

        return nextAction;
    });
};

const findMatchingPharmacyMapping = ({
    text = '',
    specialties = [],
} = {}) => {
    const specialtySlugs = new Set(
        (Array.isArray(specialties) ? specialties : [])
            .map((specialty) => specialty?.slug)
            .filter(Boolean)
    );

    if ([...specialtySlugs].some((slug) => QUERY_ONLY_SPECIALTY_SLUGS.has(slug))) {
        return null;
    }

    const normalizedText = normalizeSearchText(text);
    let bestMatch = null;
    let bestScore = 0;

    PHARMACY_CATEGORY_MAPPINGS.forEach((mapping) => {
        const specialtyScore = (mapping.specialtySlugs || []).some((slug) =>
            specialtySlugs.has(slug)
        )
            ? 3
            : 0;
        const termMatches = (mapping.terms || []).filter((term) =>
            normalizedText.includes(normalizeSearchText(term))
        );
        const score = specialtyScore + termMatches.length;

        if (score > bestScore) {
            bestMatch = mapping;
            bestScore = score;
        }
    });

    return bestMatch;
};

const findSymptomRecommendation = ({
    text = '',
    specialties = [],
} = {}) => {
    const normalizedText = normalizeSearchText(text);
    if (!normalizedText) {
        return null;
    }

    const specialtySlugs = new Set(
        (Array.isArray(specialties) ? specialties : [])
            .map((specialty) => specialty?.slug)
            .filter(Boolean)
    );

    let bestMatch = null;
    let bestScore = 0;

    SYMPTOM_RECOMMENDATION_MAPPINGS.forEach((mapping) => {
        const termMatches = (mapping.terms || []).filter((term) =>
            normalizedText.includes(normalizeSearchText(term))
        );
        const specialtyScore = (mapping.specialtySlugs || []).some((slug) =>
            specialtySlugs.has(slug)
        )
            ? 2
            : 0;
        const score = termMatches.length + specialtyScore;

        if (score > bestScore) {
            bestMatch = mapping;
            bestScore = score;
        }
    });

    return bestScore > 0 ? bestMatch : null;
};

const findMatchedPharmacyTerm = ({
    text = '',
    mapping = null,
} = {}) => {
    const normalizedText = normalizeSearchText(text);

    return (mapping?.terms || [])
        .slice()
        .sort((left, right) => right.length - left.length)
        .find((term) => normalizedText.includes(normalizeSearchText(term))) || '';
};

const findExactMedicineMatch = ({
    text = '',
    medicineMatches = [],
} = {}) => {
    const normalizedText = normalizeSearchText(text);

    return (Array.isArray(medicineMatches) ? medicineMatches : []).find((medicine) => {
        const normalizedName = normalizeSearchText(medicine?.name || '');
        return normalizedName && normalizedText.includes(normalizedName);
    }) || null;
};

const inferPharmacyNavigation = ({
    text = '',
    specialties = [],
    grounding,
} = {}) => {
    const symptomRecommendation = grounding?.symptomRecommendation || findSymptomRecommendation({
        text,
        specialties,
    });
    const exactMedicine = findExactMedicineMatch({
        text,
        medicineMatches: grounding?.medicineMatches,
    });
    const matchedMapping = exactMedicine
        ? null
        : symptomRecommendation?.category
            ? {
                category: symptomRecommendation.category,
                terms: symptomRecommendation.terms || [],
                specialtySlugs: symptomRecommendation.specialtySlugs || [],
            }
            : findMatchingPharmacyMapping({ text, specialties });
    const matchedTerm = exactMedicine?.name || findMatchedPharmacyTerm({
        text,
        mapping: matchedMapping,
    });
    const query = symptomRecommendation
        ? ''
        : (
            matchedTerm ||
            normalizeDisplayText(text).slice(0, 90) ||
            matchedMapping?.category ||
            'medicine'
        );
    const rxOnly = Boolean(
        grounding?.isPrescriptionContext || exactMedicine?.requiresPrescription
    );

    return {
        query,
        category: exactMedicine?.category || matchedMapping?.category || '',
        rxOnly,
        exactMedicineName: exactMedicine?.name || '',
        symptomLabel: symptomRecommendation?.label || '',
        suggestedMedicineNames: symptomRecommendation?.medicineNames || [],
    };
};

const findSpecialtyBySlug = (slug = '') =>
    HEALTH_SPECIALTIES.find((specialty) => specialty.slug === slug) || null;

const normalizeModelStatus = (value = '') =>
    ['ok', 'refused', 'urgent'].includes(value) ? value : 'ok';

const normalizeModelMode = (value = '', status = 'ok') => {
    if (MODE_VALUES.includes(value)) {
        return value;
    }

    if (status === 'urgent') return 'urgent';
    if (status === 'refused') return 'refused';
    return 'guidance';
};

const normalizeModelUrgency = (value = '', status = 'ok', mode = 'guidance') => {
    if (['routine', 'soon', 'urgent', 'emergency'].includes(value)) {
        return value;
    }

    if (status === 'urgent' || mode === 'urgent') {
        return 'urgent';
    }

    return 'routine';
};

const normalizeActionHints = (hints = []) =>
    uniqueBy(
        (Array.isArray(hints) ? hints : [])
            .map((hint) => String(hint || '').trim())
            .filter((hint) => ACTION_HINT_VALUES.includes(hint))
    );

const enrichAssistantAnswer = ({
    answer = '',
    status = 'ok',
    mode = 'guidance',
    specialties = [],
    grounding = null,
}) => {
    if (!grounding?.symptomRecommendation || status !== 'ok' || mode === 'urgent' || mode === 'refused') {
        return answer;
    }

    const normalizedAnswer = normalizeSearchText(answer);
    const medicineNames = (grounding.symptomRecommendation.medicineNames || []).slice(0, 2);
    if (!medicineNames.length) {
        return answer;
    }

    if (medicineNames.some((name) => normalizedAnswer.includes(normalizeSearchText(name)))) {
        return answer;
    }

    const specialtyNames = uniqueBy(
        [
            ...specialties,
            ...mapSpecialtySlugs(grounding.symptomRecommendation.specialtySlugs || []),
        ],
        (specialty) => specialty.slug
    )
        .slice(0, 2)
        .map((specialty) => specialty.name);

    const medicineSnippet = medicineNames.join(' and ');
    const specialtySnippet = specialtyNames.length
        ? `, and ${specialtyNames.join(' or ')} is the best appointment starting point if it keeps happening or feels more severe`
        : '';

    return `${answer} DocX pharmacy may have options like ${medicineSnippet} for ${grounding.symptomRecommendation.label} relief${specialtySnippet}.`;
};

const createResponse = ({
    status = 'ok',
    mode = 'guidance',
    answer,
    urgency = 'routine',
    specialties = [],
    quickReplies = DEFAULT_QUICK_REPLIES,
    actions = [],
    grounding = null,
}) => ({
    status,
    mode,
    answer: enrichAssistantAnswer({
        answer,
        status,
        mode,
        specialties,
        grounding,
    }),
    disclaimer: HEALTH_CHAT_DISCLAIMER,
    urgency,
    specialties: specialties.map(({ slug, name }) => ({ slug, name })),
    actions: normalizeAssistantActions({
        actions,
        specialties,
        grounding,
    }),
    quickReplies: Array.isArray(quickReplies) && quickReplies.length === 0
        ? []
        : sanitizeQuickReplies(
            quickReplies,
            status === 'refused' ? STARTER_QUICK_REPLIES : DEFAULT_QUICK_REPLIES
        ),
});

const normalizeHistory = (history = []) =>
    (Array.isArray(history) ? history : [])
        .filter((item) => item && typeof item.content === 'string')
        .map((item) => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: item.content.trim().slice(0, 700),
        }))
        .filter((item) => item.content)
        .slice(-12);

const buildGeminiContents = (history = [], message = '') => [
    ...history.map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }],
    })),
    {
        role: 'user',
        parts: [{ text: message }],
    },
];

const extractGeminiText = (payload = {}) =>
    payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('')
        .trim() || '';

const parseModelJson = (text = '') => {
    if (!text) {
        return null;
    }

    const cleanedText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(cleanedText);
    } catch (error) {
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace) {
            try {
                return JSON.parse(cleanedText.slice(firstBrace, lastBrace + 1));
            } catch (nestedError) {
                return null;
            }
        }

        return null;
    }
};

const extractStructuredAnswerFallback = (text = '') => {
    const answerMatch = text.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)/i);

    if (!answerMatch?.[1]) {
        return '';
    }

    return answerMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, ' ')
        .replace(/\\\\/g, '\\')
        .trim();
};

const normalizeAssistantAnswer = (value = '') =>
    value
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 900);

const buildGroundingSummary = async ({ message = '', history = [] }) => {
    const combinedText = normalizeSearchText(
        [...history.map((item) => item.content), message].join(' ')
    );
    const inferredSpecialties = findSpecialtiesFromText(combinedText);
    const symptomRecommendation = findSymptomRecommendation({
        text: combinedText,
        specialties: inferredSpecialties,
    });
    const isMedicationContext = MEDICATION_CONTEXT_PATTERN.test(combinedText);
    const isPrescriptionContext = PRESCRIPTION_CONTEXT_PATTERN.test(combinedText);
    const isVirtualContext = VIRTUAL_CONTEXT_PATTERN.test(combinedText);
    const isBookingContext = BOOKING_CONTEXT_PATTERN.test(combinedText);
    const isLabContext = LAB_CONTEXT_PATTERN.test(combinedText);
    const searchTokens = extractSearchTokens(combinedText);
    const medicineRegex =
        searchTokens.length
            ? new RegExp(searchTokens.map(escapeRegex).join('|'), 'i')
            : null;

    const activeDoctorUsers = await User.find({
        role: 'doctor',
        status: 'active',
        isVerified: true,
    }).select('_id').lean();
    const activeDoctorUserIds = activeDoctorUsers.map((user) => user._id);

    const [doctors, virtualDoctorIds, medicineMatches] = await Promise.all([
        Doctor.find({ isVerified: true, user: { $in: activeDoctorUserIds } }).select('specialization').lean(),
        DoctorVirtualSchedule.distinct('doctor', { active: true }),
        medicineRegex
            ? Medicine.find({
                $or: [
                    { name: medicineRegex },
                    { category: medicineRegex },
                    { manufacturer: medicineRegex },
                ],
                stock: { $gt: 0 },
            })
                .select('name category requiresPrescription')
                .limit(3)
                .lean()
            : Promise.resolve([]),
    ]);

    const hasMedicineMatches = medicineMatches.length > 0;
    const medicationContext = isMedicationContext || hasMedicineMatches;
    const prescriptionContext = isPrescriptionContext || hasMedicineMatches;
    const relevantSpecialties = uniqueBy(
        [
            ...(inferredSpecialties.length
                ? inferredSpecialties
                : [
                    findSpecialtyBySlug(medicationContext ? 'pharmacology' : 'general-medicine'),
                ].filter(Boolean)),
            ...mapSpecialtySlugs(symptomRecommendation?.specialtySlugs || []),
        ],
        (specialty) => specialty.slug
    );
    const virtualDoctorSet = new Set(virtualDoctorIds.map((doctorId) => String(doctorId)));
    const specialtyStats = uniqueBy(
        relevantSpecialties
            .map((specialty) => {
                const matchingDoctors = doctors.filter((doctor) =>
                    matchesSpecialtyQuery(doctor.specialization, specialty.name) ||
                    matchesSpecialtyQuery(doctor.specialization, specialty.doctorFilter)
                );

                return {
                    slug: specialty.slug,
                    name: specialty.name,
                    doctorFilter: specialty.doctorFilter,
                    doctorCount: matchingDoctors.length,
                    virtualDoctorCount: matchingDoctors.filter((doctor) =>
                        virtualDoctorSet.has(String(doctor._id))
                    ).length,
                };
            })
            .filter((specialty, index) => specialty.doctorCount > 0 || index === 0),
        (specialty) => specialty.slug
    );

    const summaryLines = [];

    if (specialtyStats.length) {
        summaryLines.push('Relevant public DocX specialties:');
        specialtyStats.forEach((specialty) => {
            summaryLines.push(
                `- ${specialty.name}: ${specialty.doctorCount} doctors${specialty.virtualDoctorCount ? `, ${specialty.virtualDoctorCount} with virtual consultation hours` : ''}.`
            );
        });
    }

    if (medicationContext || prescriptionContext) {
        summaryLines.push(
            `- DocX pharmacy and digital prescription services are available${medicineMatches.length ? `; matching pharmacy catalog items include ${medicineMatches.map((medicine) => medicine.name).join(', ')}` : ''}.`
        );
    }

    if (symptomRecommendation?.medicineNames?.length) {
        summaryLines.push(
            `- Symptom support examples from DocX pharmacy for ${symptomRecommendation.label}: ${symptomRecommendation.medicineNames.slice(0, 3).join(', ')}.`
        );
    }

    if (isLabContext) {
        summaryLines.push(
            '- Lab-result explanations should stay general and should encourage clinician review for abnormal or confusing results.'
        );
    }

    if (isVirtualContext) {
        summaryLines.push(
            '- Virtual consultation is available in DocX when a matching specialty has online doctor hours.'
        );
    }

    summaryLines.push(
        '- Public app actions available: specialty pages, find doctors, virtual consultation, digital prescription, and pharmacy.'
    );

    return {
        combinedText,
        specialtyStats,
        medicineMatches,
        symptomRecommendation,
        isMedicationContext: medicationContext,
        isPrescriptionContext: prescriptionContext,
        isVirtualContext,
        isBookingContext,
        isLabContext,
        summaryText: summaryLines.join('\n'),
    };
};

const addAction = (actions, action) => {
    if (!action?.label || !action?.path) {
        return;
    }

    const exists = actions.some(
        (current) => current.label === action.label || current.path === action.path
    );

    if (!exists) {
        actions.push(action);
    }
};

const deriveActionHints = ({
    modelHints = [],
    specialties = [],
    grounding,
    status = 'ok',
    mode = 'guidance',
}) => {
    if (status === 'refused' || mode === 'refused') {
        return [];
    }

    const hints = new Set(normalizeActionHints(modelHints));
    const hasSpecialty = specialties.length > 0;
    const hasVirtualSupport = grounding.specialtyStats.some(
        (specialty) => specialty.virtualDoctorCount > 0
    );
    const orderedHints = [];
    const addHint = (hint) => {
        if (hints.has(hint) && !orderedHints.includes(hint)) {
            orderedHints.push(hint);
        }
    };

    if (hasSpecialty) {
        hints.add('specialty_page');
    }

    if (grounding.isBookingContext || hasSpecialty) {
        hints.add('book_specialty');
    }

    if (grounding.isVirtualContext || (hasVirtualSupport && hasSpecialty)) {
        hints.add('virtual_consult');
    }

    if (grounding.isMedicationContext) {
        hints.add('pharmacy');
    }

    if (grounding.symptomRecommendation) {
        hints.add('pharmacy');
    }

    if (grounding.isPrescriptionContext) {
        hints.add('digital_prescription');
    }

    if (!hints.size && status === 'ok') {
        hints.add('find_doctors');
    }

    if (grounding.isMedicationContext) {
        addHint('pharmacy');
    }

    if (grounding.symptomRecommendation) {
        addHint('pharmacy');
    }

    if (grounding.isPrescriptionContext) {
        addHint('digital_prescription');
    }

    if (grounding.isVirtualContext || (hasVirtualSupport && hasSpecialty)) {
        addHint('virtual_consult');
    }

    if (grounding.isBookingContext || hasSpecialty) {
        addHint('book_specialty');
    }

    addHint('specialty_page');
    addHint('find_doctors');

    ACTION_HINT_VALUES.forEach(addHint);

    return orderedHints;
};

const buildSafeActions = ({
    actionHints = [],
    specialties = [],
    grounding,
    status = 'ok',
    urgency = 'routine',
    mode = 'guidance',
}) => {
    if (status === 'refused' || mode === 'refused' || urgency === 'emergency') {
        return [];
    }

    const actions = [];
    const primarySpecialty =
        specialties[0] || findSpecialtyBySlug(grounding.specialtyStats[0]?.slug || '');
    const primaryGrounding = grounding.specialtyStats.find(
        (specialty) => specialty.slug === primarySpecialty?.slug
    );
    const pharmacyNavigation = inferPharmacyNavigation({
        text: grounding.combinedText,
        specialties,
        grounding,
    });

    actionHints.forEach((hint) => {
        switch (hint) {
            case 'specialty_page':
                if (primarySpecialty) {
                    addAction(actions, {
                        label: `View ${primarySpecialty.name}`,
                        path: `/specialties/${primarySpecialty.slug}`,
                        type: 'specialty',
                    });
                }
                break;
            case 'book_specialty':
                if (primarySpecialty && (!primaryGrounding || primaryGrounding.doctorCount > 0)) {
                    addAction(actions, {
                        label: primaryGrounding?.doctorCount
                            ? `Book ${primarySpecialty.name} (${primaryGrounding.doctorCount})`
                            : `Book ${primarySpecialty.name}`,
                        path: buildDoctorSearchPath({
                            specialty: primarySpecialty.slug,
                        }),
                        type: 'booking',
                    });
                }
                break;
            case 'virtual_consult':
                addAction(actions, {
                    label: primarySpecialty && (!primaryGrounding || primaryGrounding.virtualDoctorCount > 0)
                        ? `Start ${primarySpecialty.name} video consult`
                        : 'Start virtual consultation',
                    path: primarySpecialty && (!primaryGrounding || primaryGrounding.virtualDoctorCount > 0)
                        ? `/virtual-consultation?specialty=${encodeURIComponent(primarySpecialty.slug)}`
                        : '/virtual-consultation',
                    type: 'virtual',
                });
                break;
            case 'pharmacy':
                addAction(actions, {
                    label: pharmacyNavigation.exactMedicineName
                        ? `Search ${pharmacyNavigation.exactMedicineName}`
                        : pharmacyNavigation.symptomLabel
                            ? `See medicines for ${pharmacyNavigation.symptomLabel}`
                        : pharmacyNavigation.category
                            ? `Browse ${pharmacyNavigation.category}`
                            : 'Search pharmacy',
                    path: buildPharmacySearchPath(pharmacyNavigation),
                    type: 'pharmacy',
                });
                break;
            case 'digital_prescription':
                addAction(actions, {
                    label: 'Request digital prescription',
                    path: '/digital-prescription',
                    type: 'prescription',
                });
                break;
            case 'find_doctors':
                addAction(actions, {
                    label: 'Find doctors',
                    path: buildDoctorSearchPath(),
                    type: 'directory',
                });
                break;
            default:
                break;
        }
    });

    if (!actions.length) {
        if (primarySpecialty) {
            addAction(actions, {
                label: `View ${primarySpecialty.name}`,
                path: `/specialties/${primarySpecialty.slug}`,
                type: 'specialty',
            });
        }

        addAction(actions, {
            label: 'Find doctors',
            path: buildDoctorSearchPath(),
            type: 'directory',
        });
    }

    return actions.slice(0, 3);
};

const getGeminiResponse = async ({
    apiKey,
    history,
    message,
    groundingSummary = '',
    modelCandidates = [],
}) => {
    let lastError = null;

    for (const model of modelCandidates) {
        try {
            const response = await axios.post(
                `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
                {
                    systemInstruction: {
                        parts: [{ text: buildSystemPrompt({ groundingSummary }) }],
                    },
                    contents: buildGeminiContents(history, message.slice(0, 1400)),
                    generationConfig: {
                        temperature: 0.35,
                        maxOutputTokens: 900,
                        responseMimeType: 'application/json',
                        responseSchema: GEMINI_RESPONSE_SCHEMA,
                    },
                },
                {
                    timeout: 18000,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                    },
                }
            );

            const rawText = extractGeminiText(response.data);
            const parsed = parseModelJson(rawText);

            if (parsed || !rawText.trim().startsWith('{')) {
                return response.data;
            }

            lastError = new Error(`Model ${model} returned malformed structured output`);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
};

const healthChat = async (req, res) => {
    try {
        const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
        const history = normalizeHistory(req.body?.history);
        const combinedUserText = [...history.filter((item) => item.role === 'user').map((item) => item.content), message].join(' ');

        if (!message) {
            res.json(createResponse({
                status: 'refused',
                mode: 'follow_up',
                answer: 'Please describe your symptom or health question so I can help.',
                quickReplies: STARTER_QUICK_REPLIES,
            }));
            return;
        }

        const emergencyMatch = detectEmergency(combinedUserText);
        if (emergencyMatch) {
            res.json(createResponse({
                status: 'urgent',
                mode: 'urgent',
                answer: emergencyMatch.answer,
                urgency: emergencyMatch.urgency,
                quickReplies: [],
            }));
            return;
        }

        if (isClearlyOffTopic(message, history)) {
            res.json(createResponse({
                status: 'refused',
                mode: 'refused',
                answer: 'I can help only with health questions, symptoms, medication concerns, lab basics, and when to seek care.',
                quickReplies: STARTER_QUICK_REPLIES,
            }));
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const modelCandidates = [...new Set([preferredModel, 'gemini-2.0-flash', 'gemini-flash-latest'])];
        const grounding = await buildGroundingSummary({ message, history });

        if (!apiKey) {
            res.json(createResponse({
                status: 'refused',
                mode: 'refused',
                answer: 'The health assistant is temporarily unavailable. Please try again later.',
                quickReplies: STARTER_QUICK_REPLIES,
            }));
            return;
        }

        try {
            const responseData = await getGeminiResponse({
                apiKey,
                history,
                message,
                groundingSummary: grounding.summaryText,
                modelCandidates,
            });
            const rawText = extractGeminiText(responseData);
            const parsed = parseModelJson(rawText);

            if (!parsed) {
                const extractedAnswer = extractStructuredAnswerFallback(rawText);
                const fallbackSpecialties = uniqueBy(
                    [
                        ...findSpecialtiesFromText(`${message} ${extractedAnswer || rawText}`),
                        ...grounding.specialtyStats
                            .map((specialty) => findSpecialtyBySlug(specialty.slug))
                            .filter(Boolean),
                        ...mapSpecialtySlugs(grounding.symptomRecommendation?.specialtySlugs || []),
                    ],
                    (specialty) => specialty.slug
                ).slice(0, 3);
                const fallbackHints = deriveActionHints({
                    specialties: fallbackSpecialties,
                    grounding,
                    status: 'ok',
                    mode: 'guidance',
                });

                res.json(createResponse({
                    status: 'ok',
                    mode: extractedAnswer ? 'follow_up' : 'guidance',
                    answer:
                        normalizeAssistantAnswer(extractedAnswer || rawText) ||
                        'Tell me your main symptom, how long it has been happening, and whether it is getting worse so I can guide you more clearly.',
                    specialties: fallbackSpecialties,
                    quickReplies: DEFAULT_QUICK_REPLIES,
                actions: buildSafeActions({
                    actionHints: fallbackHints,
                    specialties: fallbackSpecialties,
                    grounding,
                    status: 'ok',
                    mode: 'guidance',
                }),
                grounding,
            }));
            return;
        }

            const status = normalizeModelStatus(parsed.status);
            const mode = normalizeModelMode(parsed.mode, status);
            const urgency = normalizeModelUrgency(parsed.urgency, status, mode);
            const specialties = uniqueBy(
                [
                    ...findSpecialtiesFromText(`${message} ${parsed.answer || ''}`),
                    ...grounding.specialtyStats
                        .map((specialty) => findSpecialtyBySlug(specialty.slug))
                        .filter(Boolean),
                    ...mapSpecialtySlugs(parsed.specialtySlugs),
                    ...mapSpecialtySlugs(grounding.symptomRecommendation?.specialtySlugs || []),
                ],
                (specialty) => specialty.slug
            ).slice(0, 3);
            const actionHints = deriveActionHints({
                modelHints: parsed.actionHints,
                specialties,
                grounding,
                status,
                mode,
            });

            res.json(createResponse({
                status,
                mode,
                urgency,
                answer:
                    normalizeAssistantAnswer(parsed.answer) ||
                    'Tell me your main symptom, how long it has been happening, and whether it is getting worse so I can guide you more clearly.',
                specialties,
                quickReplies: parsed.quickReplies,
                actions: buildSafeActions({
                    actionHints,
                    specialties,
                    grounding,
                    status,
                    urgency,
                    mode,
                }),
                grounding,
            }));
        } catch (error) {
            console.error('Health assistant error:', error.response?.data || error.message);

            const fallbackSpecialties = uniqueBy(
                [
                    ...findSpecialtiesFromText(message),
                    ...grounding.specialtyStats
                        .map((specialty) => findSpecialtyBySlug(specialty.slug))
                        .filter(Boolean),
                    ...mapSpecialtySlugs(grounding.symptomRecommendation?.specialtySlugs || []),
                ],
                (specialty) => specialty.slug
            ).slice(0, 2);
            const fallbackHints = deriveActionHints({
                specialties: fallbackSpecialties,
                grounding,
                status: 'ok',
                mode: 'follow_up',
            });

            res.json(createResponse({
                status: 'ok',
                mode: 'follow_up',
                answer: 'I could not reach the live health model right now. Tell me the main symptom, how long it has been happening, and whether it is getting worse, and I will keep helping while the service reconnects.',
                specialties: fallbackSpecialties,
                quickReplies: [
                    'When did it start?',
                    'Is it getting worse?',
                    'Any fever or breathing trouble?',
                ],
                actions: buildSafeActions({
                    actionHints: fallbackHints,
                    specialties: fallbackSpecialties,
                    grounding,
                    status: 'ok',
                    mode: 'follow_up',
                }),
                grounding,
            }));
        }
    } catch (error) {
        console.error('Health assistant controller failure:', error.message);
        res.status(200).json({
            status: 'refused',
            mode: 'refused',
            answer: 'I could not process that health message right now. Please try again in a moment.',
            disclaimer: HEALTH_CHAT_DISCLAIMER,
            urgency: 'routine',
            specialties: [],
            actions: [],
            quickReplies: STARTER_QUICK_REPLIES,
        });
    }
};

module.exports = {
    healthChat,
};
