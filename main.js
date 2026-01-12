// --- Gemini API Setup (Secured via LocalStorage) ---

function getApiKey() {
    return localStorage.getItem("gemini_api_key") || "";
}

function manageApiKey() {
    const currentKey = getApiKey();
    // Mask the key for display if it exists
    const displayKey = currentKey ? (currentKey.substring(0, 4) + '...' + currentKey.substring(currentKey.length - 4)) : '';

    const newKey = prompt("請輸入您的 Google Gemini API Key:\n(您的 Key 會被儲存在瀏覽器本地端，不會上傳到任何伺服器)", currentKey);

    if (newKey !== null) { // If not cancelled
        if (newKey.trim() === "") {
            localStorage.removeItem("gemini_api_key");
            alert("API Key 已清除。");
        } else {
            localStorage.setItem("gemini_api_key", newKey.trim());
            alert("API Key 已儲存！現在您可以開始使用 AI 功能了。");
        }
    }
}

function checkApiKey() {
    const key = getApiKey();
    if (!key) {
        const proceed = confirm("尚未設定 Gemini API Key，AI 功能將無法運作。\n是否現在設定？");
        if (proceed) {
            manageApiKey();
            return getApiKey() !== ""; // Return true if they set it
        }
        return false;
    }
    return true;
}

async function callGemini(prompt) {
    const apiKey = getApiKey();
    if (!apiKey) {
        // Double check in case of race/logic flow, though usually handled by upstream
        const hasKey = checkApiKey();
        if (!hasKey) return "請先設定 API Key 才能使用此功能。";
        // If they set it, continue
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${getApiKey()}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error("API Detailed Error:", errData);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini Error:", error);
        return `連線發生錯誤：${error.message}。\n請檢查您的 API Key 是否正確。`;
    }
}

// --- Feature 1: Hive Mind (Chat) ---
async function askHiveMind() {
    const inputEl = document.getElementById('hive-input');
    const outputEl = document.getElementById('hive-output');
    const placeholderEl = document.getElementById('hive-placeholder');
    const loadingEl = document.getElementById('hive-loading');

    const query = inputEl.value.trim();
    if (!query) return;

    // Check Key First
    if (!getApiKey()) {
        const hasKey = checkApiKey();
        if (!hasKey) return;
    }

    // UI State: Loading
    loadingEl.classList.remove('hidden');
    placeholderEl.classList.add('hidden');
    outputEl.classList.add('hidden');

    const systemPrompt = `你是一位博學、語氣溫柔且充滿詩意的自然學家。請用繁體中文回答使用者關於「${query}」的問題。內容請聚焦於授粉、生態平衡或植物學知識。保持回答在 150 字以內，並使用 markdown 格式強調重點。`;

    const responseText = await callGemini(systemPrompt);

    // UI State: Show Result
    loadingEl.classList.add('hidden');
    outputEl.classList.remove('hidden');
    outputEl.innerHTML = marked.parse(responseText); // Parse markdown

    // Clear input
    inputEl.value = '';
}

