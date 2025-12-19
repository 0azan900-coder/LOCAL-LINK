import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, push, onChildAdded, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC-koYHDPP2WFsXooDUAWsNkHP8wGB1YE8",
    authDomain: "local-link-7b54f.firebaseapp.com",
    projectId: "local-link-7b54f",
    storageBucket: "local-link-7b54f.firebasestorage.app",
    messagingSenderId: "1064209366658",
    appId: "1:1064209366658:web:876095aebaa3cc98cebe9b",
    databaseURL: "https://local-link-7b54f-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let chatRef = null;
let myName = "";
let currentPartner = ""; // Track who you are currently chatting with
const roomID = "uni_wifi_lounge"; 

async function startLinking() {
    myName = document.getElementById('username').value.trim();
    const genderSelector = document.querySelector('input[name="gender"]:checked');
    
    if (!myName) return alert("Please enter your name!");
    const gender = genderSelector.value;

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';

    const myUserRef = ref(db, `rooms/${roomID}/${myName}`);
    set(myUserRef, { username: myName, gender: gender });
    onDisconnect(myUserRef).remove();

    onValue(ref(db, `rooms/${roomID}`), (snapshot) => {
        renderUsers(snapshot.val());
    });

    // --- MULTI-USER NOTIFICATION LISTENER ---
    const allChatsRef = ref(db, `chats`);
    onChildAdded(allChatsRef, (snapshot) => {
        const chatID = snapshot.key;
        if (chatID.includes(myName)) {
            const singleChatRef = ref(db, `chats/${chatID}`);
            // Listen for every new message in every chat room you belong to
            onChildAdded(singleChatRef, (msgSnap) => {
                const msg = msgSnap.val();
                const isChatWindowOpen = document.getElementById('chat-window').style.display === 'flex';
                
                // Trigger dot if:
                // 1. Message is NOT from me
                // 2. I'm not currently looking at the chat window OR I'm talking to someone else
                if (msg.sender !== myName) {
                    if (!isChatWindowOpen || currentPartner !== msg.sender) {
                        showNotification(msg.sender);
                    }
                }
            });
        }
    });
}

function renderUsers(users) {
    const list = document.getElementById('user-list');
    list.innerHTML = "";
    for (let id in users) {
        if (users[id].username === myName) continue; 
        
        const symbol = users[id].gender === 'male' ? '👨' : '👩';
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="user-info">
                <div class="notification-dot" id="dot-${users[id].username}"></div>
                <span>${symbol} ${users[id].username}</span>
            </div>
            <button class="chat-btn" data-name="${users[id].username}">Chat</button>
        `;
        list.appendChild(li);
    }
}

function showNotification(senderName) {
    const dot = document.getElementById(`dot-${senderName}`);
    if (dot) {
        dot.classList.add('show-dot');
        new Audio('https://assets.mixkit.co/sfx/preview/mixkit-notification-light-3046.mp3').play().catch(()=>{});
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-btn')) {
        const partnerName = e.target.getAttribute('data-name');
        openChat(partnerName);
    }
});

function openChat(partnerName) {
    currentPartner = partnerName; // Set the active partner
    const dot = document.getElementById(`dot-${partnerName}`);
    if (dot) dot.classList.remove('show-dot');

    if (chatRef) off(chatRef);

    const chatID = [myName, partnerName].sort().join("_");
    document.getElementById('chat-window').style.display = 'flex';
    document.getElementById('chat-with-name').innerText = partnerName;
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = "";
    
    chatRef = ref(db, `chats/${chatID}`);
    onChildAdded(chatRef, (snapshot) => {
        const msg = snapshot.val();
        const type = msg.sender === myName ? 'sent' : 'received';
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${type}`;
        msgDiv.innerText = msg.text;
        msgContainer.appendChild(msgDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    });
}

document.getElementById('closeBtn').addEventListener('click', () => {
    document.getElementById('chat-window').style.display = 'none';
    currentPartner = ""; // Clear active partner when closed
    if (chatRef) off(chatRef);
});

const sendMessage = () => {
    const textInput = document.getElementById('msgInput');
    const text = textInput.value.trim();
    if (text && chatRef) {
        push(chatRef, { sender: myName, text: text, time: Date.now() });
        textInput.value = "";
    }
};

document.getElementById('sendBtn').addEventListener('click', sendMessage);

document.getElementById('msgInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

document.getElementById('joinBtn').addEventListener('click', startLinking);