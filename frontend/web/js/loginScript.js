const API_URL = "http://localhost:8080";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const tel = document.getElementById("tel").value;
  const passwd = document.getElementById("passwd").value;

  //manque endpoint
  message.textContent = "Connexion pas encore branchée — en attente de l'endpoint login.";
  console.log("Tentative de connexion :", { tel, passwd });
});