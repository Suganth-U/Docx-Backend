const E2EE_MESSAGE_TYPE = "docx.e2ee.message";
const E2EE_MESSAGE_VERSION = 1;
const AES_ALGORITHM = "AES-GCM-256";
const RSA_ALGORITHM = "RSA-OAEP-256";
const STORAGE_PREFIX = "docx_messaging_e2ee_v1";

const getSubtleCrypto = () => {
  if (!window.crypto?.subtle) {
    throw new Error("Secure browser crypto is not available in this session.");
  }

  return window.crypto.subtle;
};

const getStorageKey = (userId, keyName) => `${STORAGE_PREFIX}:${userId}:${keyName}`;

const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const parseJsonStorage = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const rsaParams = {
  name: "RSA-OAEP",
  hash: "SHA-256",
};

const isSamePublicKey = (firstKey, secondKey) =>
  Boolean(firstKey && secondKey && JSON.stringify(firstKey) === JSON.stringify(secondKey));

const parseEncryptedEnvelope = (value = "") => {
  try {
    const payload = JSON.parse(String(value || ""));

    if (
      payload?.v === E2EE_MESSAGE_VERSION &&
      payload?.type === E2EE_MESSAGE_TYPE &&
      payload?.alg === AES_ALGORITHM &&
      payload?.keyAlg === RSA_ALGORITHM &&
      typeof payload?.iv === "string" &&
      typeof payload?.ciphertext === "string" &&
      payload?.keys &&
      typeof payload.keys === "object"
    ) {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
};

export const isEncryptedEnvelope = (value = "") => Boolean(parseEncryptedEnvelope(value));

export const ensureLocalKeyPair = async (userId) => {
  if (!userId) {
    throw new Error("A signed-in user is required for encrypted messaging.");
  }

  const publicStorageKey = getStorageKey(userId, "publicKey");
  const privateStorageKey = getStorageKey(userId, "privateKey");
  const existingPublicKey = parseJsonStorage(publicStorageKey);
  const existingPrivateKey = parseJsonStorage(privateStorageKey);

  if (existingPublicKey && existingPrivateKey) {
    return {
      publicKey: existingPublicKey,
      privateKey: existingPrivateKey,
    };
  }

  const subtle = getSubtleCrypto();
  const keyPair = await subtle.generateKey(
    {
      ...rsaParams,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["encrypt", "decrypt"]
  );
  const [publicKey, privateKey] = await Promise.all([
    subtle.exportKey("jwk", keyPair.publicKey),
    subtle.exportKey("jwk", keyPair.privateKey),
  ]);

  localStorage.setItem(publicStorageKey, JSON.stringify(publicKey));
  localStorage.setItem(privateStorageKey, JSON.stringify(privateKey));

  return {
    publicKey,
    privateKey,
  };
};

export const ensurePublishedEncryptionKey = async (apiClient, userId) => {
  const localKeys = await ensureLocalKeyPair(userId);

  try {
    const { data } = await apiClient.get("/chat/encryption-key");

    if (!isSamePublicKey(data.publicKey, localKeys.publicKey)) {
      await apiClient.post("/chat/encryption-key", {
        publicKey: localKeys.publicKey,
        publicKeyAlgorithm: RSA_ALGORITHM,
      });
    }
  } catch (error) {
    if (error.response) {
      throw error;
    }

    await apiClient.post("/chat/encryption-key", {
      publicKey: localKeys.publicKey,
      publicKeyAlgorithm: RSA_ALGORITHM,
    });
  }

  return localKeys;
};

const importPublicKey = (publicKeyJwk) =>
  getSubtleCrypto().importKey("jwk", publicKeyJwk, rsaParams, true, ["encrypt"]);

const importPrivateKey = (privateKeyJwk) =>
  getSubtleCrypto().importKey("jwk", privateKeyJwk, rsaParams, true, ["decrypt"]);

export const fetchConversationEncryptionUsers = async (apiClient, conversationId) => {
  const { data } = await apiClient.get(`/chat/conversations/${conversationId}/encryption-keys`);
  return data.users || [];
};

export const encryptTextForUsers = async (plainText, users) => {
  const recipients = (users || []).filter((user) => user?._id && user.publicKey);

  if (recipients.length !== (users || []).length || recipients.length < 2) {
    throw new Error("Encrypted messaging is not ready for this conversation yet.");
  }

  const subtle = getSubtleCrypto();
  const aesKey = await subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  const rawAesKey = new Uint8Array(await subtle.exportKey("raw", aesKey));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = new TextEncoder().encode(plainText);
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      aesKey,
      plaintextBytes
    )
  );
  const keyEntries = await Promise.all(
    recipients.map(async (user) => {
      const publicKey = await importPublicKey(user.publicKey);
      const wrappedKey = new Uint8Array(
        await subtle.encrypt(
          {
            name: "RSA-OAEP",
          },
          publicKey,
          rawAesKey
        )
      );

      return [String(user._id), bytesToBase64(wrappedKey)];
    })
  );

  return JSON.stringify({
    v: E2EE_MESSAGE_VERSION,
    type: E2EE_MESSAGE_TYPE,
    alg: AES_ALGORITHM,
    keyAlg: RSA_ALGORITHM,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    keys: Object.fromEntries(keyEntries),
  });
};

export const decryptMessageContent = async (content, userId) => {
  const envelope = parseEncryptedEnvelope(content);

  if (!envelope) {
    return {
      text: String(content || ""),
      encrypted: false,
      failed: false,
    };
  }

  try {
    const privateKeyJwk = parseJsonStorage(getStorageKey(userId, "privateKey"));
    const wrappedKey = envelope.keys?.[String(userId)];

    if (!privateKeyJwk || !wrappedKey) {
      throw new Error("Missing local decryption key.");
    }

    const subtle = getSubtleCrypto();
    const privateKey = await importPrivateKey(privateKeyJwk);
    const rawAesKey = await subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      base64ToBytes(wrappedKey)
    );
    const aesKey = await subtle.importKey("raw", rawAesKey, { name: "AES-GCM" }, false, [
      "decrypt",
    ]);
    const decryptedBytes = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(envelope.iv),
      },
      aesKey,
      base64ToBytes(envelope.ciphertext)
    );

    return {
      text: new TextDecoder().decode(decryptedBytes),
      encrypted: true,
      failed: false,
    };
  } catch {
    return {
      text: "Unable to decrypt this message on this device.",
      encrypted: true,
      failed: true,
    };
  }
};

