import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  HeartPulse,
  LoaderCircle,
  SendHorizonal,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/shared/lib/api";
import assistantNavigationMap from "../../../../shared/assistantNavigationMap.json";
import FieldError from "@/shared/components/common/FieldError";
import "@/shared/components/assistant/healthAssistant.css";

const STORAGE_KEY = "docx_health_assistant_session_v1";
const DELETE_CONFIRM_TIMEOUT_MS = 5000;
const ASSISTANT_RETRY_COOLDOWN_MS = 15000;
const DOCTOR_SEARCH_DEFAULTS = assistantNavigationMap.doctorSearchDefaults || {
  availability: "open",
  sort: "next-available",
};
const PHARMACY_CATEGORY_MAPPINGS =
  assistantNavigationMap.pharmacyCategoryMappings || [];
const SYMPTOM_RECOMMENDATION_MAPPINGS =
  assistantNavigationMap.symptomRecommendationMappings || [];
const QUERY_ONLY_SPECIALTY_SLUGS = new Set(
  assistantNavigationMap.queryOnlySpecialtySlugs || []
);
const HIDDEN_ROUTES = ["/login", "/signup", "/forgot-password", "/join-as-doctor"];
const HIDDEN_PREFIXES = ["/admin", "/doctor", "/reset-password"];
const STARTER_QUICK_REPLIES = [
  "I have a headache",
  "I have a fever",
  "I have a cough",
  "I have stomach pain",
];
const DEFAULT_DISCLAIMER =
  "General health guidance only. This assistant does not diagnose or prescribe.";
const OFF_TOPIC_PATTERNS = [
  /\b(javascript|reactjs|python|node|html|css|sql|coding|programming|bug|debug)\b/i,
  /\b(movie|music|song|football|cricket|crypto|stock|finance|politics)\b/i,
];
const EMERGENCY_PATTERN =
  /\b(chest pain|difficulty breathing|shortness of breath|fainting|stroke|seizure|suicidal|self harm|bleeding heavily)\b/i;
const MEDICATION_PATTERN =
  /\b(medicine|medication|drug|tablet|capsule|cream|ointment|syrup|pharmacy|prescription|refill|dose|antibiotic)\b/i;
const PRESCRIPTION_PATTERN =
  /\b(prescription|refill|repeat medicine|digital prescription|rx)\b/i;
const LOCAL_SPECIALTY_RULES = [
  {
    slug: "cardiology",
    name: "Cardiology",
    doctorFilter: "cardiology",
    keywords: ["chest pain", "heart", "palpitations", "blood pressure"],
  },
  {
    slug: "neurology",
    name: "Neurology",
    doctorFilter: "neurology",
    keywords: ["headache", "migraine", "dizziness", "seizure", "numbness"],
  },
  {
    slug: "pediatrics",
    name: "Pediatrics",
    doctorFilter: "pediatrics",
    keywords: ["child", "baby", "infant", "pediatric"],
  },
  {
    slug: "pulmonology",
    name: "Pulmonology",
    doctorFilter: "pulmonology",
    keywords: ["cough", "breathing", "wheezing", "asthma"],
  },
  {
    slug: "dermatology",
    name: "Dermatology",
    doctorFilter: "dermatology",
    keywords: ["rash", "itch", "skin", "acne"],
  },
  {
    slug: "general-medicine",
    name: "General Medicine",
    doctorFilter: "general",
    keywords: ["fever", "cold", "flu", "fatigue", "body pain", "stomach pain"],
  },
];

const buildInitialMessages = () => [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Tell me your symptom, health concern, medicine question, or lab-result doubt. I can give general guidance, ask follow-up questions, and point you to the right DocX service.",
    status: "ok",
    mode: "guidance",
    urgency: "routine",
    disclaimer: DEFAULT_DISCLAIMER,
    quickReplies: STARTER_QUICK_REPLIES,
    specialties: [],
    actions: [],
  },
];

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const loadStoredMessages = () => {
  if (typeof window === "undefined") {
    return buildInitialMessages();
  }

  try {
    const storedValue = window.sessionStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return buildInitialMessages();
    }

    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) && parsed.length ? parsed : buildInitialMessages();
  } catch {
    return buildInitialMessages();
  }
};

