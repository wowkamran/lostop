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
    console.log("Lostop: сработал keydown, клавиша:", event.key);

    if (event.key !== "Enter") return;

    console.log("Lostop: это Enter, отправляю сообщение фоновому скрипту");
    const userText = getInputText(inputField);

    chrome.runtime.sendMessage(
      { type: "SCAN_TEXT", text: userText },
      (result) => {
        console.log("Lostop: получен ответ от фонового скрипта:", result);
        if (chrome.runtime.lastError) {
          console.log("Lostop: ошибка связи:", chrome.runtime.lastError.message);
        }
        if (result && result.is_blocked) {
          alert("Lostop заблокировал отправку: " + result.reason);
        }
      }
    );
  }, true);
}, 1000);
