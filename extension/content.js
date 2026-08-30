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

  // Skip if we already attached a listener to this field
  // (otherwise the interval would keep adding duplicate listeners)
  if (inputField.dataset.lostopHooked) return;
  inputField.dataset.lostopHooked = "true";

  inputField.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    // This is our own re-triggered Enter after the server approved it — let it through
    if (bypassNext) {
      bypassNext = false;
      return;
    }

    // Always block first, ask the server second
    event.preventDefault();
    event.stopImmediatePropagation();

    const userText = getInputText(inputField);

    chrome.runtime.sendMessage(
      { type: "SCAN_TEXT", text: userText },
      (result) => {
        if (result && result.is_blocked) {
          alert("Lostop blocked this: " + result.reason);
          // Text stays in the field, nothing is sent
        } else {
          // Safe — resend by simulating Enter again
          bypassNext = true;
          const resendEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
          });
          inputField.dispatchEvent(resendEvent);
        }
      }
    );
  }, true);
}, 1000);
