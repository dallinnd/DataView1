class DataViewApp {
    constructor() {
        this.views = JSON.parse(localStorage.getItem('DV_v40_Final')) || [];
        this.activeView = null;
        this.currentBoxIdx = null;
        this.currentRowIdx = 0;
        this.history = [];
        this.init();
    }

    init() { this.renderHome(); }

    save() {
        const idx = this.views.findIndex(v => v.id === this.activeView.id);
        (idx > -1) ? this.views[idx] = this.activeView : this.views.push(this.activeView);
        localStorage.setItem('DV_v40_Final', JSON.stringify(this.views));
    }

    renderHome() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="home-container">
                <h1 style="font-size: 3.5rem; margin-bottom: 10px;">Data View</h1>
                <button class="primary-btn" onclick="app.screenNewView()" style="padding: 25px; font-size: 1.2rem;">+ Create New View</button>
                <h2 style="margin-top: 50px; color: var(--slate); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">View Existing Displays</h2>
                <div id="view-list"></div>
            </div>`;
        
        const list = document.getElementById('view-list');
        this.views.forEach(v => {
            const card = document.createElement('div');
            card.className = 'view-card';
            card.innerHTML = `<div><strong>${v.name}</strong><br><small>${new Date(v.id).toLocaleDateString()}</small></div>`;
            card.onclick = () => this.screenViewMenu(v.id);
            list.appendChild(card);
        });
    }

    screenNewView() {
        this.activeView = { id: Date.now(), name: "New View", boxes: [], data: [], headers: [], history: [] };
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="home-container" style="text-align:center; padding-top:100px;">
                <h1>Step 1: Import Excel</h1>
                <p>Upload your spreadsheet to generate variables.</p>
                <input type="file" id="excel-up" accept=".xlsx" style="display:none">
                <button class="blue-btn" onclick="document.getElementById('excel-up').click()" style="padding: 20px 50px;">Upload .xlsx</button>
            </div>`;

        document.getElementById('excel-up').onchange = (e) => this.handleImport(e);
    }

    handleImport(e) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type: 'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            this.activeView.data = data;
            this.activeView.headers = Object.keys(data[0] || {});
            this.screenCanvasEdit();
        };
        reader.readAsBinaryString(e.target.files[0]);
    }

    screenCanvasEdit() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <header class="canvas-header-nav">
                <input type="text" id="view-name" value="${this.activeView.name}" style="border:none; font-size:1.5rem; font-weight:800; outline:none;">
                <button class="blue-btn" onclick="app.saveAndGoMenu()" style="padding: 10px 30px;">Save & Next</button>
            </header>
            <main class="canvas-area">
                <div style="width: 100%; max-width: 1100px;">
                    <h4 style="margin-bottom:10px;">Your Canvas</h4>
                    <div class="canvas-16-9">
                        <div class="grid-container" id="main-grid"></div>
                    </div>
                </div>
            </main>
            <footer class="box-picker">
                ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => `
                    <div class="size-btn" onclick="app.addBox('${s}')">${s}</div>
                `).join('')}
            </footer>`;
        this.renderCanvas();
    }

    addBox(size) {
        const [w, h] = size.split('x').map(Number);
        this.activeView.boxes.push({
            x: 0, y: 0, w, h, title: "Title", textVal: "Value", 
            isVar: false, bgColor: "#ffffff", textColor: "#000000", fontSize: 24
        });
        this.renderCanvas();
    }

    renderCanvas() {
        const grid = document.getElementById('main-grid');
        grid.innerHTML = '';
        this.activeView.boxes.forEach((box, i) => {
            const div = document.createElement('div');
            div.className = 'box-instance';
            div.style.gridArea = `${box.y + 1} / ${box.x + 1} / span ${box.h} / span ${box.w}`;
            div.style.background = box.bgColor;
            div.style.color = box.textColor;
            div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px">${box.isVar ? '<'+box.textVal+'>' : box.textVal}</div>`;
            div.onclick = () => this.openEditorPopup(i);
            grid.appendChild(div);
        });
    }

    openEditorPopup(idx) {
        this.currentBoxIdx = idx;
        const box = this.activeView.boxes[idx];
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.innerHTML = `
            <div class="detail-modal">
                <div class="editor-left">
                    <div class="box-preview-big" style="background:${box.bgColor}; color:${box.textColor}">
                        <input type="text" value="${box.title}" oninput="app.updateBox('title', this.value)" style="background:none; border:none; text-align:center; font-weight:700; color:inherit;">
                        <div class="box-content" style="font-size:${box.fontSize}px">${box.isVar ? box.textVal : 'Constant'}</div>
                    </div>
                    <button class="blue-btn" style="margin-top:30px" onclick="app.toggleVarList()">Add Import Variable</button>
                    <div id="var-list" style="display:none; margin-top:20px; width:100%; max-height:150px; overflow-y:auto;">
                        ${this.activeView.headers.map(h => `<div onclick="app.setVar('${h}')" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;">${h}</div>`).join('')}
                    </div>
                </div>
                <div class="editor-right">
                    <h3>Coloring</h3>
                    <label>Background Color</label>
                    <input type="color" value="${box.bgColor}" onchange="app.updateBox('bgColor', this.value)">
                    <label>Text Color</label>
                    <input type="color" value="${box.textColor}" onchange="app.updateBox('textColor', this.value)">
                    <h3>Size</h3>
                    <button class="size-btn" onclick="app.updateBox('fontSize', ${box.fontSize + 4})">Increase +</button>
                    <button class="size-btn" onclick="app.updateBox('fontSize', ${box.fontSize - 4})">Decrease -</button>
                    <button class="primary-btn green-save" onclick="app.closePop()" style="margin-top:auto; padding:20px;">Save Box</button>
                </div>
                <button onclick="app.deleteBox(${idx})" style="position:absolute; top:20px; right:20px; color:red; background:none;">Delete</button>
            </div>`;
        document.body.appendChild(overlay);
    }

    // Help Functions
    updateBox(key, val) { 
        this.activeView.boxes[this.currentBoxIdx][key] = val; 
        this.renderCanvas(); 
    }
    setVar(h) { 
        this.activeView.boxes[this.currentBoxIdx].textVal = h; 
        this.activeView.boxes[this.currentBoxIdx].isVar = true;
        this.closePop(); 
        this.renderCanvas(); 
    }
    deleteBox(i) { this.activeView.boxes.splice(i, 1); this.closePop(); this.renderCanvas(); }
    closePop() { document.querySelector('.popup-overlay').remove(); }
    toggleVarList() { document.getElementById('var-list').style.display = 'block'; }
    saveAndGoMenu() { this.activeView.name = document.getElementById('view-name').value; this.save(); this.screenViewMenu(); }

    screenViewMenu(id) {
        if (id) this.activeView = this.views.find(v => v.id === id);
        document.getElementById('app').innerHTML = `
            <div style="height:100vh; display:flex; background:var(--bg-soft);">
                <div class="menu-2x2">
                    <div class="menu-item" onclick="app.renderHome()">Home</div>
                    <div class="menu-item" onclick="app.startPresentation()">View</div>
                    <div class="menu-item" onclick="app.screenCanvasEdit()">Edit</div>
                    <div class="menu-item danger" style="color:red;" onclick="app.deleteView()">Delete</div>
                </div>
            </div>`;
    }

    deleteView() { this.views = this.views.filter(v => v.id !== this.activeView.id); localStorage.setItem('DV_v40_Final', JSON.stringify(this.views)); this.renderHome(); }

    startPresentation() {
        this.currentRowIdx = 0;
        this.renderSlide();
    }

    renderSlide() {
        const row = this.activeView.data[this.currentRowIdx];
        const app = document.getElementById('app');
        
        // First Slide: Title
        if (this.currentRowIdx === 0) {
            app.innerHTML = `<div style="height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column; background:white;">
                <h1 style="font-size:6rem; font-weight:900;">${this.activeView.name}</h1>
                <button class="primary-btn" onclick="app.nextSlide()" style="padding:20px 40px;">Begin Presentation →</button>
            </div>`;
        } else {
            // Presentation Canvas
            app.innerHTML = `
                <div class="canvas-area" style="height:100vh; width:100vw; padding:0;">
                    <div class="canvas-16-9" style="max-width:95vw; border:none; box-shadow:none;">
                        <div class="grid-container">
                            ${this.activeView.boxes.map((box, i) => {
                                const val = box.isVar ? (this.activeView.data[this.currentRowIdx-1][box.textVal] || '---') : box.textVal;
                                return `<div class="box-instance" onclick="app.showFullText('${val}')" style="grid-area:${box.y+1}/${box.x+1}/span ${box.h}/span ${box.w}; background:${box.bgColor}; color:${box.textColor};">
                                    <div class="box-title">${box.title}</div>
                                    <div class="box-content" style="font-size:${box.fontSize}px">${val}</div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
                <div style="position:fixed; bottom:20px; right:20px; display:flex; gap:10px;">
                    <button class="blue-btn" onclick="app.prevSlide()">Prev</button>
                    <button class="blue-btn" onclick="app.nextSlide()">Next</button>
                </div>`;
        }
    }

    showFullText(val) {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.innerHTML = `<div class="detail-modal" style="flex-direction:column; justify-content:center; text-align:center;">
            <div style="font-size:4rem; font-weight:900; overflow-y:auto; max-height:70vh; padding:20px;">${val}</div>
            <button class="blue-btn" onclick="app.closePop()" style="margin-top:40px; padding:20px 60px;">Close X</button>
        </div>`;
        document.body.appendChild(overlay);
    }

    nextSlide() { 
        if (this.currentRowIdx < this.activeView.data.length) { 
            this.currentRowIdx++; 
            this.renderSlide(); 
        } else {
            this.renderHome();
        }
    }
}
const app = new DataViewApp();
