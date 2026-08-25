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

  inputField.addEventListener("keydown", async (event) => {
    console.log("Lostop: нажата клавиша:", event.key);

    if (event.key !== "Enter") return;

    console.log("Lostop: это Enter, начинаю проверку текста");
    const userText = getInputText(inputField);
    console.log("Lostop: текст для проверки:", userText);

    const response = await fetch("http://localhost:8000/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userText })
    });

    const result = await response.json();
    console.log("Lostop: ответ сервера:", result);

    if (result.is_blocked) {
      event.preventDefault();
      event.stopPropagation();
      alert("Lostop заблокировал отправку: " + result.reason);
    }
  }, true);
}, 1000);
