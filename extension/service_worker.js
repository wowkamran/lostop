chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_TEXT") {
    fetch("http://localhost:8000/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.text })
    })
      .then(response => response.json())
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ is_blocked: false, error: error.message }));

    return true;
  }
});
