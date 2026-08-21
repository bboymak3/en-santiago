/**
 * HolaX - AI Chatbot Widget Module
 * Floating AI chatbot using z-ai-web-dev-sdk via a proxy API endpoint
 * Checks admin_settings for ai_chatbot_enabled before rendering
 */

(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────
  let isOpen = false;
  let isSending = false;
  let messages = [];
  let welcomeMessage = '';
  let settingsChecked = false;

  // ─── Constants ────────────────────────────────────────────
  const STORAGE_KEY = 'aunclick_aichat_history';
  const SETTINGS_CACHE_KEY = 'aunclick_aichat_settings_cache';
  const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ─── XSS Prevention ───────────────────────────────────────
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Create Widget ────────────────────────────────────────
  function createWidget() {
    if (document.getElementById('aiChatWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'aiChatWidget';
    widget.innerHTML = `
      <!-- Chat Button (floating) -->
      <button class="ai-chat-btn" id="aiChatBtn" aria-label="Asistente IA">
        <i class="fas fa-robot"></i>
        <span class="ai-chat-btn-pulse"></span>
      </button>

      <!-- Chat Panel -->
      <div class="ai-chat-panel" id="aiChatPanel">
        <!-- Header -->
        <div class="ai-chat-header">
          <div class="ai-chat-header-left">
            <div class="ai-chat-header-icon">
              <i class="fas fa-robot"></i>
            </div>
            <div>
              <h3>Asistente HolaX</h3>
              <span class="ai-chat-status"><i class="fas fa-circle"></i> En línea</span>
            </div>
          </div>
          <button class="ai-chat-close-btn" id="aiChatCloseBtn" aria-label="Cerrar chat">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Messages Body -->
        <div class="ai-chat-body" id="aiChatBody">
          <!-- Welcome message rendered dynamically -->
        </div>

        <!-- Input Area -->
        <div class="ai-chat-input-area">
          <div class="ai-chat-input-wrap">
            <input
              type="text"
              id="aiChatInput"
              class="ai-chat-input"
              placeholder="Escribe tu pregunta..."
              maxlength="500"
              autocomplete="off"
            >
            <button class="ai-chat-send-btn" id="aiChatSendBtn" aria-label="Enviar">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    setupListeners();
    injectStyles();
  }

  // ─── Setup Event Listeners ──────────────────────────────
  function setupListeners() {
    const chatBtn = document.getElementById('aiChatBtn');
    const closeBtn = document.getElementById('aiChatCloseBtn');
    const sendBtn = document.getElementById('aiChatSendBtn');
    const input = document.getElementById('aiChatInput');

    if (chatBtn) chatBtn.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Auto-focus on panel open
      input.addEventListener('focus', function () {
        // Remove placeholder animation on focus
        this.classList.add('focused');
      });

      input.addEventListener('blur', function () {
        this.classList.remove('focused');
      });
    }
  }

  // ─── Toggle / Open / Close ───────────────────────────────
  function toggleChat() {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function openChat() {
    isOpen = true;
    const panel = document.getElementById('aiChatPanel');
    const chatBtn = document.getElementById('aiChatBtn');
    if (panel) panel.classList.add('ai-chat-open');
    if (chatBtn) chatBtn.classList.add('ai-chat-active');

    // Render messages if body is empty
    const body = document.getElementById('aiChatBody');
    if (body && body.children.length === 0) {
      renderAllMessages();
    }

    // Focus input
    setTimeout(() => {
      const input = document.getElementById('aiChatInput');
      if (input) input.focus();
    }, 350);
  }

  function closeChat() {
    isOpen = false;
    const panel = document.getElementById('aiChatPanel');
    const chatBtn = document.getElementById('aiChatBtn');
    if (panel) panel.classList.remove('ai-chat-open');
    if (chatBtn) chatBtn.classList.remove('ai-chat-active');
  }

  // ─── Render Messages ───────────────────────────────────────
  function renderAllMessages() {
    const body = document.getElementById('aiChatBody');
    if (!body) return;

    body.innerHTML = '';

    // Welcome message
    if (welcomeMessage) {
      addMessageToDOM(welcomeMessage, 'bot');
    }

    // History messages
    if (messages.length > 0) {
      messages.forEach(msg => {
        addMessageToDOM(msg.text, msg.role);
      });
    }

    scrollToBottom();
  }

  function addMessageToDOM(text, role) {
    const body = document.getElementById('aiChatBody');
    if (!body) return;

    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble' + (role === 'user' ? ' ai-msg-user' : ' ai-msg-bot');

    const icon = role === 'user'
      ? '<i class="fas fa-user"></i>'
      : '<i class="fas fa-robot"></i>';

    bubble.innerHTML = `
      <div class="ai-msg-icon">${icon}</div>
      <div class="ai-msg-content">${escapeHTML(text)}</div>
    `;

    body.appendChild(bubble);
    scrollToBottom();
  }

  // ─── Typing Indicator ─────────────────────────────────────
  function showTypingIndicator() {
    const body = document.getElementById('aiChatBody');
    if (!body) return;

    const indicator = document.createElement('div');
    indicator.className = 'ai-msg-bubble ai-msg-bot ai-msg-typing';
    indicator.id = 'aiTypingIndicator';
    indicator.innerHTML = `
      <div class="ai-msg-icon"><i class="fas fa-robot"></i></div>
      <div class="ai-msg-content">
        <div class="ai-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;

    body.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('aiTypingIndicator');
    if (indicator) indicator.remove();
  }

  // ─── Send Message ─────────────────────────────────────────
  async function sendMessage() {
    const input = document.getElementById('aiChatInput');
    if (!input || isSending) return;

    const text = input.value.trim();
    if (!text) return;

    // Clear input
    input.value = '';

    // Render user message
    addMessageToDOM(text, 'user');

    // Save to history
    messages.push({ role: 'user', text: text, timestamp: Date.now() });

    // Show typing indicator
    showTypingIndicator();
    isSending = true;

    // Update send button
    const sendBtn = document.getElementById('aiChatSendBtn');
    if (sendBtn) sendBtn.classList.add('ai-sending');

    try {
      const data = await api.post('/ai-chat', { message: text });
      const reply = data.reply || data.response || data.message || 'Lo siento, no pude procesar tu solicitud en este momento.';

      removeTypingIndicator();
      addMessageToDOM(reply, 'bot');

      // Save bot message
      messages.push({ role: 'bot', text: reply, timestamp: Date.now() });

      // Persist to localStorage
      saveChatHistory();
    } catch (error) {
      removeTypingIndicator();

      let errorMsg = 'Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo.';
      if (error.message && error.message.includes('conexión')) {
        errorMsg = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
      }

      addMessageToDOM(errorMsg, 'bot');
      messages.push({ role: 'bot', text: errorMsg, timestamp: Date.now() });
      saveChatHistory();
    } finally {
      isSending = false;
      if (sendBtn) sendBtn.classList.remove('ai-sending');
    }
  }

  // ─── Chat History Persistence ──────────────────────────────
  function saveChatHistory() {
    try {
      // Keep only the last 20 messages
      const history = messages.slice(-20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage full or unavailable
    }
  }

  function loadChatHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        messages = JSON.parse(stored);
        // Clear messages older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        messages = messages.filter(m => m.timestamp && m.timestamp > oneDayAgo);
      }
    } catch {
      messages = [];
    }
  }

  function clearChatHistory() {
    messages = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  // ─── Check Settings ───────────────────────────────────────
  async function checkSettings() {
    // Check cache first
    try {
      const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < SETTINGS_CACHE_TTL) {
          return parsed;
        }
      }
    } catch {
      // Ignore cache errors
    }

    try {
      // Use the public settings endpoint (no auth required)
      const data = await fetch('/api/settings/public', {
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.ok ? r.json() : null).catch(() => null);

      const settings = data || {};
      const result = {
        enabled: settings.ai_chatbot_enabled === '1',
        welcome: settings.ai_chatbot_welcome || '',
        timestamp: Date.now()
      };

      // Cache result
      try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(result));
      } catch {
        // Ignore
      }

      return result;
    } catch {
      // Default: disabled (admin must explicitly enable)
      return {
        enabled: false,
        welcome: '',
        timestamp: Date.now()
      };
    }
  }

  // ─── Scroll Helper ────────────────────────────────────────
  function scrollToBottom() {
    const body = document.getElementById('aiChatBody');
    if (body) {
      requestAnimationFrame(() => {
        body.scrollTop = body.scrollHeight;
      });
    }
  }

  // ─── Inject CSS Styles ───────────────────────────────────
  function injectStyles() {
    if (document.getElementById('aiChatStyles')) return;

    const style = document.createElement('style');
    style.id = 'aiChatStyles';
    style.textContent = `
      /* ── AI Chat Widget ────────────────────────────── */

      /* Floating Button */
      .ai-chat-btn {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1a73e8, #4a90e8);
        color: #fff;
        border: none;
        box-shadow: 0 4px 18px rgba(26, 115, 232, 0.45);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3998;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1.4rem;
      }

      .ai-chat-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 24px rgba(26, 115, 232, 0.55);
      }

      .ai-chat-btn:active {
        transform: scale(0.95);
      }

      .ai-chat-btn.ai-chat-active {
        transform: scale(0) rotate(180deg);
        opacity: 0;
        pointer-events: none;
      }

      /* Pulse animation on button */
      .ai-chat-btn-pulse {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid rgba(26, 115, 232, 0.4);
        animation: ai-pulse-ring 2s ease-out infinite;
      }

      @keyframes ai-pulse-ring {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }

      .ai-chat-btn.ai-chat-active .ai-chat-btn-pulse {
        display: none;
      }

      /* Panel */
      .ai-chat-panel {
        position: fixed;
        bottom: 170px;
        right: 24px;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 500px;
        max-height: calc(100vh - 200px);
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08);
        z-index: 3999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.8) translateY(20px);
        transform-origin: bottom right;
        opacity: 0;
        visibility: hidden;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ai-chat-panel.ai-chat-open {
        transform: scale(1) translateY(0);
        opacity: 1;
        visibility: visible;
      }

      /* Header */
      .ai-chat-header {
        background: linear-gradient(135deg, #1a73e8, #1565c0);
        color: #fff;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .ai-chat-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ai-chat-header-icon {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        backdrop-filter: blur(4px);
      }

      .ai-chat-header h3 {
        font-size: 0.95rem;
        font-weight: 700;
        margin: 0;
        line-height: 1.2;
        color: #fff;
      }

      .ai-chat-status {
        font-size: 0.72rem;
        display: flex;
        align-items: center;
        gap: 4px;
        opacity: 0.85;
      }

      .ai-chat-status i {
        font-size: 0.45rem;
        color: #4cff50;
        animation: ai-status-blink 2s ease-in-out infinite;
      }

      @keyframes ai-status-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      .ai-chat-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }

      .ai-chat-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
      }

      /* Body */
      .ai-chat-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8f9fb;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Custom Scrollbar */
      .ai-chat-body::-webkit-scrollbar {
        width: 5px;
      }
      .ai-chat-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .ai-chat-body::-webkit-scrollbar-thumb {
        background: #dee2e6;
        border-radius: 3px;
      }
      .ai-chat-body::-webkit-scrollbar-thumb:hover {
        background: #adb5bd;
      }

      /* Message Bubbles */
      .ai-msg-bubble {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        max-width: 88%;
        animation: ai-msg-fade-in 0.3s ease-out;
      }

      @keyframes ai-msg-fade-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-msg-user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }

      .ai-msg-bot {
        align-self: flex-start;
      }

      .ai-msg-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.72rem;
        flex-shrink: 0;
      }

      .ai-msg-user .ai-msg-icon {
        background: linear-gradient(135deg, #1a73e8, #4a90e8);
        color: #fff;
      }

      .ai-msg-bot .ai-msg-icon {
        background: linear-gradient(135deg, #e8f0fe, #d2e3fc);
        color: #1a73e8;
      }

      .ai-msg-content {
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 0.88rem;
        line-height: 1.55;
        word-break: break-word;
      }

      .ai-msg-user .ai-msg-content {
        background: linear-gradient(135deg, #1a73e8, #4a90e8);
        color: #fff;
        border-bottom-right-radius: 4px;
      }

      .ai-msg-bot .ai-msg-content {
        background: #fff;
        color: #333;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      }

      /* Typing Indicator */
      .ai-msg-typing {
        align-self: flex-start;
      }

      .ai-typing-dots {
        display: flex;
        gap: 5px;
        padding: 4px 0;
      }

      .ai-typing-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #adb5bd;
        animation: ai-typing-bounce 1.4s ease-in-out infinite;
      }

      .ai-typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ai-typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes ai-typing-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }

      /* Input Area */
      .ai-chat-input-area {
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        background: #fff;
        flex-shrink: 0;
      }

      .ai-chat-input-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f1f3f5;
        border-radius: 24px;
        padding: 4px 4px 4px 16px;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      }

      .ai-chat-input-wrap:focus-within {
        background: #fff;
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
      }

      .ai-chat-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 8px 0;
        font-size: 0.88rem;
        color: #333;
        outline: none;
        font-family: inherit;
      }

      .ai-chat-input::placeholder {
        color: #aaa;
      }

      .ai-chat-send-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1a73e8, #4a90e8);
        color: #fff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .ai-chat-send-btn:hover {
        background: linear-gradient(135deg, #1557b0, #1a73e8);
        transform: scale(1.05);
      }

      .ai-chat-send-btn:active {
        transform: scale(0.95);
      }

      .ai-chat-send-btn.ai-sending {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* ── Responsive ─────────────────────────────────── */
      @media (max-width: 480px) {
        .ai-chat-btn {
          width: 52px;
          height: 52px;
          font-size: 1.2rem;
          bottom: 90px;
          right: 16px;
        }

        .ai-chat-panel {
          bottom: 0;
          right: 0;
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
          transform: translateY(100%);
        }

        .ai-chat-panel.ai-chat-open {
          transform: translateY(0);
        }

        .ai-msg-bubble {
          max-width: 92%;
        }
      }

      /* ── No script fallback ─────────────────────────── */
      noscript .ai-chat-btn,
      noscript .ai-chat-panel {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Initialize ───────────────────────────────────────────
  async function init() {
    // Don't show on login or admin pages
    const path = window.location.pathname;
    if (path.includes('login') || path.includes('admin')) return;

    // Check if chatbot is enabled
    const settings = await checkSettings();
    if (!settings.enabled) return;

    // Set welcome message
    welcomeMessage = settings.welcome || '¡Hola! 👋 Soy el asistente de HolaX. Puedo ayudarte a encontrar negocios, eventos y ofertas en Venezuela. ¿En qué te puedo ayudar?';

    // Load chat history
    loadChatHistory();

    // Create the widget
    createWidget();
  }

  // ─── Auto-init ────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
