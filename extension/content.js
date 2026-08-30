console.log("Lostop: script started!");

let bypassNext = false;

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

function attachHooks() {
  const inputField = document.querySelector('#prompt-textarea');
  if (inputField && !inputField.dataset.lostopHookedKey) {
    inputField.dataset.lostopHookedKey = "true";
    console.log("Lostop: hooked input field");

    inputField.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      if (bypassNext) {
        bypassNext = false;
        return;
      }

      console.log("Lostop: Enter detected, blocking for now");
      event.preventDefault();

      checkAndAct(inputField, () => {
        bypassNext = true;
        const resendEvent = new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
        });
        inputField.dispatchEvent(resendEvent);
      });
    }, true);
  }

  const sendButton = document.querySelector('button[data-testid="send-button"]');
  if (sendButton && inputField && !sendButton.dataset.lostopHookedClick) {
    sendButton.dataset.lostopHookedClick = "true";
    console.log("Lostop: hooked send button");

    sendButton.addEventListener("click", (event) => {
      if (bypassNext) {
        bypassNext = false;
        return;
      }

      console.log("Lostop: Send button clicked, blocking for now");
      event.preventDefault();
      event.stopImmediatePropagation();

      checkAndAct(inputField, () => {
        bypassNext = true;
        sendButton.click();
      });
    }, true);
  }
}

// React immediately to DOM changes instead of waiting up to 1 second
const observer = new MutationObserver(() => {
  attachHooks();
});
observer.observe(document.body, { childList: true, subtree: true });

// Run once immediately on page load
attachHooks();

// Keep a short interval as a safety net, in case MutationObserver misses something
setInterval(attachHooks, 300);
