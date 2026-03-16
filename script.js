import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getDatabase,
    ref,
    push,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// ------------------------
// CONFIG FIREBASE
// ------------------------

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

// ------------------------
// AUTH ANÓNIMA
// ------------------------

const auth = getAuth(app);

signInAnonymously(auth)
    .then(() => {
        console.log("Usuario autenticado");
    })
    .catch((error) => {
        console.error("Error autenticando:", error);
    });


// ------------------------
// USERNAME
// ------------------------

let username = localStorage.getItem("chat_username");

if (!username) {
    username = prompt("Tu nombre:");
    localStorage.setItem("chat_username", username);
}


// ------------------------
// ROOM POR URL
// ------------------------

const params = new URLSearchParams(window.location.search);

let roomId = params.get("room");

if (!roomId) {
    roomId = "public";
}

const chatRef = ref(db, "rooms/" + roomId + "/messages");


// ------------------------
// ENVIAR MENSAJE
// ------------------------

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

document.getElementById("send-btn").addEventListener("click", send);


// ------------------------
// RECIBIR MENSAJES
// ------------------------

onChildAdded(chatRef, (data) => {

    const msg = data.val();

    const div = document.createElement("div");

    div.className = "msg " + (msg.user === username ? "me" : "other");

    const date = new Date(msg.time);

    const time = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    div.innerHTML = `
        <div>${msg.text}</div>
        <div class="time">${time}</div>
    `;

    const chat = document.getElementById("chat");

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

});


// ------------------------
// ENTER PARA ENVIAR
// ------------------------

document.getElementById("msg").addEventListener("keypress", function (e) {

    if (e.key === "Enter") {
        send();
    }

});