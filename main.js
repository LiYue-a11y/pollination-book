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
function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => {
        el.classList.remove('active');
    });
    const target = document.getElementById(pageId === 'home' ? 'home-page' : pageId);
    if (target) target.classList.add('active');

    const canvas = document.getElementById('canvas-container');
    const header = document.getElementById('main-header');
    const navContainer = document.getElementById('nav-container');

    if (pageId === 'home') {
        canvas.style.opacity = '1';
        // Reset header style for home (transparent)
        header.classList.remove('bg-black/90', 'backdrop-blur-md', 'shadow-2xl', 'border-b', 'border-white/10');
        header.classList.add('py-6'); // Restore padding

        // Restore nav container pill style
        navContainer.classList.add('bg-black/50', 'backdrop-blur-md', 'border', 'border-white/10', 'shadow-lg');
    } else {
        canvas.style.opacity = '0';
        // Apply solid header style for content pages
        header.classList.add('bg-black/90', 'backdrop-blur-md', 'shadow-2xl', 'border-b', 'border-white/10');
        header.classList.remove('py-6'); // Reduce padding slightly if needed, or keep

        // Remove nav container pill style to blend with header
        navContainer.classList.remove('bg-black/50', 'backdrop-blur-md', 'border', 'border-white/10', 'shadow-lg');
    }

    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('text-[#D4AF37]');
    });

    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('onclick').includes(pageId)) {
            link.classList.add('text-[#D4AF37]');
        }
    });
}

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

function createBook() {
    const pageGeo = new THREE.BoxGeometry(4, 0.1, 6);
    const leftPage = new THREE.Mesh(pageGeo, paperWhiteMat);
    leftPage.position.set(-2.05, 0, 0);
    leftPage.castShadow = true;
    leftPage.receiveShadow = true;
    leftPage.rotation.z = 0.15;

    const rightPage = new THREE.Mesh(pageGeo, paperWhiteMat);
    rightPage.position.set(2.05, 0, 0);
    rightPage.castShadow = true;
    rightPage.receiveShadow = true;
    rightPage.rotation.z = -0.15;

    const spineGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 16);
    const spine = new THREE.Mesh(spineGeo, paperWhiteMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.y = -0.05;

    const lineGeo = new THREE.PlaneGeometry(2.5, 0.05);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    for (let i = 0; i < 8; i++) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(-2, 0.15, -2 + (i * 0.5));
        line.rotation.z = 0.15;
        bookGroup.add(line);
    }

    bookGroup.add(leftPage);
    bookGroup.add(rightPage);
    bookGroup.add(spine);
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

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Responsive Parallax Intensity
    const isMobile = window.innerWidth < 768;
    const parallaxScale = isMobile ? 0.5 : 2; // Reduce mouse movement effect on mobile

    camera.position.x = 0 + (mouseX * parallaxScale) + gyroX;
    // Keep base Y consistent with responsive setup
    const baseY = isMobile ? 14 : 10;
    camera.position.y = baseY + (mouseY * parallaxScale) - gyroY; // Subtract gyroY to make tilt-back move camera down (natural feel)
    camera.lookAt(0, 0, 0);

    bookGroup.position.y = Math.sin(time * 0.5) * 0.1;

    popupGroup.children.forEach((child, idx) => {
        child.rotation.z = (Math.sin(time * 1.5 + idx) * 0.05);
    });

    bees.forEach(bee => {
        const data = bee.userData;
        data.angle += data.speed;
        bee.position.x = Math.cos(data.angle) * data.radius;
        bee.position.z = Math.sin(data.angle) * data.radius;
        bee.position.y = data.yOffset + Math.sin(time * data.bobSpeed) * 0.2;
        bee.rotation.y = -data.angle;
        bee.children[2].rotation.x = Math.sin(time * 30) * 0.5;
        bee.children[3].rotation.x = Math.sin(time * 30) * 0.5;
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
