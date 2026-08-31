function showLostopToast(reason) {
  const existing = document.getElementById("lostop-toast");
  if (existing) existing.remove();

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
        showLostopToast(result.reason);
      } else {
        console.log("Lostop: safe, resending...");
        triggerResend();
      }
    }
  );
}

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

  console.log("Lostop: Enter detected (document-level), blocking for now");
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

document.addEventListener("click", (event) => {
  const sendButton = event.target.closest('button[data-testid="send-button"]');
  if (!sendButton) return;

  const inputField = getInputField();
  if (!inputField) return;

  if (bypassNext) {
    bypassNext = false;
    return;
  }

  console.log("Lostop: Send button clicked (document-level), blocking for now");
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();

  checkAndAct(inputField, () => {
    bypassNext = true;
    sendButton.click();
  });
}, true);
