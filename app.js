/**
 * DATA VIEW - MASTER ENGINE v25.0
 * Fixes: High-priority State Saving, Black Nav Icons, Persistent History.
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;

// Drag & Interaction State
let draggingElement = null;
let isDraggingNew = false;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// ... Presets and Drag Logic remain unchanged ...

// --- HARD SAVE SYSTEM ---
function saveAll() {
    localStorage.setItem('dataView_master_final', JSON.stringify(views));
}

// --- ZIP EXPORT (Excel + Persistent Log) ---
async function exportData() {
    if (!currentView || !currentView.data) return alert("No data to export!");
    const zip = new JSZip();
    const fileNameBase = (currentView.name || 'View').replace(/\s+/g, '_');

    // 1. Updated Excel
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData");
    const excelBin = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    zip.file(`${fileNameBase}_updated.xlsx`, excelBin);

    // 2. History Log
    let logText = `HISTORY LOG - ${currentView.name}\nExported: ${new Date().toLocaleString()}\n`;
    logText += `--------------------------------------------------\n`;
    
    if (currentView.history && currentView.history.length > 0) {
        currentView.history.forEach(entry => {
            logText += `Row #${entry.row} | Old: ${entry.old} | Updated: ${entry.new}\n`;
        });
    } else {
        logText += "No manual edits were recorded for this view.\n";
    }
    zip.file("history.log", logText);

    // 3. Zip Download
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${fileNameBase}_Package.zip`;
    link.click();
}

// --- LIVE EDITING (Fixed Persistence) ---
function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const oldVal = currentView.data[currentRowIndex][box.textVal] || '---';
    const newVal = prompt(`Editing Variable: ${box.textVal}\nEnter new value:`, oldVal);

    if (newVal !== null && newVal !== oldVal) {
        // Force initialize history if null
        if (!currentView.history) currentView.history = [];

        // Record the event
        currentView.history.push({
            row: currentRowIndex + 1,
            old: oldVal,
            new: newVal,
            timestamp: new Date().toLocaleTimeString()
        });

        // Update the actual dataset used for export
        currentView.data[currentRowIndex][box.textVal] = newVal;
        
        // Critical: Save entire state to LocalStorage immediately
        saveAll();
        
        // UI Refresh
        closePop();
        renderSlide();
    }
}

// --- PRESENTATION RENDER ---
function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas"></div>
            <div class="floating-controls">
                <button class="icon-btn" onclick="window.close()">${iconHome}</button>
                <div class="slide-counter">${currentRowIndex+1} / ${currentView.data.length}</div>
                <div class="nav-group-right">
                    <button class="icon-btn" onclick="prevSlide()">${iconLeft}</button>
                    <button class="icon-btn" onclick="nextSlide()">${iconRight}</button>
                </div>
            </div>
        </div>`;
    
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onclick = () => openDetailModal(i, val);
        canvas.appendChild(div);
    });
}

// ... rest of the helper functions remain consistent ...
function openDetailModal(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    const editBtn = box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>` : '';
    overlay.innerHTML = `
        <div class="detail-modal">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>${box.title}</h2>
                <div style="font-size:2.5rem; cursor:pointer;" onclick="closePop()">✕</div>
            </div>
            <div class="detail-scroll-content">${val}</div>
            <div style="display:flex; justify-content:flex-end; gap:15px;">
                ${editBtn}
                <button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function prevSlide() { if (currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
function nextSlide() { if (currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
