import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ------------------------
// CONFIGURACIÓN DE FIREBASE
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
const auth = getAuth(app);

// ------------------------
// VARIABLES DEL DOM Y ESTADO
// ------------------------
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginError = document.getElementById("login-error");
const chatContainer = document.getElementById("chat");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send-btn");

let username = "";
const roomId = new URLSearchParams(window.location.search).get("room") || "public";
const chatRef = ref(db, "rooms/" + roomId + "/messages");
let isListening = false;

// Guardamos el momento exacto en el que el usuario entra para no notificar mensajes viejos
const appStartTime = Date.now(); 

// ------------------------
// ESCUCHADOR DE SESIÓN
// ------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = "none";
        chatScreen.style.display = "flex";
        username = user.email.split('@')[0]; 
        
        // Pedir permiso para notificaciones al iniciar sesión con éxito
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        if (!isListening) {
            loadMessages();
            isListening = true;
        }
    } else {
        loginScreen.style.display = "flex";
        chatScreen.style.display = "none";
    }
});

// ------------------------
// LOGIN Y LOGOUT
// ------------------------
loginBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if(!email || !password) {
        loginError.innerText = "Ingresa correo y contraseña.";
        loginError.style.display = "block";
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            loginError.style.display = "none";
            emailInput.value = "";
            passwordInput.value = "";
        })
        .catch((error) => {
            console.error("Error autenticando:", error);
            loginError.innerText = "Credenciales incorrectas.";
            loginError.style.display = "block";
        });
});

logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        chatContainer.innerHTML = ""; 
        isListening = false;
    });
});

// ------------------------
// ENVIAR MENSAJES
// ------------------------
function send() {
    const text = msgInput.value.trim();
    if (text === "") return;

    push(chatRef, {
        text: text,
        user: username,
        time: Date.now()
    });
    msgInput.value = "";
}

sendBtn.addEventListener("click", send);
msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
});

// ------------------------
// CARGAR MENSAJES Y NOTIFICAR
// ------------------------
function loadMessages() {
    onChildAdded(chatRef, (data) => {
        const msg = data.val();
        const div = document.createElement("div");
        
        div.className = "msg " + (msg.user === username ? "me" : "other");
        
        const date = new Date(msg.time);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const nameHtml = msg.user !== username ? `<span class="user-name">${msg.user}</span>` : '';

        div.innerHTML = `
            ${nameHtml}
            <div>${msg.text}</div>
            <span class="time">${time}</span>
        `;
        
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // --- LÓGICA DE NOTIFICACIONES ---
        // 1. Validar que el mensaje sea más nuevo que cuando abrimos la app
        // 2. Validar que el mensaje NO lo envié yo
        if (msg.time > appStartTime && msg.user !== username) {
            
            // 3. Validar si la página está oculta (el usuario está en otra pestaña)
            if (document.hidden && Notification.permission === "granted") {
                new Notification(`Nuevo mensaje de ${msg.user}`, {
                    body: msg.text,
                    // Ícono genérico de chat. Puedes cambiar el link por el logo de tu app
                    icon: "https://cdn-icons-png.flaticon.com/512/1041/1041916.png" 
                });
            }
        }
    });
}