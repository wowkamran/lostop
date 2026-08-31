// ---- Highlight styling (injected once) ----
if (!document.getElementById("lostop-highlight-style")) {
  const style = document.createElement("style");
  style.id = "lostop-highlight-style";
  style.textContent = `
    ::highlight(lostop-secret) {
      background-color: rgba(193, 39, 45, 0.35);
      color: #C1272D;
    }
  `;
  document.head.appendChild(style);
}

function findTextRange(container, searchText) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.indexOf(searchText);
    if (idx !== -1) {
      const range = new Range();
      range.setStart(node, idx);
      range.setEnd(node, idx + searchText.length);
      return range;
    }
  }
  return null;
}

function highlightSecretInField(inputField, matchedText) {
  if (!window.CSS || !CSS.highlights) return;
  if (!matchedText) return;

  const range = findTextRange(inputField, matchedText);
  if (!range) return;

  const highlight = new Highlight(range);
  CSS.highlights.set("lostop-secret", highlight);

  const clear = () => {
    CSS.highlights.delete("lostop-secret");
    inputField.removeEventListener("input", clear);
  };
  inputField.addEventListener("input", clear);

  setTimeout(() => {
    CSS.highlights.delete("lostop-secret");
  }, 8000);
}

// ---- Toast notification ----
function showLostopToast(reason, matchedText) {
  const existingToast = document.getElementById("lostop-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.id = "lostop-toast";
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: #17140F;
      color: #EDE6D6;
      border-left: 4px solid #C1272D;
      border-radius: 8px;
      padding: 16px 20px;
      max-width: 340px;
      font-family: 'Segoe UI', sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      transform: translateX(400px);
      transition: transform 0.3s ease;
    " id="lostop-toast-inner">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 18px;">🛑</span>
        <strong style="font-size: 14px;">Lostop blocked this message</strong>
      </div>
      <div style="font-size: 13px; color: rgba(237,230,214,0.7); margin-left: 26px;">
        ${reason}
      </div>
      ${matchedText ? `
      <div style="
        font-size: 12px;
        font-family: monospace;
        background: rgba(193,39,45,0.15);
        color: #EDE6D6;
        padding: 6px 8px;
        border-radius: 4px;
        margin: 8px 0 0 26px;
        word-break: break-all;
      ">${matchedText.slice(0, 40)}${matchedText.length > 40 ? '...' : ''}</div>
      ` : ''}
    </div>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    const inner = document.getElementById("lostop-toast-inner");
    if (inner) inner.style.transform = "translateX(0)";
  });

  setTimeout(() => {
    const inner = document.getElementById("lostop-toast-inner");
    if (inner) inner.style.transform = "translateX(400px)";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ---- Core blocking logic ----
console.log("Lostop: script started!");

let bypassNext = false;
let checkInProgress = false;

function getInputField() {
  return document.querySelector('#prompt-textarea');
}

function getInputText(element) {
  if (element.value !== undefined) {
    return element.value;
  }
  return element.innerText || element.textContent;
}

function checkAndAct(inputField, triggerResend) {
  const userText = getInputText(inputField);
  console.log("Lostop: text to check:", userText);
  checkInProgress = true;

  chrome.runtime.sendMessage(
    { type: "SCAN_TEXT", text: userText },
    (result) => {
      checkInProgress = false;
      console.log("Lostop: server responded:", result);

      if (chrome.runtime.lastError) {
        showLostopToast("Could not verify this message (connection error). Blocked for safety.");
        return;
      }
      if (result && result.error) {
        showLostopToast("Could not verify this message (server unreachable). Blocked for safety.");
        return;
      }
      if (result && result.is_blocked) {
        showLostopToast(result.reason, result.matched_text);
        if (result.matched_text) {
          highlightSecretInField(inputField, result.matched_text);
        }
      } else {
        console.log("Lostop: safe, resending...");
        triggerResend();
      }
    }
  );
}

// Enter key — listens at document level with capture, and blocks
// unconditionally while a check is in progress (fixes the race
// condition where the field looked empty right after clicking Send).
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const inputField = getInputField();
  if (!inputField) return;

  if (bypassNext) {
    bypassNext = false;
    return;
  }

  if (checkInProgress) {
    console.log("Lostop: Enter blocked, a check is already in progress");
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    return;
  }

  const text = getInputText(inputField);
  if (!text || text.trim() === "") return;

  console.log("Lostop: Enter detected, blocking for now");
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();

  checkAndAct(inputField, () => {
    bypassNext = true;
    const resendEvent = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
    });
    inputField.dispatchEvent(resendEvent);
  });
}, true);

// Send button click — same protection
document.addEventListener("click", (event) => {
  const sendButton = event.target.closest('button[data-testid="send-button"]');
  if (!sendButton) return;

  const inputField = getInputField();
  if (!inputField) return;

  if (bypassNext) {
    bypassNext = false;
    return;
  }

  console.log("Lostop: Send button clicked, blocking for now");
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();

  checkAndAct(inputField, () => {
    bypassNext = true;
    sendButton.click();
  });
}, true);
