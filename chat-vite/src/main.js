import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ------------------------
// CONFIGURACIÓN DE FIREBASE (Segura)
// ------------------------
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ------------------------
// CONFIGURACIÓN DE ONESIGNAL
// ------------------------
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        notifyButton: {
            enable: true, // Esto muestra una campanita para que acepten recibir notificaciones
        },
    });
});

// ------------------------
// ENVIAR PUSH NOTIFICATION (OneSignal)
// ------------------------
async function sendPushNotification(mensaje) {
    const body = {
        app_id: import.meta.env.VITE_ONESIGNAL_APP_ID,
        // Esto envía la notificación a todos los dispositivos suscritos (tú y Ali)
        included_segments: ['Subscribed Users'], 
        headings: { 
            en: `Nuevo mensaje de ${username}`, 
            es: `Nuevo mensaje de ${username}` 
        },
        contents: { 
            en: mensaje, 
            es: mensaje 
        },
        // Cuando toquen la notificación, los llevará directo al chat
        url: "https://pepejsc.github.io/mini-chat-edchat/" 
    };

    try {
        await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${import.meta.env.VITE_ONESIGNAL_API_KEY}`
            },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error("Error enviando notificación push:", error);
    }
}

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

const toggleStickersBtn = document.getElementById("toggle-stickers-btn");
const stickerPanel = document.getElementById("sticker-panel");

let username = "";
const roomId = new URLSearchParams(window.location.search).get("room") || "public";
const chatRef = ref(db, "rooms/" + roomId + "/messages");
let isListening = false;
const appStartTime = Date.now(); 

// ------------------------
// ESCUCHADOR DE SESIÓN
// ------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = "none";
        chatScreen.style.display = "flex";
        username = user.email.split('@')[0]; 
        
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
    
    if(!email || !password) return;

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
        stickerPanel.style.display = "none";
    });
});

// ------------------------
// ENVIAR MENSAJES DE TEXTO
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

    sendPushNotification(text);
}

sendBtn.addEventListener("click", send);
msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
});

// ------------------------
// GENERADOR Y LÓGICA DE STICKERS
// ------------------------
toggleStickersBtn.addEventListener("click", () => {
    stickerPanel.style.display = stickerPanel.style.display === "none" ? "flex" : "none";
});

// ¡AQUÍ ESTÁ LA MAGIA! Cambia el 20 por la cantidad total de stickers que tengas
const TOTAL_STICKERS = 100; 

for (let i = 1; i <= TOTAL_STICKERS; i++) {
    const img = document.createElement("img");
    img.src = `./stickers/${i}.webp`; 
    img.className = "sticker-option";
    img.alt = `sticker${i}`;
    
    // Al hacer clic en el sticker generado, se envía a Firebase
    img.addEventListener("click", () => {
        push(chatRef, {
            type: "sticker",
            url: img.src,
            user: username,
            time: Date.now()
        });
        
        // Ocultamos el panel después de enviar
        stickerPanel.style.display = "none";
        sendPushNotification("Te envió un sticker 🖼️");
    });
    
    stickerPanel.appendChild(img);
}

// ------------------------
// CARGAR MENSAJES Y NOTIFICAR
// ------------------------
function loadMessages() {
    onChildAdded(chatRef, (data) => {
        const msg = data.val();
        const div = document.createElement("div");
        
        let className = "msg " + (msg.user === username ? "me" : "other");
        
        if (msg.type === "sticker") {
            className += " msg-sticker";
        }
        
        div.className = className;
        
        const date = new Date(msg.time);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const nameHtml = msg.user !== username ? `<span class="user-name">${msg.user}</span>` : '';

        let contentHtml = "";
        if (msg.type === "sticker") {
            contentHtml = `<img src="${msg.url}" class="chat-sticker-img" alt="Sticker" />`;
        } else {
            contentHtml = `<div>${msg.text}</div>`;
        }

        div.innerHTML = `
            ${nameHtml}
            ${contentHtml}
            <span class="time" style="${msg.type === 'sticker' ? 'text-shadow: 1px 1px 2px white;' : ''}">${time}</span>
        `;
        
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Notificaciones
        if (msg.time > appStartTime && msg.user !== username) {
            if (document.hidden && Notification.permission === "granted") {
                let notificationBody = msg.type === "sticker" ? "Te envió un sticker 🖼️" : msg.text;
                
                new Notification(`Nuevo mensaje de ${msg.user}`, {
                    body: notificationBody,
                    icon: "https://cdn-icons-png.flaticon.com/512/1041/1041916.png" 
                });
            }
        }
    });
}