// --- Feature 2: Species Generator ---
async function generateSpeciesProfile() {
    const contentEl = document.getElementById('species-content');
    const loadingEl = document.getElementById('species-loading');

    // Check Key First
    if (!getApiKey()) {
        const hasKey = checkApiKey();
        if (!hasKey) return;
    }

    loadingEl.classList.remove('hidden');

    // Diversity Injection: Randomly select a category to force variety
    const categories = [
        "熱帶雨林的特殊鳥類 (如蜂鳥、太陽鳥)",
        "夜行性授粉動物 (如長舌蝠、天蛾)",
        "特殊的授粉甲蟲或蒼蠅",
        "非昆蟲類的授粉者 (如壁虎、狐猴、負鼠)",
        "蘭花的專一性授粉者 (如特殊的蜂類)",
        "沙漠植物的授粉者",
        "高山或寒冷地區的授粉昆蟲",
        "色彩斑斕的蝴蝶"
    ];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomSeed = Math.floor(Math.random() * 100000); // Add noise to prompt

    const systemPrompt = `請作為一位自然圖鑑學家，從「${randomCategory}」這個具體類別中，挑選一個真實存在、獨特且令人驚奇的授粉物種。
    請避免重複常見的物種（如普通蜜蜂），目標是讓讀者感到新奇。(隨機參數: ${randomSeed})
    
    請回傳一個 JSON 格式的資料，包含以下欄位：
    {
        "name": "物種名稱 (繁體中文)",
        "latinName": "學名 (Latin)",
        "icon": "一個最能代表該物種的 emoji (若是罕見物種可用相近動物)",
        "habitat": "棲息地簡述",
        "description": "一段約 50-80 字的優美介紹，描述它是如何授粉的，以及它的特殊冷知識。"
    }
    嚴格只回傳 JSON 字串，不要有 markdown 標記 (不要寫 \`\`\`json)，只要純 JSON。`;

    let jsonStr = await callGemini(systemPrompt);

    // Cleanup response if it contains markdown code blocks
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const data = JSON.parse(jsonStr);

        contentEl.innerHTML = `
            <div class="w-24 h-24 rounded-full bg-[#1a1a1a] border border-[#D4AF37] mx-auto mb-6 flex items-center justify-center text-5xl shadow-[0_0_15px_rgba(212,175,55,0.2)] animate-subtle-float">
                ${data.icon}
            </div>
            <h3 class="serif-font text-3xl text-white mb-1">${data.name}</h3>
            <p class="text-[#8A9A5B] italic text-sm mb-6 serif-font">${data.latinName}</p>
            
            <div class="text-left bg-[#1a1a1a] p-4 rounded-lg border border-white/5">
                <p class="text-xs text-[#D4AF37] uppercase tracking-wider mb-2">生態類別</p>
                <p class="text-gray-400 text-xs mb-4 border-b border-gray-800 pb-2">${randomCategory.split('(')[0]}</p>

                <p class="text-xs text-[#D4AF37] uppercase tracking-wider mb-2">棲息地</p>
                <p class="text-gray-300 text-sm mb-4">${data.habitat}</p>
                
                <p class="text-xs text-[#D4AF37] uppercase tracking-wider mb-2">授粉特徵</p>
                <p class="text-gray-300 text-sm leading-relaxed">${data.description}</p>
            </div>
        `;
    } catch (e) {
        console.error("JSON Parse Error", e);
        console.log("Raw output:", jsonStr);
        contentEl.innerHTML = `<p class="text-red-400">資料解析錯誤，可能因為 API 回傳格式不符。請再試一次。<br><small class="text-gray-600">${e.message}</small></p>`;
    }

    loadingEl.classList.add('hidden');
}


// --- Navigation Logic ---
// --- Navigation Logic with Transitions ---

