console.log("Lostop: script started!");

let bypassNext = false;

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

  chrome.runtime.sendMessage(
    { type: "SCAN_TEXT", text: userText },
    (result) => {
      console.log("Lostop: server responded:", result);

      if (chrome.runtime.lastError) {
        alert("Lostop: could not verify this message (connection error). Blocked for safety.");
        return;
      }
      if (result && result.error) {
        alert("Lostop: could not verify this message (server unreachable). Blocked for safety.");
        return;
      }
      if (result && result.is_blocked) {
        alert("Lostop blocked this: " + result.reason);
      } else {
        console.log("Lostop: safe, resending...");
        triggerResend();
      }
    }
  );
}

// Attached at the document level with capture: true, so this runs
// BEFORE the event ever reaches the input field or ChatGPT's own handlers.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const inputField = getInputField();
  if (!inputField) return;

  const text = getInputText(inputField);
  if (!text || text.trim() === "") return;

  if (bypassNext) {
    bypassNext = false;
    return;
  }

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
