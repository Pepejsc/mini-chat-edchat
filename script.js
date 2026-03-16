import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Config Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCiTxn5cWc3hmqK_aI-0NtGAHkDGaVOTpk",
    authDomain: "mini-chat-e030b.firebaseapp.com",
    databaseURL: "https://mini-chat-e030b-default-rtdb.firebaseio.com",
    projectId: "mini-chat-e030b",
    storageBucket: "mini-chat-e030b.firebasestorage.app",
    messagingSenderId: "943892148257",
    appId: "1:943892148257:web:8a62245609cb630c82f360"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Nombre usuario (guardado en localStorage)
let username = localStorage.getItem("chat_username");
if (!username) {
    username = prompt("Tu nombre:");
    localStorage.setItem("chat_username", username);
}

// Sala chat por URL o "public"
const params = new URLSearchParams(window.location.search);
let roomId = params.get("room");
if (!roomId) roomId = "public";

const chatRef = ref(db, "rooms/" + roomId + "/messages");

// Función enviar mensaje
function send() {
    const input = document.getElementById("msg");
    const text = input.value.trim();
    if (text === "") return;

    push(chatRef, {
        text: text,
        user: username,
        time: Date.now()
    });

    input.value = "";
}

// Evento botón enviar
document.getElementById("send-btn").addEventListener("click", send);

// Recibir mensajes en tiempo real y mostrar
onChildAdded(chatRef, (data) => {
    const msg = data.val();
    const div = document.createElement("div");

    // Diferenciar mensaje propio o ajeno para estilos
    div.className = "msg " + (msg.user === username ? "me" : "other");

    const date = new Date(msg.time);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div>${msg.text}</div>
        <div class="time">${time}</div>
    `;

    const chat = document.getElementById("chat");
    chat.appendChild(div);

    // Auto scroll al final
    chat.scrollTop = chat.scrollHeight;
});

// Enviar con Enter
document.getElementById("msg").addEventListener("keypress", function (e) {
    if (e.key === "Enter") send();
});