async function switchPage(pageId) {
    const isHome = (pageId === 'home');
    const currentIsHome = document.getElementById('home-page').classList.contains('active');

    // 1. Logic for leaving Home (Close Book)
    if (currentIsHome && !isHome) {
        bookState.target = 0.0; // Close book
        // Wait for animation to progress partially (adjusted for 2x speed)
        await new Promise(r => setTimeout(r, 500));
    }

    // 2. Logic for entering Home (Open Book)
    if (isHome) {
        // Ensure book starts opening immediately if we are going there
        bookState.target = 1.0;

        // Reset specific styles for Home
        const canvas = document.getElementById('canvas-container');
        canvas.style.opacity = '1';

        const header = document.getElementById('main-header');
        header.classList.remove('bg-black/90', 'backdrop-blur-md', 'shadow-2xl', 'border-b', 'border-white/10');
        header.classList.add('py-6');

        const navContainer = document.getElementById('nav-container');
        navContainer.classList.add('bg-black/50', 'backdrop-blur-md', 'border', 'border-white/10', 'shadow-lg');
    }

    // 3. UI Update (Page Switching)
    document.querySelectorAll('.page-section').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('page-transition-enter'); // Reset anim class
    });

    const target = document.getElementById(isHome ? 'home-page' : pageId);
    if (target) {
        target.classList.add('active');
        // Apply staggered animation class to the content container inside the section
        // Note: For Solid Pages, the content is usually in the first child div
        if (!isHome) {
            const contentContainer = target.querySelector('div');
            if (contentContainer) {
                contentContainer.classList.add('page-transition-enter');
            }
        }
    }

    // 4. Update Header/Nav Styling for Non-Home
    if (!isHome) {
        const canvas = document.getElementById('canvas-container');

        // Update opacity logic: Team Page needs full brightness for Bees.
        setTimeout(() => {
            if (pageId === 'team') {
                canvas.style.opacity = '1';
            } else {
                canvas.style.opacity = '0.3';
            }
        }, 800);

        const header = document.getElementById('main-header');
        header.classList.add('bg-black/90', 'backdrop-blur-md', 'shadow-2xl', 'border-b', 'border-white/10');
        header.classList.remove('py-6');

        const navContainer = document.getElementById('nav-container');
        navContainer.classList.remove('bg-black/50', 'backdrop-blur-md', 'border', 'border-white/10', 'shadow-lg');
    }

    // 5. Update Nav Links
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('text-[#D4AF37]');
    });

    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('onclick').includes(pageId)) {
            link.classList.add('text-[#D4AF37]');
        }
    });

    // 6. Special Logic for Team Page Decorations
    // 6. Team Bees Logic
    if (teamBeeTimer) clearTimeout(teamBeeTimer);

    if (pageId === 'team') {
        // Entering Team Page: Wait 2s then show bees
        teamBeeTimer = setTimeout(() => {
            // Check if still active just in case
            if (document.getElementById('team').classList.contains('active')) {
                teamBeeGroup.visible = true;
                // Double ensure opacity is 1 just in case
                document.getElementById('canvas-container').style.opacity = '1';
            }
        }, 2000);
    } else {
        // Leaving Team Page: Hide immediately (Priority)
        teamBeeGroup.visible = false;
    }
}
// --- 3D Team Card Logic ---
const teamMembers = [
    {
        name: "廖偉傑",
        role: "組長 Team Leader",
        desc: "負責包裝結構設計與進度規劃。統籌專案的整體走向，確保每一個設計環節都能精準到位，引領團隊前進。",
        image: "img/Headshot02.jpg"
    },
    {
        name: "李岳",
        role: "組員 Team Member",
        desc: "負責立體書結構設計，網頁製作。透過精密的紙藝結構與程式邏輯，將平面的視覺轉化為立體的數位體驗。",
        image: "img/Headshot01.jpg"
    },
    {
        name: "鄭鈺儒",
        role: "組員 Team Member",
        desc: "負責插畫設計、主視覺海報設計。以細膩的筆觸描繪自然生態，賦予作品獨特的視覺美感與生命力。",
        image: "img/Headshot03.jpg"
    },
    {
        name: "張嘉容",
        role: "組員 Team Member",
        desc: "負責標準字設計與插畫設計。專注於字體結構與圖像敘事的結合，為作品注入獨特的視覺個性。",
        image: "img/Headshot04.jpg"
    },
    {
        name: "田郁棻",
        role: "組員 Team Member",
        desc: "負責企劃書與書籍編排設計。細心梳理文字脈絡與版面構成，將豐富的內容轉化為清晰優雅的閱讀體驗。",
        image: "img/Headshot05.jpg"
    },

    {
        name: "Gemini",
        role: "AI Co-Pilot",
        desc: "提供創意發想、文案撰寫與程式碼優化建議。是團隊中不知疲倦的智慧核心，隨時準備提供協助。",
        icon: "✨"
    }
];

let currentTeamIndex = 0;
let isDraggingTeam = false;
let startX = 0;
let teamCardEl = null;

// Initialize first member
function initTeam() {
    updateTeamCard(0);
}
// Call init after load
window.addEventListener('DOMContentLoaded', initTeam);

function updateTeamCard(index) {
    const member = teamMembers[index];
    const imgEl = document.getElementById('member-img');
    const iconEl = document.getElementById('member-icon');

    document.getElementById('member-name').textContent = member.name;
    document.getElementById('member-role').textContent = member.role;
    document.getElementById('member-desc').textContent = member.desc;

    // Toggle Image vs Icon
    if (member.image) {
        imgEl.src = member.image;
        imgEl.classList.remove('hidden');
        if (iconEl) iconEl.classList.add('hidden');
    } else {
        imgEl.classList.add('hidden');
        if (iconEl) {
            iconEl.classList.remove('hidden');
            iconEl.textContent = member.icon;
        }
    }
}

