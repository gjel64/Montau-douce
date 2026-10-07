const API_URL = "http://localhost:8080";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const tel = document.getElementById("tel").value;
  const passwd = document.getElementById("passwd").value;

  try {
    const response = await fetch(`${API_URL}/create_user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jwt: "", name, tel, passwd }),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = "Erreur : " + JSON.stringify(data);
      return;
    }

    message.textContent = "Compte créé ! id : " + data.id;
    console.log("Réponse complète :", data);
  } catch (err) {
    message.textContent = "Impossible de contacter le serveur.";
    console.error(err);
  }
});