const isHiddenRoute = (pathname = "") =>
  HIDDEN_ROUTES.includes(pathname) ||
  HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const getLatestAssistantId = (messages) =>
  [...messages].reverse().find((message) => message.role === "assistant")?.id;

const getHistoryForApi = (messages) =>
  messages
    .filter((message) => message.role === "assistant" || message.role === "user")
    .map(({ role, content }) => ({ role, content }))
    .slice(-12);

const getErrorMessage = (error) =>
  error?.response?.data?.answer ||
  "I could not reach the health assistant right now. Please try again in a moment.";

const shouldBackOffAssistant = (error) => {
  const status = error?.response?.status;
  return !error?.response || [404, 500, 502, 503, 504].includes(status);
};

const inferLocalSpecialties = (message = "") => {
  const normalized = String(message || "").toLowerCase();
  const matches = LOCAL_SPECIALTY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );

  return matches.slice(0, 2).map(({ slug, name, doctorFilter }) => ({
    slug,
    name,
    doctorFilter,
  }));
};

const normalizeQueryText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const buildDoctorSearchPath = ({ specialty = "", keyword = "" } = {}) => {
  const params = new URLSearchParams();

  if (specialty) {
    params.set("specialty", specialty);
  }

  if (normalizeQueryText(keyword)) {
    params.set("keyword", normalizeQueryText(keyword));
  }

  params.set("availability", DOCTOR_SEARCH_DEFAULTS.availability || "open");
  params.set("sort", DOCTOR_SEARCH_DEFAULTS.sort || "next-available");

  return `/find-doctors?${params.toString()}`;
};

const buildPharmacySearchPath = ({ query = "", category = "", rxOnly = false } = {}) => {
  const params = new URLSearchParams();

  if (normalizeQueryText(query)) {
    params.set("q", normalizeQueryText(query));
  }

  if (category) {
    params.set("category", category);
  }

  if (rxOnly) {
    params.set("rx", "1");
  }

  return `/pharmacy?${params.toString()}`;
};

const findLocalPharmacyMapping = (message = "", specialties = []) => {
  const normalizedMessage = String(message || "").toLowerCase();
  const specialtySlugs = new Set(
    specialties.map((specialty) => specialty.slug).filter(Boolean)
  );

  if ([...specialtySlugs].some((slug) => QUERY_ONLY_SPECIALTY_SLUGS.has(slug))) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  PHARMACY_CATEGORY_MAPPINGS.forEach((mapping) => {
    const specialtyScore = (mapping.specialtySlugs || []).some((slug) =>
      specialtySlugs.has(slug)
    )
      ? 3
      : 0;
    const termMatches = (mapping.terms || []).filter((term) =>
      normalizedMessage.includes(term.toLowerCase())
    );
    const score = specialtyScore + termMatches.length;

    if (score > bestScore) {
      bestMatch = mapping;
      bestScore = score;
    }
  });

  return bestMatch;
};