function startTeamDrag(e) {
    isDraggingTeam = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    teamCardEl = document.getElementById('team-card');

    // Add temporary listeners for move/up
    if (e.type.includes('mouse')) {
        document.addEventListener('mousemove', onTeamDragMove);
        document.addEventListener('mouseup', onTeamDragEnd);
    } else {
        document.addEventListener('touchmove', onTeamDragMove);
        document.addEventListener('touchend', onTeamDragEnd);
    }
}

function onTeamDragMove(e) {
    if (!isDraggingTeam) return;
    // Optional: Follow finger slightly? (Rotation transform)
    // skipping for simplicity, just detect swipe at end
}

function onTeamDragEnd(e) {
    if (!isDraggingTeam) return;
    isDraggingTeam = false;

    // Cleanup listeners
    document.removeEventListener('mousemove', onTeamDragMove);
    document.removeEventListener('mouseup', onTeamDragEnd);
    document.removeEventListener('touchmove', onTeamDragMove);
    document.removeEventListener('touchend', onTeamDragEnd);

    const endX = e.type.includes('mouse') ? e.clientX : (e.changedTouches ? e.changedTouches[0].clientX : startX);
    const diff = endX - startX;

    if (Math.abs(diff) > 50) {
        if (diff > 0) {
            triggerFlip('right'); // Dragged right, switch to previous
        } else {
            triggerFlip('left'); // Dragged left, switch to next
        }
    }
}

function triggerFlip(direction) {
    if (!teamCardEl) teamCardEl = document.getElementById('team-card');

    // 1. Flip Out
    const outClass = direction === 'left' ? 'flip-out-left' : 'flip-out-right';
    teamCardEl.classList.add(outClass);

    // 2. Wait for half flip (at 90deg) to swap content
    setTimeout(() => {
        if (direction === 'left') {
            currentTeamIndex = (currentTeamIndex + 1) % teamMembers.length;
        } else {
            currentTeamIndex = (currentTeamIndex - 1 + teamMembers.length) % teamMembers.length;
        }
        updateTeamCard(currentTeamIndex);

        // 3. Remove Out class, Add In class
        teamCardEl.classList.remove(outClass);
        const inClass = direction === 'left' ? 'flip-in-right' : 'flip-in-left';
        teamCardEl.classList.add(inClass);

        // 4. Cleanup In class after animation matches style.css animation duration (0.5s)
        setTimeout(() => {
            teamCardEl.classList.remove(inClass);
        }, 500);

    }, 250); // Half of 0.5s animation
}


// Keyboard navigation for Team Flip
document.addEventListener('keydown', (e) => {
    const teamSection = document.getElementById('team');
    // Only trigger if team section is active
    if (!teamSection || !teamSection.classList.contains('active')) return;

    if (e.key === 'ArrowRight') {
        triggerFlip('left'); // Next member
    } else if (e.key === 'ArrowLeft') {
        triggerFlip('right'); // Prev member
    }
});

// --- 1. Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const BG_COLOR = 0x050505;
scene.background = new THREE.Color(BG_COLOR);
scene.fog = new THREE.FogExp2(BG_COLOR, 0.035);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
// Initial setup for responsive camera
updateCameraPosition();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- 2. Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
dirLight.position.set(0, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0001;
scene.add(dirLight);

const rimLight = new THREE.PointLight(0x445588, 1.0);
rimLight.position.set(-10, 5, -10);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x886644, 0.5);
fillLight.position.set(10, 5, 10);
scene.add(fillLight);

// --- 3. Objects ---
const paperWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    emissive: 0x111111,
    side: THREE.DoubleSide
});
const paperSageMat = new THREE.MeshStandardMaterial({ color: 0x9CB070, roughness: 0.8 });
const paperDarkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const paperGoldMat = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    roughness: 0.3,
    metalness: 0.3,
    emissive: 0x221100
});

const bookGroup = new THREE.Group();
scene.add(bookGroup);
bookGroup.scale.set(1.4, 1.4, 1.4);

// Global references for animation
let bookState = { value: 1.0, target: 1.0 }; // 1.0 = Open, 0.0 = Closed

const tableGeo = new THREE.PlaneGeometry(60, 60);
const tableMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.2
});
const table = new THREE.Mesh(tableGeo, tableMat);
table.rotation.x = -Math.PI / 2;
table.position.y = -0.5;
table.receiveShadow = true;
scene.add(table);