export const decorateMessageForDisplay = async (message, userId) => {
  if (message?.deleted) {
    return {
      ...message,
      decryptedContent: "This message was deleted",
      encryptionFailed: false,
    };
  }

  const result = await decryptMessageContent(message?.content || "", userId);

  return {
    ...message,
    decryptedContent: result.text,
    encrypted: result.encrypted || Boolean(message?.encrypted),
    encryptionFailed: result.failed,
  };
};

export const decorateMessagesForDisplay = (messages, userId) =>
  Promise.all((messages || []).map((message) => decorateMessageForDisplay(message, userId)));

export const decorateConversationForDisplay = async (conversation, userId) => {
  if (!conversation) return conversation;

  if (!conversation.lastMessage && conversation.lastMessageAt) {
    return {
      ...conversation,
      lastMessagePreview: "Message deleted",
    };
  }

  const result = await decryptMessageContent(conversation.lastMessage || "", userId);

  return {
    ...conversation,
    lastMessagePreview: result.text || "",
    lastMessageEncrypted: result.encrypted,
    lastMessageEncryptionFailed: result.failed,
  };
};

export const decorateConversationsForDisplay = (conversations, userId) =>
  Promise.all(
    (conversations || []).map((conversation) =>
      decorateConversationForDisplay(conversation, userId)
    )
  );
