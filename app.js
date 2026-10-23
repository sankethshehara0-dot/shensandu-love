// CONFIG එක මෙතනින් - Firebase එකේ copy කරගෙන ආපු එක
const firebaseConfig = {
  apiKey: "AIzaSyD_IwO-G-FhBUP2NqDOPEqmQWT8m-B",
  authDomain: "shensandu-love.firebaseapp.com",
  databaseURL: "https://shensandu-love-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shensandu-love",
  storageBucket: "shensandu-love.firebasestorage.app",
  messagingSenderId: "783958807706",
  appId: "1:783958807706:web:c44062a8c2efb727b8423",
  measurementId: "G-BPGY51YWW0"
}
 // firebase.js එකේ පහලම
try {
  const db = getFirestore(app);
  console.log("Firebase Connected!");
  document.querySelector(".status")?.replaceChildren("Connected 💖");
  // or
  const statusEl = document.getElementById("connectionStatus");
  if(statusEl) statusEl.innerText = "Connected 💖";
} catch(e) {
  console.error("Firebase Error:", e);
} 
  ;

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let myRole = localStorage.getItem('myRole');
let myPeerId = localStorage.getItem('myPeerId');
let coupleCode = localStorage.getItem('coupleCode') || "SHANSANDU";
const peer = new Peer();
let conn;

peer.on('open', id => {
  if(!myPeerId){ myPeerId=id; localStorage.setItem('myPeerId',id); }
  document.getElementById('myIdText').innerText = id.substring(0,6);
  if(myRole){ document.getElementById('roleSelect').classList.add('hidden'); document.getElementById('mainApp').classList.remove('hidden'); registerMe(); }
});

function selectRole(role){
  myRole=role;
  coupleCode=document.getElementById('coupleCodeInput').value || "SHANSANDU";
  localStorage.setItem('myRole',role);
  localStorage.setItem('coupleCode',coupleCode);
  document.getElementById('roleSelect').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  registerMe();
}

function registerMe(){
  db.ref(`couples/${coupleCode}/${myRole}`).set({ peerId: myPeerId, username: myRole, online: true, lastSeen: Date.now() });
  listenPartner(); loadChats();
}

function listenPartner(){
  const other = myRole==='Shan'?'Sandu':'Shan';
  db.ref(`couples/${coupleCode}/${other}`).on('value', snap=>{
    const p=snap.val();
    if(p){
      localStorage.setItem('partnerPeerId', p.peerId);
      document.getElementById('contactList').innerHTML=`<div class="contact-card"><img src="icon.png" width="40" style="border-radius:50%"><div><b>${p.username} ❤️</b><br><small style="color:#0f0">${p.online?'Online':'Offline'}</small></div></div>`;
      if(!conn){ conn=peer.connect(p.peerId); setupConn(); }
    }
  });
}
document.getElementById("attachBtn").onclick = () => document.getElementById("fileInput").click();

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  // Firebase Storage එකට upload කරනවා
  const storageRef = ref(storage, `chats/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
 
  // message එකක් විදියට save කරනවා
  addDoc(messagesRef, {
    text: file.type.startsWith("image") ? `<img src="${url}" style="max-width:200px;border-radius:12px">` : `<video src="${url}" controls style="max-width:200px;border-radius:12px"></video>`,
    sender: myName,
    timestamp: serverTimestamp(),
    type: "media"
  });
}
 call button එකට
document.getElementById("callBtn").onclick = () => {
  const room = "ShenSandu_Love_" + "a02741"; // ඔයාගේ room code එක
  window.open(`https://meet.jit.si/${room}`, "_blank");
}
// video call එකට
document.getElementById("videoCallBtn").onclick = () => {
  window.open(`https://meet.jit.si/ShenSandu_Love_a02741#config.startWithVideoMuted=false`, "_blank");
}

function setupConn(){ conn.on('open',()=>{ conn.on('data', d=>{ saveLocal({text:d,from:'other',time:Date.now()}); renderChats(); }); }); }
function saveLocal(m){ let c=JSON.parse(localStorage.getItem('chats')||"[]"); c.push(m); localStorage.setItem('chats',JSON.stringify(c)); }

function sendMessage(){
  const input=document.getElementById('msgInput');
  if(!input.value) return;
  const msg={text:input.value,from:myRole,time:Date.now()};
  db.ref(`couples/${coupleCode}/messages/${msg.time}`).set(msg);
  if(conn) conn.send(input.value);
  saveLocal({...msg,me:true}); input.value=""; renderChats();
}

function loadChats(){ db.ref(`couples/${coupleCode}/messages`).on('child_added', snap=>{
  const m=snap.val();
  let c=JSON.parse(localStorage.getItem('chats')||"[]");
  if(!c.find(x=>x.time===m.time)){ c.push(m); localStorage.setItem('chats',JSON.stringify(c)); renderChats(); }
}); renderChats(); }

function renderChats(){
  const area=document.getElementById('chatArea');
  const chats=JSON.parse(localStorage.getItem('chats')||"[]");
  area.innerHTML=chats.map(m=>`<div class="msg ${m.from===myRole||m.me?'me':'other'}">${m.text}<br><small style="font-size:9px;opacity:.6">${new Date(m.time).toLocaleTimeString()}</small></div>`).join('');
  area.scrollTop=area.scrollHeight;
}

let renderedIds = new Set();

onSnapshot(query(messagesRef, orderBy("timestamp")), (snapshot) => {
  const container = document.getElementById("messages");
  container.innerHTML = ""; // අනිවාර්යයෙන් clear කරන්න
  renderedIds.clear();
 
  snapshot.forEach((doc) => {
    if(renderedIds.has(doc.id)) return; // double එක නවත්තනවා
    renderedIds.add(doc.id);
    const msg = doc.data();
    const div = document.createElement("div");
    div.className = msg.sender === myName ? "my-msg" : "other-msg";
    div.innerHTML = `
      <div class="bubble">${msg.text}</div>
      <span class="time">${new Date(msg.timestamp?.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
    `;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
});

// Video/Audio + Filters - full logic
let localStream;
async function startVideoCall(){
  localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
  document.getElementById('localVideo').srcObject=localStream;
  document.getElementById('videoScreen').classList.remove('hidden');
  const partnerId=localStorage.getItem('partnerPeerId');
  const call=peer.call(partnerId,localStream);
  call.on('stream', s=>document.getElementById('remoteVideo').srcObject=s);
}
function endCall(){ document.getElementById('videoScreen').classList.add('hidden'); if(localStream) localStream.getTracks().forEach(t=>t.stop()); }
function toggleTheme(){ document.body.classList.toggle('light'); document.body.classList.toggle('dark'); }
function showTab(t){ if(t==='settings') document.getElementById('settingsPanel').classList.toggle('hidden'); }
function setFilter(f){ alert("Snapchat Filter: "+f+" applied ❤️"); }
function setVoiceFilter(v){ alert("Voice Filter: "+v); }
