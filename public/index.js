// index.js
let currentUser = { id: Math.random().toString(36).substr(2, 9), username: "" };
let activeChannel = "general";
let socket;
let onlineUsers = new Map();

// 1. Vincular el botón de entrar mediante Listener
document.addEventListener("DOMContentLoaded", () => {
    const btnEntrar = document.getElementById("btn-entrar");
    if (btnEntrar) {
        btnEntrar.addEventListener("click", startApp);
    }

    // Escuchar el Enter en el input de nombre
    document.getElementById("username-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") startApp();
    });
});

function startApp() {
    const input = document.getElementById("username-input");
    if (!input.value.trim()) return;

    currentUser.username = input.value.trim();
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("my-name").textContent = currentUser.username;
    
    renderUserList(); // Carga inicial de la lista
    connect();
}

function connect() {
    // Cerramos conexión previa si existe
    if (socket) socket.close();

    socket = new WebSocket(`ws://localhost:3100?username=${currentUser.username}&id=${currentUser.id}&channelId=${activeChannel}`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "USER_JOINED") {
            if (data.user.id !== currentUser.id) {
                onlineUsers.set(data.user.id, data.user.username);
                renderUserList();
            }
        } else if (data.type === "USER_LEFT") {
            onlineUsers.delete(data.userId);
            renderUserList();
        } else if (data.type === "TEXT_MESSAGE") {
            renderMessage(data);
        }
    };
}

// Hacemos switchChannel global para que funcione con los onclick dinámicos
window.switchChannel = function(targetUserId) {
    const newChannel = targetUserId === 'general' 
        ? 'general' 
        : [currentUser.id, targetUserId].sort().join("_");

    if (newChannel === activeChannel) return;

    activeChannel = newChannel;
    document.getElementById("messages").innerHTML = ""; 
    
    const title = targetUserId === 'general' ? 'Chat General' : onlineUsers.get(targetUserId);
    document.getElementById("chat-title").textContent = title;
    document.getElementById("chat-avatar").textContent = title.charAt(0);
    
    connect();
};

function renderUserList() {
    const container = document.getElementById("user-list");
    
    let html = `
        <div onclick="switchChannel('general')" class="flex items-center gap-3 p-3 rounded-2xl ${activeChannel === 'general' ? 'bg-slate-800 border-emerald-500/50' : 'hover:bg-slate-800/50'} border border-transparent cursor-pointer transition mb-2">
            <div class="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg text-xl">#</div>
            <div class="hidden md:block">
                <p class="font-bold text-sm text-white">Chat General</p>
                <p class="text-[10px] text-slate-500 tracking-widest uppercase">Público</p>
            </div>
        </div>
    `;

    onlineUsers.forEach((name, id) => {
        const isSelected = activeChannel.includes(id);
        html += `
            <div onclick="switchChannel('${id}')" class="flex items-center gap-3 p-3 rounded-2xl ${isSelected ? 'bg-slate-800 border-emerald-500/50' : 'hover:bg-slate-800/50'} border border-transparent cursor-pointer transition">
                <div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-emerald-400 border border-slate-600 uppercase">
                    ${name.charAt(0)}
                </div>
                <div class="hidden md:block">
                    <p class="font-bold text-sm text-white">${name}</p>
                    <p class="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Disponible</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderMessage(data) {
    const isMe = data.senderId === currentUser.id;
    const container = document.getElementById("messages");
    
    const div = document.createElement("div");
    div.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2`;
    
    const bubbleClass = isMe 
        ? "bg-emerald-700 text-white rounded-2xl rounded-tr-none shadow-lg" 
        : "bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700 shadow-md";

    div.innerHTML = `
        <div class="max-w-[85%] sm:max-w-[70%]">
            <div class="${bubbleClass} px-4 py-3 relative">
                ${!isMe ? `<p class="text-[10px] font-black text-emerald-400 mb-1 uppercase tracking-widest">${data.senderName}</p>` : ''}
                <p class="text-sm leading-relaxed">${data.text}</p>
                <p class="text-[9px] text-right mt-1 opacity-60 font-medium">${data.timestamp}</p>
            </div>
        </div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

document.getElementById("message-form").onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById("input-message");
    if (!input.value.trim() || !socket) return;
    socket.send(input.value);
    input.value = "";
};