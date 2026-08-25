setInterval(() => {
  const textarea = document.querySelector("textarea");
  if (!textarea) return;

  textarea.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    const userText = textarea.value;

    const response = await fetch("http://localhost:8000/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userText })
    });

    const result = await response.json();
    if (result.is_blocked) {
      event.preventDefault();
      event.stopPropagation();
      alert("Lostop заблокировал отправку: " + result.reason);
    }
  });
}, 1000);
