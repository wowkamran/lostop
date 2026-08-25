console.log("Lostop: скрипт запущен!");

function getInputText(element) {
  if (element.value !== undefined) {
    return element.value;
  }
  return element.innerText || element.textContent;
}

setInterval(() => {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) return;

  inputField.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    const userText = getInputText(inputField);

    chrome.runtime.sendMessage(
      { type: "SCAN_TEXT", text: userText },
      (result) => {
        if (result && result.is_blocked) {
          alert("Lostop заблокировал отправку: " + result.reason);
        }
      }
    );
  }, true);
}, 1000);