const findLocalSymptomRecommendation = (message = "", specialties = []) => {
  const normalizedMessage = String(message || "").toLowerCase();
  const specialtySlugs = new Set(
    specialties.map((specialty) => specialty.slug).filter(Boolean)
  );

  let bestMatch = null;
  let bestScore = 0;

  SYMPTOM_RECOMMENDATION_MAPPINGS.forEach((mapping) => {
    const termMatches = (mapping.terms || []).filter((term) =>
      normalizedMessage.includes(term.toLowerCase())
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

const inferLocalPharmacyContext = (message = "", specialties = []) => {
  const symptomRecommendation = findLocalSymptomRecommendation(message, specialties);
  const mapping = findLocalPharmacyMapping(message, specialties);
  const query = symptomRecommendation
    ? ""
    : (mapping?.terms || [])
        .slice()
        .sort((left, right) => right.length - left.length)
        .find((term) => String(message || "").toLowerCase().includes(term.toLowerCase())) ||
      normalizeQueryText(message) ||
      "medicine";

  return {
    query,
    category: symptomRecommendation?.category || mapping?.category || "",
    rxOnly: PRESCRIPTION_PATTERN.test(message),
    symptomLabel: symptomRecommendation?.label || "",
    suggestedMedicineNames: symptomRecommendation?.medicineNames || [],
  };
};

const buildLocalActions = ({
  specialties = [],
  status = "ok",
  urgency = "routine",
  pharmacyContext = null,
}) => {
  if (status === "refused" || urgency === "emergency") {
    return [];
  }

  const actions = [];

  if (pharmacyContext) {
    actions.push({
      label: pharmacyContext.symptomLabel
        ? `See medicines for ${pharmacyContext.symptomLabel}`
        : pharmacyContext.category
        ? `Browse ${pharmacyContext.category}`
        : "Search pharmacy",
      path: buildPharmacySearchPath(pharmacyContext),
      type: "pharmacy",
    });

    if (pharmacyContext.rxOnly) {
      actions.push({
        label: "Request digital prescription",
        path: "/digital-prescription",
        type: "prescription",
      });
    }
  }

  if (specialties.length) {
    const [first, second] = specialties;

    actions.push({
      label: `View ${first.name}`,
      path: `/specialties/${first.slug}`,
      type: "specialty",
    });

    actions.push({
      label: `Book ${first.name}`,
      path: buildDoctorSearchPath({
        specialty: first.slug,
      }),
      type: "booking",
    });

    if (second) {
      actions.push({
        label: `View ${second.name}`,
        path: `/specialties/${second.slug}`,
        type: "specialty",
      });
    }
  }

  if (!actions.length) {
    actions.push(
      { label: "Find doctors", path: buildDoctorSearchPath(), type: "directory" },
      { label: "Browse specialties", path: "/services", type: "specialty" }
    );
  }

  return actions.slice(0, 3);
};

const normalizeAssistantActions = ({
  actions = [],
  specialties = [],
  message = "",
}) => {
  if (!Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  const pharmacyContext = inferLocalPharmacyContext(message, specialties);

  return actions.map((action) => {
    const nextAction = { ...action };
    const rawPath = String(action?.path || "");
    const queryString = rawPath.includes("?") ? rawPath.split("?")[1] : "";
    const params = new URLSearchParams(queryString);

    if (
      action?.type === "booking" ||
      action?.type === "directory" ||
      rawPath.startsWith("/find-doctors")
    ) {
      nextAction.path = buildDoctorSearchPath({
        specialty:
          params.get("specialty") || specialties[0]?.slug || "",
        keyword: params.get("keyword") || "",
      });
    }

    if (action?.type === "pharmacy" || rawPath.startsWith("/pharmacy")) {
      const nextPharmacyContext = {
        query: params.get("q") || pharmacyContext.query,
        category: params.get("category") || pharmacyContext.category,
        rxOnly: params.get("rx") === "1" || pharmacyContext.rxOnly,
        symptomLabel: pharmacyContext.symptomLabel,
      };

      nextAction.path = buildPharmacySearchPath(nextPharmacyContext);

      if (!action?.label || /matching pharmacy|search pharmacy/i.test(action.label)) {
        nextAction.label = nextPharmacyContext.symptomLabel
          ? `See medicines for ${nextPharmacyContext.symptomLabel}`
          : nextPharmacyContext.category
          ? `Browse ${nextPharmacyContext.category}`
          : "Search pharmacy";
      }
    }

    return nextAction;
  });
};

const getContextualActionsForMessage = (messages = [], index = 0) => {
  const message = messages[index];

  if (message?.role !== "assistant" || !message.actions?.length) {
    return message?.actions || [];
  }

  const previousUserMessage = [...messages.slice(0, index)]
    .reverse()
    .find((entry) => entry.role === "user")?.content;

  return normalizeAssistantActions({
    actions: message.actions,
    specialties: Array.isArray(message.specialties) ? message.specialties : [],
    message: previousUserMessage || "",
  });
};

const buildLocalAssistantResponse = (message = "") => {
  const trimmed = String(message || "").trim();
  const normalized = trimmed.toLowerCase();
  const offTopic = OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
  const emergency = EMERGENCY_PATTERN.test(normalized);
  const medicationContext = MEDICATION_PATTERN.test(normalized);
  const baseSpecialties = inferLocalSpecialties(trimmed);
  const symptomRecommendation = findLocalSymptomRecommendation(trimmed, baseSpecialties);
  const mappedSpecialties = (symptomRecommendation?.specialtySlugs || [])
    .map((slug) => {
      const match = LOCAL_SPECIALTY_RULES.find((rule) => rule.slug === slug);
      return match
        ? { slug: match.slug, name: match.name, doctorFilter: match.doctorFilter }
        : null;
    })
    .filter(Boolean);
  const specialties = [...new Map(
    [...baseSpecialties, ...mappedSpecialties].map((item) => [item.slug, item])
  ).values()].slice(0, 2);
  const pharmacyContext = (medicationContext || symptomRecommendation)
    ? inferLocalPharmacyContext(trimmed, specialties)
    : null;

  if (emergency) {
    return {
      status: "urgent",
      mode: "urgent",
      urgency: "emergency",
      answer:
        "Your message may include emergency symptoms. Please seek immediate emergency medical care or contact local emergency services now.",
      disclaimer: DEFAULT_DISCLAIMER,
      quickReplies: [],
      specialties: [],
      actions: [],
    };
  }

  if (offTopic) {
    return {
      status: "refused",
      mode: "refused",
      urgency: "routine",
      answer:
        "I can help with symptoms, general health guidance, and when to seek care. Please ask a health-related question.",
      disclaimer: DEFAULT_DISCLAIMER,
      quickReplies: STARTER_QUICK_REPLIES,
      specialties: [],
      actions: [],
    };
  }

  let answer = specialties.length
    ? `Based on your message, ${specialties[0].name} looks like the best starting point. Share how long this has been happening and whether symptoms are getting worse so we can guide next steps safely.`
    : "I can help with general symptom guidance and when to seek care. Tell me your main symptom, how long it has been happening, and whether it is getting worse.";

  if (symptomRecommendation?.medicineNames?.length) {
    const medicineSnippet = symptomRecommendation.medicineNames.slice(0, 2).join(" and ");
    const specialtySnippet = specialties.length
      ? `, and ${specialties.map((specialty) => specialty.name).join(" or ")} is the best appointment starting point if it keeps happening`
      : "";
    answer = `${answer} DocX pharmacy may have options like ${medicineSnippet} for ${symptomRecommendation.label} relief${specialtySnippet}.`;
  }

  return {
    status: "ok",
    mode: specialties.length ? "guidance" : "follow_up",
    urgency: "routine",
    answer,
    disclaimer: DEFAULT_DISCLAIMER,
    quickReplies: [
      "How long has this been happening?",
      "How severe is it right now?",
      "Any fever or breathing trouble?",
    ],
    specialties: specialties.map(({ slug, name }) => ({ slug, name })),
    actions: buildLocalActions({ specialties, pharmacyContext }),
  };
};

const HealthAssistantWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const deleteConfirmTimerRef = useRef(null);
  const assistantBackoffRef = useRef({ unavailableUntil: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState(loadStoredMessages);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [composerError, setComposerError] = useState("");

  const hidden = isHiddenRoute(location.pathname);
  const latestAssistantId = getLatestAssistantId(messages);
  const latestDisclaimer =
    [...messages].reverse().find((message) => message.role === "assistant")?.disclaimer ||
    "General health guidance only.";

  useEffect(() => {
    if (hidden) {
      setIsOpen(false);
      if (deleteConfirmTimerRef.current) {
        window.clearTimeout(deleteConfirmTimerRef.current);
        deleteConfirmTimerRef.current = null;
      }
      setShowDeleteToast(false);
    }
  }, [hidden]);

  useEffect(() => {
    if (isOpen) {
      return undefined;
    }

    if (deleteConfirmTimerRef.current) {
      window.clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = null;
    }
    setShowDeleteToast(false);
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (hidden || typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors and keep the chat usable.
    }
  }, [hidden, messages]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [isOpen, isSending, messages]);

  useEffect(
    () => () => {
      if (deleteConfirmTimerRef.current) {
        window.clearTimeout(deleteConfirmTimerRef.current);
      }
    },
    []
  );

  if (hidden) {
    return null;
  }

  const sendMessage = async (rawValue) => {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue || isSending) {
      return;
    }

    const userMessage = {
      id: createId(),
      role: "user",
      content: trimmedValue,
    };

    setInput("");
    setIsSending(true);
    setMessages((current) => [...current, userMessage]);

    const localPayload = buildLocalAssistantResponse(trimmedValue);
    const now = Date.now();

    if (assistantBackoffRef.current.unavailableUntil > now) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: localPayload.answer,
          status: localPayload.status || "ok",
          mode: localPayload.mode || "follow_up",
          urgency: localPayload.urgency || "routine",
          disclaimer:
            "Live assistant is reconnecting. General guidance mode is active for a moment.",
          quickReplies: localPayload.quickReplies || STARTER_QUICK_REPLIES,
          specialties: localPayload.specialties || [],
          actions: localPayload.actions || [],
        },
      ]);
      setIsSending(false);
      return;
    }

    try {
      const { data } = await api.post("/assistant/health-chat", {
        message: trimmedValue,
        history: getHistoryForApi(messages),
      });

      assistantBackoffRef.current.unavailableUntil = 0;

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: data.answer,
          status: data.status,
          mode: data.mode,
          urgency: data.urgency,
          disclaimer: data.disclaimer,
          quickReplies: Array.isArray(data.quickReplies) ? data.quickReplies : [],
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          actions: normalizeAssistantActions({
            actions: Array.isArray(data.actions) ? data.actions : [],
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
            message: trimmedValue,
          }),
        },
      ]);
    } catch (error) {
      if (shouldBackOffAssistant(error)) {
        assistantBackoffRef.current.unavailableUntil =
          Date.now() + ASSISTANT_RETRY_COOLDOWN_MS;
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: localPayload.answer || getErrorMessage(error),
          status: localPayload.status || "refused",
          mode: localPayload.mode || "follow_up",
          urgency: localPayload.urgency || "routine",
          disclaimer:
            "Local guidance mode is active while the assistant service reconnects.",
          quickReplies: localPayload.quickReplies || STARTER_QUICK_REPLIES,
          specialties: localPayload.specialties || [],
          actions: localPayload.actions || [],
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim()) {
      setComposerError("Enter a health question before sending.");
      return;
    }
    sendMessage(input);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!input.trim()) {
        setComposerError("Enter a health question before sending.");
        return;
      }
      sendMessage(input);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const clearDeleteToastTimer = () => {
    if (deleteConfirmTimerRef.current) {
      window.clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = null;
    }
  };

  const dismissDeleteToast = () => {
    clearDeleteToastTimer();
    setShowDeleteToast(false);
  };

  const handleDeleteChat = () => {
    if (isSending) {
      return;
    }

    setShowDeleteToast(true);
    clearDeleteToastTimer();
    deleteConfirmTimerRef.current = window.setTimeout(() => {
      setShowDeleteToast(false);
      deleteConfirmTimerRef.current = null;
    }, DELETE_CONFIRM_TIMEOUT_MS);
  };

  const confirmDeleteChat = () => {
    dismissDeleteToast();
    const initialMessages = buildInitialMessages();

    setInput("");
    setMessages(initialMessages);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage issues and still reset the in-memory chat.
      }
    }
  };

  return (
    <div className="health-assistant">
      {isOpen ? (
        <div className="health-assistant__panel" role="dialog" aria-label="DocX health assistant">
          <div className="health-assistant__header">
            <div className="health-assistant__title-area">
              <div className="health-assistant__avatar">
                <Bot size={28} />
              </div>
              <div>
                <span className="health-assistant__eyebrow">Need Help</span>
                <h3>DocX Health Assistant</h3>
                <p>{latestDisclaimer}</p>
              </div>
            </div>
            <div className="health-assistant__header-actions">
              <button
                type="button"
                className="health-assistant__delete-btn"
                onClick={handleDeleteChat}
                disabled={isSending}
                aria-label="Delete chat history"
              >
                <Trash2 size={16} />
                <span>Delete chat</span>
              </button>
              <button
                type="button"
                className="health-assistant__close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close health assistant"
              >
                <span>Close</span>
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="health-assistant__messages" ref={scrollRef}>
            {showDeleteToast ? (
              <div
                className="health-assistant__toast"
                role="status"
                aria-live="polite"
              >
                <div className="health-assistant__toast-icon" aria-hidden="true">
                  <Trash2 size={16} />
                </div>
                <div className="health-assistant__toast-content">
                  <strong>Delete this chat?</strong>
                  <p>This will clear the current conversation and start a fresh chat.</p>
                </div>
                <div className="health-assistant__toast-actions">
                  <button
                    type="button"
                    className="health-assistant__toast-btn health-assistant__toast-btn--ghost"
                    onClick={dismissDeleteToast}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="health-assistant__toast-btn health-assistant__toast-btn--danger"
                    onClick={confirmDeleteChat}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => {
              const showQuickReplies =
                message.role === "assistant" &&
                message.id === latestAssistantId &&
                message.quickReplies?.length;
              const contextualActions = getContextualActionsForMessage(messages, index);

              return (
                <div
                  key={message.id}
                  className={`health-assistant__message health-assistant__message--${message.role}`}
                >
                  {message.role === "assistant" ? (
                    <div className="health-assistant__message-meta">
                      <span className="health-assistant__message-icon" aria-hidden="true">
                        <Bot size={14} />
                      </span>
                      <span>DocX Bot</span>
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.mode === "follow_up" ? (
                    <div className="health-assistant__mode-chip">
                      A few more details will help
                    </div>
                  ) : null}

                  {message.role === "assistant" &&
                    (message.urgency === "urgent" || message.urgency === "emergency") && (
                      <div
                        className={`health-assistant__urgency health-assistant__urgency--${message.urgency}`}
                      >
                        <ShieldAlert size={16} />
                        <span>
                          {message.urgency === "emergency"
                            ? "Emergency warning"
                            : "Urgent care suggested"}
                        </span>
                      </div>
                    )}

                  <div className="health-assistant__bubble">
                    <p>{message.content}</p>
                  </div>

                  {message.role === "assistant" && message.specialties?.length ? (
                    <div className="health-assistant__specialties">
                      {message.specialties.map((specialty) => (
                        <button
                          key={specialty.slug}
                          type="button"
                          className="health-assistant__specialty-card"
                          onClick={() => handleNavigate(`/specialties/${specialty.slug}`)}
                        >
                          <Sparkles size={16} />
                          <span>{specialty.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {message.role === "assistant" && contextualActions?.length ? (
                    <div className="health-assistant__actions">
                      {contextualActions.map((action) => (
                        <button
                          key={`${message.id}-${action.path}-${action.label}`}
                          type="button"
                          className="health-assistant__action"
                          data-type={action.type || "default"}
                          onClick={() => handleNavigate(action.path)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showQuickReplies ? (
                    <div className="health-assistant__quick-replies">
                      {message.quickReplies.map((reply) => (
                        <button
                          key={`${message.id}-${reply}`}
                          type="button"
                          className="health-assistant__quick-reply"
                          disabled={isSending}
                          onClick={() => sendMessage(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {isSending ? (
              <div className="health-assistant__message health-assistant__message--assistant">
                <div className="health-assistant__typing">
                  <LoaderCircle size={16} className="health-assistant__spinner" />
                  <span>Consulting the health assistant...</span>
                </div>
              </div>
            ) : null}
          </div>

          <form className="health-assistant__composer" onSubmit={handleSubmit} noValidate>
            <textarea
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (composerError) setComposerError("");
              }}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Describe your symptoms or ask a health question"
              disabled={isSending}
              aria-invalid={Boolean(composerError)}
            />
            <FieldError message={composerError} />
            <div className="health-assistant__composer-footer">
              <span>Health topics only</span>
              <button type="submit" disabled={!input.trim() || isSending}>
                <SendHorizonal size={16} />
                <span style={{color:"#ffff"}}>Send</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className={`health-assistant__launcher ${isOpen ? "health-assistant__launcher--hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open DocX health assistant"
      >
        <span className="health-assistant__launcher-icon" aria-hidden="true">
          <Bot size={18} />
        </span>
        <span className="health-assistant__launcher-content">
          <span>Need Help</span>
          <HeartPulse size={16} />
        </span>
      </button>
    </div>
  );
};

export default HealthAssistantWidget;
