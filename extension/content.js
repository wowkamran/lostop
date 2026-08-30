console.log("Lostop: script started!");

let bypassNext = false;

function getInputText(element) {
  if (element.value !== undefined) {
    return element.value;
  }
  return element.innerText || element.textContent;
}

setInterval(() => {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) return;

  if (inputField.dataset.lostopHooked) return;
  inputField.dataset.lostopHooked = "true";

  inputField.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    console.log("Lostop: Enter detected");

    if (bypassNext) {
      console.log("Lostop: this is our own resend, skipping check");
      bypassNext = false;
      return;
    }

    console.log("Lostop: blocking for now, checking with server...");
    event.preventDefault();

    const userText = getInputText(inputField);
    console.log("Lostop: text to check:", userText);

    chrome.runtime.sendMessage(
      { type: "SCAN_TEXT", text: userText },
      (result) => {
        console.log("Lostop: server responded:", result);

        if (chrome.runtime.lastError) {
          console.log("Lostop: connection error:", chrome.runtime.lastError.message);
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
          bypassNext = true;
          const resendEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
          });
          inputField.dispatchEvent(resendEvent);
          console.log("Lostop: resend dispatched");
        }
      }
    );
  }, true);
}, 1000);