// Global references for animation
let leftPivot, rightPivot, linesGroup;

function createBook() {
    // 1. Define Pivots (Hinge at 0,0,0 - Spine Center)
    leftPivot = new THREE.Group();
    rightPivot = new THREE.Group();
    bookGroup.add(leftPivot);
    bookGroup.add(rightPivot);

    const pageGeo = new THREE.BoxGeometry(4, 0.1, 6);

    // 2. Left Page (Child of LeftPivot)
    // Offset position: Width/2 + tiny gap.
    // Box center is 0. So to place right edge at pivot 0: move x by -Width/2.
    // -2.0.
    leftPage = new THREE.Mesh(pageGeo, paperWhiteMat);
    leftPage.position.set(-2.0, 0, 0);
    leftPage.castShadow = true;
    leftPage.receiveShadow = true;
    leftPivot.add(leftPage);

    // 3. Right Page (Child of RightPivot)
    rightPage = new THREE.Mesh(pageGeo, paperWhiteMat);
    rightPage.position.set(2.0, 0, 0);
    rightPage.castShadow = true;
    rightPage.receiveShadow = true;
    rightPivot.add(rightPage);

    // 4. Spine (Static, or child of one? keep static in middle)
    const spineGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 16);
    const spine = new THREE.Mesh(spineGeo, paperWhiteMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.y = -0.05;
    bookGroup.add(spine);

    // 5. Lines (Attach to Left Page)
    linesGroup = new THREE.Group();
    leftPage.add(linesGroup); // Move with page!

    const lineGeo = new THREE.PlaneGeometry(2.5, 0.05);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    for (let i = 0; i < 8; i++) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        // Pos relative to Page Center (-2, 0, 0)
        // We want them centered on the page surface.
        // Page surface Y = 0.05.
        // Line X: 0 (center of page). 
        // Line Z: spread out.
        line.position.set(0, 0.06, -2 + (i * 0.5));
        // line.rotation.z = 0.15; // Removed: inherits from page
        linesGroup.add(line);
    }
}
createBook();

const popupGroup = new THREE.Group();
bookGroup.add(popupGroup);

function createFlower(x, z, scale) {
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 5);
    const stem = new THREE.Mesh(stemGeo, paperSageMat);
    stem.position.y = 0.75;
    stem.castShadow = true;

    const bloomGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const bloom = new THREE.Mesh(bloomGeo, paperWhiteMat);
    bloom.position.y = 1.5;
    bloom.castShadow = true;

    const flower = new THREE.Group();
    flower.add(stem);
    flower.add(bloom);
    flower.position.set(x, 0, z);
    flower.scale.set(scale, scale, scale);
    flower.rotation.y = Math.random() * Math.PI;
    flower.rotation.z = (Math.random() - 0.5) * 0.2;
    return flower;
}

for (let i = 0; i < 6; i++) {
    const f = createFlower(1 + Math.random() * 2, (Math.random() - 0.5) * 4, 0.8 + Math.random() * 0.4);
    popupGroup.add(f);
}

const bees = [];
function createBee() {
    const beeGroup = new THREE.Group();
    const bodyGeo = new THREE.ConeGeometry(0.15, 0.4, 5);
    const body = new THREE.Mesh(bodyGeo, paperGoldMat);
    body.rotation.x = -Math.PI / 2;
    beeGroup.add(body);

    const headGeo = new THREE.IcosahedronGeometry(0.12, 0);
    const head = new THREE.Mesh(headGeo, paperDarkMat);
    head.position.z = 0.25;
    beeGroup.add(head);

    const wingGeo = new THREE.PlaneGeometry(0.3, 0.15);
    const wingMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        emissive: 0x444444
    });
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.2, 0.1, 0);
    wingL.rotation.z = 0.2;
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.2, 0.1, 0);
    wingR.rotation.z = -0.2;

    beeGroup.add(wingL);
    beeGroup.add(wingR);

    beeGroup.userData = {
        angle: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        radius: 1.5 + Math.random() * 1.5,
        yOffset: 2 + Math.random() * 1.5,
        bobSpeed: 2 + Math.random() * 2
    };
    return beeGroup;
}

