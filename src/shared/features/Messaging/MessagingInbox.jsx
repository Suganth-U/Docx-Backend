import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Check,
  CheckCheck,
  LoaderCircle,
  MessageSquareText,
  MoreVertical,
  Pencil,
  Search,
  Send,
  Trash2,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { io } from "socket.io-client";
import api from "@/shared/lib/api";
import { API_ORIGIN } from "@/shared/lib/apiBase";
import { getStoredAuthSession } from "@/shared/lib/authSession";
import {
  decorateConversationForDisplay,
  decorateConversationsForDisplay,
  decorateMessageForDisplay,
  decorateMessagesForDisplay,
  encryptTextForUsers,
  ensurePublishedEncryptionKey,
  fetchConversationEncryptionUsers,
} from "@/shared/features/Messaging/e2ee";
import "@/shared/features/Messaging/MessagingInbox.css";

const CONNECTION_LABELS = {
  connecting: "Connecting",
  online: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

const MESSAGE_STATUS_LABELS = {
  sending: "Sending...",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
};

const getStoredUser = () => {
  const session = getStoredAuthSession();
  return session?.accessToken ? session : null;
};

const formatConversationTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  return date.toLocaleString([], {
    month: isSameDay ? undefined : "short",
    day: isSameDay ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMessageTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mergeUniqueMessage = (messages, nextMessage) => {
  const messageId = String(nextMessage?._id || "");
  const clientMessageId = String(nextMessage?.clientMessageId || "");
  let replaced = false;

  const merged = messages.map((message) => {
    if (
      (messageId && String(message._id) === messageId) ||
      (clientMessageId && String(message.clientMessageId || "") === clientMessageId)
    ) {
      replaced = true;
      return {
        ...message,
        ...nextMessage,
        optimistic: false,
      };
    }

    return message;
  });

  if (!replaced) {
    merged.push(nextMessage);
  }

  return merged.sort(
    (first, second) =>
      new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime()
  );
};

const applyConversationPatch = (conversation, patch, viewerRole, onlineUsers) => {
  if (!conversation || conversation._id !== patch.conversationId) {
    return conversation;
  }

  const unreadCounts = patch.unreadCounts || conversation.unreadCounts || { patient: 0, doctor: 0 };

  return {
    ...conversation,
    lastMessage: patch.lastMessage ?? conversation.lastMessage,
    lastMessagePreview: patch.lastMessagePreview ?? conversation.lastMessagePreview,
    lastMessageEncrypted: patch.lastMessageEncrypted ?? conversation.lastMessageEncrypted,
    lastMessageEncryptionFailed:
      patch.lastMessageEncryptionFailed ?? conversation.lastMessageEncryptionFailed,
    lastMessageAt: patch.lastMessageAt ?? conversation.lastMessageAt,
    lastMessageSenderId: patch.lastMessageSenderId ?? conversation.lastMessageSenderId,
    unreadCounts,
    unreadCount: viewerRole === "patient" ? unreadCounts.patient : unreadCounts.doctor,
    participant: {
      ...conversation.participant,
      online:
        typeof onlineUsers.get(conversation.participant._id) === "boolean"
          ? onlineUsers.get(conversation.participant._id)
          : conversation.participant.online,
    },
  };
};

const sortConversations = (conversations) =>
  [...conversations].sort((first, second) => {
    const firstValue = new Date(first.lastMessageAt || 0).getTime();
    const secondValue = new Date(second.lastMessageAt || 0).getTime();
    return secondValue - firstValue;
  });

const MessagingInbox = ({ viewerRole }) => {
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);
  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const searchParamsRef = useRef({
    consumed: false,
  });
  const messageRefs = useRef(new Map());
  const messageListRef = useRef(null);
  const onlineUsersRef = useRef(new Map());
  const activeConversationIdRef = useRef("");
  const encryptionKeyCacheRef = useRef(new Map());

  const [connectionState, setConnectionState] = useState("connecting");
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [composerValue, setComposerValue] = useState("");
  const [listError, setListError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState({
    conversations: [],
    messages: [],
    doctors: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [pendingScrollMessageId, setPendingScrollMessageId] = useState("");
  const [contextMenuMessageId, setContextMenuMessageId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [encryptionError, setEncryptionError] = useState("");

  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation._id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const getEncryptionUsersForConversation = useCallback(
    async (conversationId) => {
      if (!conversationId || !currentUser?._id) {
        throw new Error("A signed-in user is required for encrypted messaging.");
      }

      await ensurePublishedEncryptionKey(api, currentUser._id);

      const cachedUsers = encryptionKeyCacheRef.current.get(conversationId);
      if (cachedUsers?.every((user) => user.publicKey)) {
        return cachedUsers;
      }

      const users = await fetchConversationEncryptionUsers(api, conversationId);
      const missingUsers = users.filter((user) => !user.publicKey);

      if (missingUsers.length) {
        throw new Error(
          "Encrypted messaging is waiting for the other participant to open Messages once."
        );
      }

      encryptionKeyCacheRef.current.set(conversationId, users);
      return users;
    },
    [currentUser?._id]
  );

  const searchGroups = useMemo(
    () => [
      {
        key: "conversations",
        label: "Contacts",
        items: searchResults.conversations,
      },
      {
        key: "doctors",
        label: "Doctors Directory",
        items: searchResults.doctors || [],
      },
      {
        key: "messages",
        label: "Messages",
        items: searchResults.messages,
      },
    ].filter((group) => group.items.length > 0),
    [searchResults]
  );

  useEffect(() => {
    const storageListener = () => {
      setCurrentUser(getStoredUser());
    };

    window.addEventListener("storage", storageListener);
    return () => window.removeEventListener("storage", storageListener);
  }, []);

  useEffect(() => {
    if (!currentUser?._id || !currentUser?.accessToken) {
      setEncryptionReady(false);
      return undefined;
    }

    let cancelled = false;
    setEncryptionError("");
    setEncryptionReady(false);

    ensurePublishedEncryptionKey(api, currentUser._id)
      .then(() => {
        if (!cancelled) {
          setEncryptionReady(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEncryptionError(
            error.response?.data?.message ||
              error.message ||
              "Encrypted messaging could not be initialized."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?._id, currentUser?.accessToken]);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput]);

  const loadConversations = async ({ preferredConversationId = "", preferredParticipantId = "" } = {}) => {
    setLoadingConversations(true);
    setListError("");

    try {
      const { data } = await api.get("/chat/conversations");
      const nextConversations = sortConversations(
        await decorateConversationsForDisplay(data.conversations || [], currentUser?._id)
      );

      setOnlineUsers(
        new Map(
          nextConversations.map((conversation) => [
            conversation.participant._id,
            Boolean(conversation.participant.online),
          ])
        )
      );
      setConversations(nextConversations);

      const explicitConversation =
        preferredConversationId &&
        nextConversations.find((conversation) => conversation._id === preferredConversationId);

      if (explicitConversation) {
        setActiveConversationId(explicitConversation._id);
        return explicitConversation._id;
      }

      if (preferredParticipantId) {
        const existingConversation = nextConversations.find(
          (conversation) => conversation.participant._id === preferredParticipantId
        );

        if (existingConversation) {
          setActiveConversationId(existingConversation._id);
          return existingConversation._id;
        }
      }

      if (!activeConversationId && nextConversations.length > 0) {
        setActiveConversationId(nextConversations[0]._id);
        return nextConversations[0]._id;
      }

      if (
        activeConversationId &&
        nextConversations.some((conversation) => conversation._id === activeConversationId)
      ) {
        return activeConversationId;
      }

      if (nextConversations.length === 0) {
        setActiveConversationId("");
      }

      return "";
    } catch (error) {
      setListError(error.response?.data?.message || "We couldn’t load your conversations.");
      return "";
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId, { focusMessageId = "" } = {}) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setThreadError("");

    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(await decorateMessagesForDisplay(data.messages || [], currentUser?._id));

      const summary = data.conversation
        ? await decorateConversationForDisplay(data.conversation, currentUser?._id)
        : null;
      if (summary) {
        setConversations((current) =>
          sortConversations(
            current.map((conversation) =>
              conversation._id === summary._id ? summary : conversation
            )
          )
        );
      }

      if (focusMessageId) {
        setPendingScrollMessageId(focusMessageId);
      }

      await api.post(`/chat/conversations/${conversationId}/read`);
      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation._id === conversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                  unreadCounts: {
                    ...(conversation.unreadCounts || {}),
                    [viewerRole]: 0,
                  },
                }
              : conversation
          )
        )
      );
    } catch (error) {
      setThreadError(error.response?.data?.message || "We couldn’t load this thread.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const openConversationForParticipant = async (participantUserId, { focusMessageId = "" } = {}) => {
    try {
      const { data } = await api.post("/chat/conversations/open", {
        participantUserId,
      });
      const summary = await decorateConversationForDisplay(data.conversation, currentUser?._id);

      setConversations((current) => {
        const exists = current.some((conversation) => conversation._id === summary._id);
        const merged = exists
          ? current.map((conversation) => (conversation._id === summary._id ? summary : conversation))
          : [summary, ...current];

        return sortConversations(merged);
      });
      setActiveConversationId(summary._id);

      if (focusMessageId) {
        setPendingScrollMessageId(focusMessageId);
      }

      return summary._id;
    } catch (error) {
      setListError(error.response?.data?.message || "We couldn’t open that conversation.");
      return "";
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preferredConversationId = params.get("conversation") || "";
    const preferredParticipantId = params.get("participant") || "";
    const preferredMessageId = params.get("message") || "";

    const bootstrap = async () => {
      const loadedConversationId = await loadConversations({
        preferredConversationId,
        preferredParticipantId,
      });

      const fallbackConversationId =
        loadedConversationId ||
        preferredConversationId ||
        (preferredParticipantId
          ? await openConversationForParticipant(preferredParticipantId, {
              focusMessageId: preferredMessageId,
            })
          : "");

      if (fallbackConversationId) {
        await loadMessages(fallbackConversationId, {
          focusMessageId: preferredMessageId,
        });
      }
    };

    if (!searchParamsRef.current.consumed) {
      searchParamsRef.current.consumed = true;
      bootstrap();
      return;
    }

    loadConversations();
  }, [location.search]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!currentUser?.accessToken) {
      return undefined;
    }

    const socket = io(API_ORIGIN || undefined, {
      path: "/socket.io",
      auth: {
        token: currentUser.accessToken,
      },
      withCredentials: true,
    });

    socketRef.current = socket;
    setConnectionState("connecting");

    socket.on("connect", () => {
      setConnectionState("online");
    });

    socket.on("disconnect", () => {
      setConnectionState("offline");
    });

    socket.io.on("reconnect_attempt", () => {
      setConnectionState("reconnecting");
    });

    socket.on("message:new", async ({ conversationId, message }) => {
      const displayMessage = await decorateMessageForDisplay(message, currentUser?._id);

      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation._id === conversationId
              ? {
                  ...conversation,
                  lastMessage: message.content,
                  lastMessagePreview: displayMessage.decryptedContent,
                  lastMessageEncrypted: Boolean(displayMessage.encrypted),
                  lastMessageEncryptionFailed: Boolean(displayMessage.encryptionFailed),
                  lastMessageAt: message.createdAt,
                }
              : conversation
          )
        )
      );

      if (conversationId === activeConversationIdRef.current) {
        setMessages((current) => mergeUniqueMessage(current, displayMessage));
        setPendingScrollMessageId(String(message._id));
        try {
          const { data } = await api.post(`/chat/conversations/${conversationId}/read`);
          if (Array.isArray(data.messageIds) && data.messageIds.length) {
            setMessages((current) =>
              current.map((currentMessage) =>
                data.messageIds.includes(currentMessage._id)
                  ? { ...currentMessage, status: "read", read: true }
                  : currentMessage
              )
            );
          }
        } catch (error) {
          console.error("Failed to mark active conversation as read", error);
        }
      }
    });

    socket.on("message:ack", async ({ conversationId, message }) => {
      if (conversationId !== activeConversationIdRef.current) {
        return;
      }

      const displayMessage = await decorateMessageForDisplay(message, currentUser?._id);
      setMessages((current) => mergeUniqueMessage(current, displayMessage));
    });

    socket.on("conversation:updated", async (patch) => {
      const displayPatch = await decorateConversationForDisplay(
        {
          _id: patch.conversationId,
          lastMessage: patch.lastMessage,
          lastMessageAt: patch.lastMessageAt,
        },
        currentUser?._id
      );

      setConversations((current) => {
        if (!current.some((conversation) => conversation._id === patch.conversationId)) {
          loadConversations();
          return current;
        }

        return sortConversations(
          current.map((conversation) =>
            applyConversationPatch(
              conversation,
              {
                ...patch,
                lastMessagePreview: displayPatch.lastMessagePreview,
                lastMessageEncrypted: displayPatch.lastMessageEncrypted,
                lastMessageEncryptionFailed: displayPatch.lastMessageEncryptionFailed,
              },
              viewerRole,
              onlineUsersRef.current
            )
          )
        );
      });
    });

    socket.on("conversation:read", ({ conversationId, messageIds }) => {
      if (conversationId !== activeConversationIdRef.current || !Array.isArray(messageIds)) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          messageIds.includes(message._id)
            ? { ...message, status: "read", read: true }
            : message
        )
      );
    });

    socket.on("message:edited", async ({ conversationId, message }) => {
      if (conversationId !== activeConversationIdRef.current) {
        return;
      }
      const displayMessage = await decorateMessageForDisplay(message, currentUser?._id);
      setMessages((current) =>
        current.map((m) =>
          String(m._id) === String(message._id) ? { ...m, ...displayMessage } : m
        )
      );
    });

    socket.on("message:deleted", async ({ conversationId, message }) => {
      if (conversationId !== activeConversationIdRef.current) {
        return;
      }
      const displayMessage = await decorateMessageForDisplay(message, currentUser?._id);
      setMessages((current) =>
        current.map((m) =>
          String(m._id) === String(message._id) ? { ...m, ...displayMessage } : m
        )
      );
    });

    socket.on("presence:changed", ({ userId, online }) => {
      setOnlineUsers((current) => {
        const next = new Map(current);
        next.set(userId, Boolean(online));
        return next;
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.participant._id === userId
            ? {
                ...conversation,
                participant: {
                  ...conversation.participant,
                  online: Boolean(online),
                },
              }
            : conversation
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.accessToken, currentUser?._id, viewerRole]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults({
        conversations: [],
        messages: [],
        doctors: [],
      });
      setSearchLoading(false);
      return;
    }

    let ignore = false;
    setSearchLoading(true);

    api
      .get("/chat/search", {
        params: {
          query: debouncedSearch,
        },
      })
      .then(async ({ data }) => {
        if (ignore) return;
        const conversationResults = await decorateConversationsForDisplay(
          data.conversations || [],
          currentUser?._id
        );
        setSearchResults({
          conversations: conversationResults,
          messages: data.messages || [],
          doctors: data.doctors || [],
        });
      })
      .catch((error) => {
        if (ignore) return;
        setListError(error.response?.data?.message || "Search is unavailable right now.");
      })
      .finally(() => {
        if (!ignore) {
          setSearchLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, currentUser?._id]);

  useEffect(() => {
    if (!pendingScrollMessageId) {
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    const node = messageRefs.current.get(pendingScrollMessageId);
    if (!node) {
      return;
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    setHighlightedMessageId(pendingScrollMessageId);

    const timeoutId = window.setTimeout(() => {
      setHighlightedMessageId("");
      setPendingScrollMessageId("");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [messages, pendingScrollMessageId]);

  const submitMessage = async () => {
    const trimmedValue = composerValue.trim();
    if (!trimmedValue || !activeConversationId || !currentUser?._id) {
      return;
    }

    const clientMessageId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSendingMessage(true);
    setThreadError("");

    let encryptedContent = "";

    try {
      const encryptionUsers = await getEncryptionUsersForConversation(activeConversationId);
      encryptedContent = await encryptTextForUsers(trimmedValue, encryptionUsers);
    } catch (error) {
      setThreadError(error.message || "Message could not be encrypted.");
      setSendingMessage(false);
      return;
    }

    const optimisticMessage = {
      _id: clientMessageId,
      conversationId: activeConversationId,
      sender: {
        _id: currentUser._id,
        name: currentUser.name,
        role: currentUser.role,
      },
      recipient: {
        _id: activeConversation?.participant?._id,
      },
      content: encryptedContent,
      decryptedContent: trimmedValue,
      encrypted: true,
      clientMessageId,
      status: "sending",
      read: false,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((current) => mergeUniqueMessage(current, optimisticMessage));
    setComposerValue("");

    try {
      const { data } = await api.post(`/chat/conversations/${activeConversationId}/messages`, {
        content: encryptedContent,
        clientMessageId,
      });

      const displayMessage = await decorateMessageForDisplay(data.message, currentUser?._id);
      setMessages((current) => mergeUniqueMessage(current, displayMessage));
      if (data.conversation) {
        const summary = await decorateConversationForDisplay(data.conversation, currentUser?._id);
        setConversations((current) =>
          sortConversations(
            current.map((conversation) =>
              conversation._id === summary._id ? summary : conversation
            )
          )
        );
      }
    } catch (error) {
      setThreadError(error.response?.data?.message || "Message could not be sent.");
      setMessages((current) =>
        current.map((message) =>
          message.clientMessageId === clientMessageId
            ? { ...message, status: "failed", optimistic: false }
            : message
        )
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditMessage = async (messageId) => {
    const trimmed = editingContent.trim();
    if (!trimmed || !activeConversationId) return;

    try {
      const encryptionUsers = await getEncryptionUsersForConversation(activeConversationId);
      const encryptedContent = await encryptTextForUsers(trimmed, encryptionUsers);
      const { data } = await api.put(
        `/chat/conversations/${activeConversationId}/messages/${messageId}`,
        { content: encryptedContent }
      );
      const displayMessage = await decorateMessageForDisplay(data.message, currentUser?._id);
      setMessages((current) =>
        current.map((m) =>
          String(m._id) === String(messageId) ? { ...m, ...displayMessage } : m
        )
      );
    } catch (error) {
      setThreadError(error.response?.data?.message || "Could not edit message.");
    } finally {
      setEditingMessageId("");
      setEditingContent("");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeConversationId) return;

    try {
      const { data } = await api.delete(
        `/chat/conversations/${activeConversationId}/messages/${messageId}`
      );
      const displayMessage = await decorateMessageForDisplay(data.message, currentUser?._id);
      setMessages((current) =>
        current.map((m) =>
          String(m._id) === String(messageId) ? { ...m, ...displayMessage } : m
        )
      );
    } catch (error) {
      setThreadError(error.response?.data?.message || "Could not delete message.");
    } finally {
      setDeletingMessageId("");
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenuMessageId) return;
    const handler = () => setContextMenuMessageId("");
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenuMessageId]);

  const openSearchConversation = async (conversationId, messageId = "") => {
    setActiveConversationId(conversationId);
    setSearchInput("");
    setSearchResults({
      conversations: [],
      messages: [],
      doctors: [],
    });
    await loadMessages(conversationId, {
      focusMessageId: messageId,
    });
  };

  const openSearchMessageResult = async (messageResult) => {
    const existingConversation = conversations.find(
      (conversation) => conversation._id === messageResult.conversationId
    );

    if (!existingConversation) {
      await loadConversations({
        preferredConversationId: messageResult.conversationId,
      });
    }

    await openSearchConversation(messageResult.conversationId, messageResult._id);
  };

  return (
    <div className={`messaging-page messaging-page--${viewerRole}`}>
      <div className="messaging-shell">
        <div className="messaging-layout">


          <aside className="messaging-sidebar">
            <div className="messaging-sidebar__header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2>Messages</h2>
                  {conversations.length > 0 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: '999px' }}>
                      {conversations.length}
                    </span>
                  )}
                </div>
                <div className={`messaging-connection messaging-connection--${connectionState}`}>
                  {connectionState === "online" ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span>{CONNECTION_LABELS[connectionState]}</span>
                </div>
              </div>
            </div>

            <div className="messaging-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search contacts and doctors"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              {searchLoading ? <LoaderCircle size={16} className="spin" /> : null}
            </div>

            {searchInput.trim().length >= 2 ? (
              <div className="messaging-search-results">
                {searchGroups.length === 0 && !searchLoading ? (
                  <div className="messaging-empty messaging-empty--compact">
                    <MessageSquareText size={18} />
                    <span>No matches for “{searchInput.trim()}”.</span>
                  </div>
                ) : (
                  searchGroups.map((group) => (
                    <div key={group.key} className="messaging-search-results__group">
                      <span className="messaging-search-results__label">{group.label}</span>
                      {group.items.map((item) => (
                        <button
                          key={`${group.key}-${item._id}`}
                          type="button"
                          className="messaging-search-result"
                          onClick={async () => {
                            if (group.key === "conversations") {
                              openSearchConversation(item._id);
                            } else if (group.key === "doctors") {
                              await openConversationForParticipant(item.participant._id);
                              setSearchInput("");
                              setSearchResults({ conversations: [], messages: [], doctors: [] });
                            } else {
                              openSearchMessageResult(item);
                            }
                          }}
                        >
                          <div className="messaging-search-result__icon">
                            {group.key === "conversations" || group.key === "doctors" ? (
                              <UserRound size={15} />
                            ) : (
                              <MessageSquareText size={15} />
                            )}
                          </div>
                          <div className="messaging-search-result__copy">
                            <strong>{item.participant?.name || item.title || "Conversation"}</strong>
                            <span>
                              {group.key === "conversations"
                                ? item.participant?.specialization ||
                                  item.lastMessagePreview ||
                                  "Conversation"
                                : group.key === "doctors"
                                  ? item.participant?.specialization || "Doctor"
                                : item.snippet}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {listError ? <div className="messaging-banner messaging-banner--error">{listError}</div> : null}
            {encryptionError ? (
              <div className="messaging-banner messaging-banner--error">{encryptionError}</div>
            ) : null}
            {!encryptionError && currentUser?._id ? (
              <div className="messaging-banner messaging-banner--secure">
                {encryptionReady
                  ? "End-to-end encryption is active on this device."
                  : "Preparing end-to-end encryption..."}
              </div>
            ) : null}

            <div className="messaging-conversation-list">
              {loadingConversations ? (
                <div className="messaging-empty">
                  <LoaderCircle size={20} className="spin" />
                  <span>Loading your conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="messaging-empty">
                  <MessageSquareText size={20} />
                  <span>No conversations yet. Appointment-linked chats will appear here.</span>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    type="button"
                    className={`messaging-conversation ${
                      conversation._id === activeConversationId ? "is-active" : ""
                    }`}
                    onClick={() => setActiveConversationId(conversation._id)}
                  >
                    <div className="messaging-avatar">
                      <span>{conversation.participant.name.charAt(0)}</span>
                      {onlineUsers.get(conversation.participant._id) || conversation.participant.online ? (
                        <i />
                      ) : null}
                    </div>
                    <div className="messaging-conversation__copy">
                      <div className="messaging-conversation__topline">
                        <strong>{conversation.participant.name}</strong>
                        <span>{formatConversationTime(conversation.lastMessageAt)}</span>
                      </div>
                      <p>
                        {conversation.participant.specialization ||
                          (conversation.participant.role === "doctor" ? "Doctor" : "Patient")}
                      </p>
                      <div className="messaging-conversation__bottomline">
                        <span>
                          {conversation.lastMessagePreview ||
                            (conversation.lastMessageAt
                              ? "Encrypted message"
                              : "Start your care conversation")}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <b>{conversation.unreadCount}</b>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="messaging-thread">
            {activeConversation ? (
              <>
                <div className="messaging-thread__header">
                  <div className="messaging-avatar" style={{ width: '38px', height: '38px', fontSize: '0.9rem' }}>
                    <span>{activeConversation.participant.name.charAt(0)}</span>
                    {(onlineUsers.get(activeConversation.participant._id) || activeConversation.participant.online) ? <i /> : null}
                  </div>
                  <div>
                    <h2>{activeConversation.participant.name}</h2>
                    <p>
                      {activeConversation.participant.specialization ||
                        (activeConversation.participant.role === "doctor"
                          ? "Doctor"
                          : "Patient")}
                    </p>
                  </div>
                  <div className="messaging-thread__presence">
                    <span
                      className={`messaging-thread__presence-dot ${
                        onlineUsers.get(activeConversation.participant._id) ||
                        activeConversation.participant.online
                          ? "is-online"
                          : ""
                      }`}
                    />
                    {onlineUsers.get(activeConversation.participant._id) ||
                    activeConversation.participant.online
                      ? "Online"
                      : "Offline"}
                  </div>
                </div>

                {threadError ? (
                  <div className="messaging-banner messaging-banner--error">{threadError}</div>
                ) : null}

                <div className="messaging-message-list" ref={messageListRef}>
                  {loadingMessages ? (
                    <div className="messaging-empty">
                      <LoaderCircle size={20} className="spin" />
                      <span>Loading the conversation...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="messaging-empty">
                      <MessageSquareText size={20} />
                      <span>No messages yet. Start the conversation with a clear next step.</span>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isMine =
                        String(message.sender?._id || message.sender) === String(currentUser?._id || "");
                      const isEditing = editingMessageId === message._id;
                      const isDeleting = deletingMessageId === message._id;
                      const showContextMenu = contextMenuMessageId === message._id;

                      return (
                        <article
                          key={message._id}
                          ref={(node) => {
                            if (node) {
                              messageRefs.current.set(message._id, node);
                            } else {
                              messageRefs.current.delete(message._id);
                            }
                          }}
                          className={`messaging-message ${
                            isMine ? "messaging-message--mine" : "messaging-message--theirs"
                          } ${highlightedMessageId === message._id ? "is-highlighted" : ""} ${
                            message.deleted ? "messaging-message--deleted" : ""
                          }`}
                        >
                          {/* Context menu trigger for own non-deleted messages */}
                          {isMine && !message.deleted && !message.optimistic && !message.encryptionFailed && (
                            <div className="messaging-message__actions">
                              <button
                                type="button"
                                className="messaging-message__actions-trigger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenuMessageId(
                                    showContextMenu ? "" : message._id
                                  );
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {showContextMenu && (
                                <div className="messaging-message__context-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId(message._id);
                                      setEditingContent(message.decryptedContent || message.content || "");
                                      setContextMenuMessageId("");
                                    }}
                                  >
                                    <Pencil size={14} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="messaging-context-delete"
                                    onClick={() => {
                                      setDeletingMessageId(message._id);
                                      setContextMenuMessageId("");
                                    }}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="messaging-message__bubble">
                            {isEditing ? (
                              <div className="messaging-message__edit-form">
                                <textarea
                                  className="messaging-message__edit-input"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleEditMessage(message._id);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingMessageId("");
                                      setEditingContent("");
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="messaging-message__edit-actions">
                                  <button
                                    type="button"
                                    className="messaging-edit-cancel"
                                    onClick={() => {
                                      setEditingMessageId("");
                                      setEditingContent("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="messaging-edit-save"
                                    onClick={() => handleEditMessage(message._id)}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : isDeleting ? (
                              <div className="messaging-message__delete-confirm">
                                <p>Delete this message?</p>
                                <div className="messaging-message__edit-actions">
                                  <button
                                    type="button"
                                    className="messaging-edit-cancel"
                                    onClick={() => setDeletingMessageId("")}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="messaging-delete-confirm-btn"
                                    onClick={() => handleDeleteMessage(message._id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p>{message.decryptedContent ?? message.content}</p>
                                <div className="messaging-message__meta">
                                  <span>{formatMessageTime(message.createdAt)}</span>
                                  {message.edited && !message.deleted && (
                                    <span className="messaging-message__edited-label">edited</span>
                                  )}
                                  {isMine ? (
                                    <span className="messaging-message__status">
                                      {message.status === "read" ? (
                                        <CheckCheck size={14} />
                                      ) : (
                                        <Check size={14} />
                                      )}
                                      {MESSAGE_STATUS_LABELS[message.status] || MESSAGE_STATUS_LABELS.sent}
                                    </span>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>

                <div className="messaging-composer">
                  <textarea
                    placeholder="Type your message..."
                    value={composerValue}
                    onChange={(event) => setComposerValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submitMessage();
                      }
                    }}
                  />
                  <button
                    className="messaging-composer-submit"
                    type="button"
                    onClick={submitMessage}
                    disabled={sendingMessage || !encryptionReady || Boolean(encryptionError)}
                  >
                    {sendingMessage ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
                  </button>
                </div>
              </>
            ) : (
              <div className="messaging-thread__empty">
                <MessageSquareText size={24} />
                <h2>Select a conversation</h2>
                <p>Choose a contact from the left or search for a message to jump back in.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MessagingInbox;
