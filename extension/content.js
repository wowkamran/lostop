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

// Searches across multiple text nodes, since ProseMirror often
// splits text into several small text nodes instead of one block.
function findTextRangeAcrossNodes(container, searchText) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let fullText = "";
  let node;
  while ((node = walker.nextNode())) {
    nodes.push({ node, start: fullText.length });
    fullText += node.textContent;
  }

  const idx = fullText.indexOf(searchText);
  if (idx === -1) {
    console.log("Lostop: highlight text not found in field (searched:", searchText, ")");
    return null;
  }

  const endIdx = idx + searchText.length;
  let startNode = null, startOffset = 0, endNode = null, endOffset = 0;

  for (const entry of nodes) {
    const nodeEnd = entry.start + entry.node.textContent.length;
    if (startNode === null && idx >= entry.start && idx < nodeEnd) {
      startNode = entry.node;
      startOffset = idx - entry.start;
    }
    if (endIdx > entry.start && endIdx <= nodeEnd) {
      endNode = entry.node;
      endOffset = endIdx - entry.start;
    }
  }

  if (!startNode || !endNode) {
    console.log("Lostop: could not map match to DOM nodes");
    return null;
  }

  const range = new Range();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function highlightSecretsInField(inputField, matchedTexts) {
  if (!window.CSS || !CSS.highlights) {
    console.log("Lostop: CSS.highlights API not supported in this browser");
    return;
  }
  if (!matchedTexts || matchedTexts.length === 0) return;

  const ranges = [];
  for (const text of matchedTexts) {
    const range = findTextRangeAcrossNodes(inputField, text);
    if (range) ranges.push(range);
  }

  if (ranges.length === 0) return;

  console.log("Lostop: highlighting", ranges.length, "matched secret(s) in field");
  const highlight = new Highlight(...ranges);
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
function showLostopToast(reason, matchedText, totalCount) {
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
        <strong style="font-size: 14px;">Lostop blocked this message${totalCount > 1 ? ` (${totalCount} secrets found)` : ''}</strong>
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
let fieldNotFoundWarned = false;

function getInputField() {
  const selectors = [
    '#prompt-textarea',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-id]',
    'textarea[data-testid]'
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
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
        const allFindings = result.all_findings || [{ reason: result.reason, matched_text: result.matched_text }];
        showLostopToast(result.reason, result.matched_text, allFindings.length);
        const allMatchedTexts = allFindings.map(f => f.matched_text).filter(Boolean);
        highlightSecretsInField(inputField, allMatchedTexts);
        inputField.focus();
      } else {
        console.log("Lostop: safe, resending...");
        triggerResend();
      }
    }
  );
}

// Enter key — always routed through the server, even if the field
// looks empty. This closes the race where the DOM appears cleared
// but ChatGPT's internal editor state still holds the original text.
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

// Warn the user if the input field can't be found at all —
// but only after giving the page a few seconds to finish loading,
// so we don't flag a normal startup delay as a real problem.
const pageLoadedAt = Date.now();
const STARTUP_GRACE_PERIOD_MS = 6000;

setInterval(() => {
  const field = getInputField();
  const pastGracePeriod = (Date.now() - pageLoadedAt) > STARTUP_GRACE_PERIOD_MS;

  if (!field && pastGracePeriod && !fieldNotFoundWarned) {
    fieldNotFoundWarned = true;
    console.log("Lostop: could not find the input field. Protection may not be active on this page.");
    showLostopToast("Warning: Lostop could not detect the input field on this page. You may not be protected.");
  }
  if (field) {
    fieldNotFoundWarned = false;
  }
}, 3000);