for (let i = 0; i < 5; i++) {
    const bee = createBee();
    bees.push(bee);
    scene.add(bee);
}

// --- 4. Animation ---
let mouseX = 0;
let mouseY = 0;

// Gyroscope Variables
let gyroX = 0;
let gyroY = 0;
let initialGamma = null;
let initialBeta = null;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
});

const clock = new THREE.Clock();

// --- 3D Team Bees Logic ---
const teamBeeGroup = new THREE.Group();
scene.add(teamBeeGroup);
teamBeeGroup.visible = false; // Hidden by default

// Create 3 special bees for the team card
for (let i = 0; i < 3; i++) {
    const bee = createBee();

    // Clone materials for fade-in capability
    bee.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0; // Start invisible
        }
    });

    bee.userData.radius = 2.5 + Math.random();
    bee.userData.yOffset = -0.5 + Math.random();
    bee.userData.speed = 0.01 + Math.random() * 0.005; // Slower speed
    teamBeeGroup.add(bee);
}

// Timer reference
// Timer reference
let teamBeeTimer = null;
let teamBeeOpacity = 0;
let currentParallaxWeight = 1.0;


function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Responsive Parallax Intensity
    const isMobile = window.innerWidth < 768;
    const parallaxScale = isMobile ? 0.5 : 2;

    // Override for Team Page (Disable Parallax Smoothly)
    const isTeamPage = document.getElementById('team') && document.getElementById('team').classList.contains('active');

    // Smooth Lerp for Parallax Weight
    const targetWeight = isTeamPage ? 0.0 : 1.0;
    currentParallaxWeight += (targetWeight - currentParallaxWeight) * 0.05;

    let effectiveMouseX = mouseX * parallaxScale * currentParallaxWeight;
    let effectiveMouseY = mouseY * parallaxScale * currentParallaxWeight;
    let effectiveGyroX = gyroX * currentParallaxWeight;
    let effectiveGyroY = gyroY * currentParallaxWeight;

    camera.position.x = 0 + effectiveMouseX + effectiveGyroX;
    // Keep base Y consistent with responsive setup
    const baseY = isMobile ? 14 : 10;
    camera.position.y = baseY + effectiveMouseY - effectiveGyroY;
    camera.lookAt(0, 0, 0);

    // Book Opening/Closing Animation Logic
    // Faster closing speed (2x normal) for snappy "disappear" feel
    const lerpSpeed = (bookState.target < bookState.value) ? 0.10 : 0.05;
    bookState.value += (bookState.target - bookState.value) * lerpSpeed;

    // Derived Animation Values
    let contentScale = 0;
    let bookRotation = 0; // 0 = Open, 1.57 = Closed
    let currentBookScale = 1.4;

    // Define Animation Phases (1.0 -> 0.0)
    // 1.0 -> 0.6: Content Vanishes
    // 0.6 -> 0.2: Book Closes
    // 0.2 -> 0.0: Book Shrinks to Nothing

    if (bookState.value > 0.6) {
        // --- Phase 1: Content Scaling ---
        // Map 0.6->1.0 to 0.0->1.0
        contentScale = (bookState.value - 0.6) / 0.4;
        bookRotation = 0;
        currentBookScale = 1.4;
    } else if (bookState.value > 0.2) {
        // --- Phase 2: Book Closing ---
        contentScale = 0;
        // Map 0.2->0.6 to 1.0->0.0 (Closed->Open logic)
        // 0.2 = Closed (Rot 1.57), 0.6 = Open (Rot 0)
        const pct = (bookState.value - 0.2) / 0.4;
        bookRotation = (1 - pct) * 1.57;
        currentBookScale = 1.4;
    } else {
        // --- Phase 3: Book Vanishing ---
        contentScale = 0;
        bookRotation = 1.57; // Fully Closed
        // Map 0.0->0.2 to 0.0->1.4
        const pct = bookState.value / 0.2;
        currentBookScale = pct * 1.4;
    }

    // Apply Scale to Book
    bookGroup.scale.set(currentBookScale, currentBookScale, currentBookScale);

    // Apply Rotation to Pivots (Correct Hinge Logic)
    if (leftPivot && rightPivot) {
        leftPivot.rotation.z = -bookRotation;
        rightPivot.rotation.z = bookRotation;
    }

    // Apply Content Scaling
    if (linesGroup) linesGroup.scale.set(contentScale, contentScale, contentScale);
    popupGroup.scale.set(contentScale, contentScale, contentScale);
    popupGroup.visible = contentScale > 0.01;

    bees.forEach(bee => {
        // Scale bees too
        bee.scale.set(contentScale, contentScale, contentScale);
        bee.visible = contentScale > 0.01;

        if (contentScale > 0.01) {
            const data = bee.userData;
            data.angle += data.speed;
            bee.position.x = Math.cos(data.angle) * data.radius;
            bee.position.z = Math.sin(data.angle) * data.radius;
            bee.position.y = data.yOffset + Math.sin(time * data.bobSpeed) * 0.2;
            bee.rotation.y = -data.angle;
            bee.children[2].rotation.x = Math.sin(time * 30) * 0.5;
            bee.children[3].rotation.x = Math.sin(time * 30) * 0.5;
        }
    });

    // --- Team Bees Animation ---
    if (teamBeeGroup.visible) {
        // Fade In
        if (teamBeeOpacity < 1.0) {
            teamBeeOpacity += 0.01;
            if (teamBeeOpacity > 1.0) teamBeeOpacity = 1.0;
        }
    } else {
        teamBeeOpacity = 0;
    }

    if (teamBeeGroup.visible || teamBeeOpacity > 0) {
        const spreadScale = isMobile ? 1.0 : 2.0; // Larger range on PC (2.0x base radius)

        teamBeeGroup.children.forEach(bee => {
            // Apply Fade In Opacity
            bee.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.opacity = teamBeeOpacity;
                }
            });

            const data = bee.userData;
            data.angle += data.speed;

            // Apply Responsive Spread
            bee.position.x = Math.cos(data.angle) * data.radius * spreadScale;
            bee.position.z = Math.sin(data.angle) * data.radius * spreadScale;

            bee.position.y = data.yOffset + Math.sin(time * data.bobSpeed) * 0.2;
            bee.rotation.y = -data.angle;
            bee.children[2].rotation.x = Math.sin(time * 30) * 0.5;
            bee.children[3].rotation.x = Math.sin(time * 30) * 0.5;
        });
    }

    bookGroup.position.y = Math.sin(time * 0.5) * 0.1;

    // Popup float animation
    popupGroup.children.forEach((child, idx) => {
        if (contentScale > 0.1) child.rotation.z = (Math.sin(time * 1.5 + idx) * 0.05);
    });
    renderer.render(scene, camera);
}
animate();

// Responsive Camera Adjustment Logic
function updateCameraPosition() {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect < 1) {
        // Portrait (Mobile)
        // Move camera further back and higher up to fit the book
        camera.position.set(0, 14, 14);
    } else {
        // Landscape (Desktop)
        camera.position.set(0, 10, 8);
    }
    camera.lookAt(0, 0, 0);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCameraPosition(); // Recalculate camera pos on resize
});

// --- 5. Mobile Gyroscope Parallax ---


function handleOrientation(event) {
    // calibrate on first valid reading
    if (initialGamma === null && event.gamma !== null) {
        initialGamma = event.gamma;
        initialBeta = event.beta;
    }

    if (event.gamma !== null && event.beta !== null) {
        // Calculate relative tilt
        // Limit the range to avoid extreme camera angles
        const g = event.gamma - initialGamma; // Left/Right
        const b = event.beta - initialBeta;   // Front/Back

        // Dampening and clamping
        // Gamma (Left/Right) controls X
        gyroX = THREE.MathUtils.clamp(g * 0.05, -3, 3);

        // Beta (Front/Back) controls Y
        // Note: For beta, we want to invert it so tilting back (positive) moves camera down or up depending on preference
        // Usually tilting top-of-phone back (positive beta) -> look up? 
        // Let's stick to mapping it affecting Y position.
        gyroY = THREE.MathUtils.clamp(b * 0.05, -3, 3);
    }
}

// Request permission for iOS 13+
function requestMotionPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            })
            .catch(console.error);
    } else {
        // Non-iOS or older devices
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

// Add global listener to trigger permission request on first interaction
document.addEventListener('click', function initOps() {
    requestMotionPermission();
    document.removeEventListener('click', initOps);
});
