/**
 * Main Application Logic
 * Handles step navigation, size selection, and image upload
 */

const app = {
    // Grid dimensions for each ratio and precision level
    gridDimensions: {
        '16:9': [[30, 18], [50, 28], [100, 56], [150, 84]],
        '4:3': [[30, 24], [50, 38], [100, 76], [150, 114]],
        '1:1': [[30, 30], [50, 50], [100, 100], [150, 150]],
        '3:4': [[24, 30], [38, 50], [76, 100], [114, 150]],
        '9:16': [[18, 30], [28, 50], [56, 100], [84, 150]]
    },

    // Current state
    state: {
        currentStep: 1,
        selectedRatio: '16:9',
        selectedLevel: 0,
        uploadedImage: null,
        pixelArt: null,
        colors: {},
        currentColorGroup: 1,
        currentColor: '#051616'
    },

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.initializeColorLoader();
        this.updateGridDisplay();
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Size selection
        document.querySelectorAll('.size-item').forEach(item => {
            item.addEventListener('click', () => this.selectSize(item));
        });

        // Level selection
        document.querySelectorAll('.level-item').forEach(item => {
            item.addEventListener('click', () => this.selectLevel(item));
        });

        // Upload area
        const uploadArea = document.getElementById('upload-area');
        const imageInput = document.getElementById('image-input');

        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#997C7B';
            uploadArea.style.backgroundColor = '#FFF6EA';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#FFE4BA';
            uploadArea.style.backgroundColor = 'transparent';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#FFE4BA';
            uploadArea.style.backgroundColor = 'transparent';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // Info button
        document.getElementById('info-btn').addEventListener('click', () => {
            document.getElementById('info-popup').classList.remove('hidden');
        });

        document.querySelector('.btn-close').addEventListener('click', () => {
            document.getElementById('info-popup').classList.add('hidden');
        });

        document.getElementById('info-popup').addEventListener('click', (e) => {
            if (e.target.id === 'info-popup') {
                document.getElementById('info-popup').classList.add('hidden');
            }
        });

        // Home button: reload the page to fully reset the application
        document.getElementById('btn-home').addEventListener('click', () => {
            window.location.reload();
        });

        // WeChat QR click -> show popup with QR image
        const wechatEl = document.getElementById('wechat-qr');
        if (wechatEl) {
            wechatEl.style.cursor = 'pointer';
            wechatEl.addEventListener('click', () => this.showWeChatPopup());
        }
    },

    /**
     * Initialize color loader
     */
    async initializeColorLoader() {
        try {
            const colorData = await colorLoader.initialize();
            this.state.colors = colorData;
            console.log('Colors loaded:', colorData);
            
            // Setup color panel after colors are loaded
            if (window.tools) {
                tools.setupColorPanel();
            }
        } catch (error) {
            console.error('Error loading colors:', error);
        }
    },

    /**
     * Select size/ratio
     */
    selectSize(item) {
        // Remove previous selection
        document.querySelectorAll('.size-item').forEach(s => {
            s.setAttribute('data-selected', 'false');
        });

        // Set new selection
        item.setAttribute('data-selected', 'true');
        this.state.selectedRatio = item.getAttribute('data-ratio');

        // Update grid display
        this.updateGridDisplay();
    },

    /**
     * Select precision level
     */
    selectLevel(item) {
        // Remove previous selection
        document.querySelectorAll('.level-item').forEach(l => {
            l.setAttribute('data-selected', 'false');
        });

        // Set new selection
        item.setAttribute('data-selected', 'true');
        this.state.selectedLevel = parseInt(item.getAttribute('data-level'));

        // Update grid display
        this.updateGridDisplay();
    },

    /**
     * Update grid display
     */
    updateGridDisplay() {
        const dims = this.gridDimensions[this.state.selectedRatio][this.state.selectedLevel];
        const gridDisplay = document.getElementById('grid-display');
        gridDisplay.textContent = `${dims[0]} x ${dims[1]}`;
    },

    /**
     * Handle image upload
     */
    handleImageUpload(file) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Auto-crop the center portion to the selected aspect and grid size
            this.autoCropCenter(e.target.result);
        };
        reader.readAsDataURL(file);
    },

    /**
     * Show interactive crop UI to allow user to pan & zoom the image
     */
    autoCropCenter(imageData) {
        const dims = this.gridDimensions[this.state.selectedRatio][this.state.selectedLevel];
        const gridW = dims[0];
        const gridH = dims[1];
        const desiredAspect = gridW / gridH;

        const img = new Image();
        img.onload = () => {
            // Store original image for cropper
            this.state._cropImg = img;
            this.state._cropGridW = gridW;
            this.state._cropGridH = gridH;
            this.state._cropAspect = desiredAspect;

            // Calculate initial fit (same as old center-crop logic)
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const imgAspect = nw / nh;

            // Initial scale: fit so crop area is filled
            let initScale;
            if (imgAspect > desiredAspect) {
                initScale = 1; // height-limited
            } else {
                initScale = 1; // width-limited
            }

            this.state._cropScale = initScale;
            this.state._cropMinScale = 0.1;
            this.state._cropMaxScale = 5;
            // Offset in image-space (0,0 = center)
            this.state._cropOffsetX = 0;
            this.state._cropOffsetY = 0;

            this.showCropPreview();
            this.enableNextButton();
        };
        img.src = imageData;
    },

    /**
     * Show the crop preview with pan/zoom controls
     */
    showCropPreview() {
        const uploadArea = document.getElementById('upload-area');
        const imagePreview = document.getElementById('image-preview');

        uploadArea.style.display = 'none';
        imagePreview.classList.remove('hidden');

        const img = this.state._cropImg;
        const aspect = this.state._cropAspect;

        // Build crop UI
        imagePreview.innerHTML = `
            <div class="crop-container" id="crop-container">
                <canvas id="crop-canvas"></canvas>
            </div>
            <div class="crop-controls" id="crop-controls">
                <input type="range" id="crop-zoom" min="10" max="500" value="100" step="1">
                <span id="crop-zoom-label">100%</span>
            </div>
        `;

        // Wait for layout to be calculated before sizing canvas
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._initCropCanvas(img, aspect, imagePreview);
            });
        });
    },

    /**
     * Initialize crop canvas after layout is ready
     */
    _initCropCanvas(img, aspect, imagePreview) {
        const canvas = document.getElementById('crop-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const zoomSlider = document.getElementById('crop-zoom');
        const zoomLabel = document.getElementById('crop-zoom-label');

        // Size the canvas to fit the preview area
        const previewRect = imagePreview.getBoundingClientRect();
        const pw = previewRect.width || 500;
        const ph = previewRect.height || 400;
        let cw, ch;
        if (pw / ph > aspect) {
            ch = ph * 0.85;
            cw = ch * aspect;
        } else {
            cw = pw * 0.95;
            ch = cw / aspect;
        }
        canvas.width = Math.round(cw);
        canvas.height = Math.round(ch);
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';

        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const imgAspect = nw / nh;

        // Base scale: when zoom=100%, the image fills the crop area (cover mode)
        let baseScale;
        if (imgAspect > aspect) {
            baseScale = canvas.height / nh;
        } else {
            baseScale = canvas.width / nw;
        }

        let scale = baseScale;
        let offsetX = 0;
        let offsetY = 0;
        let dragging = false;
        let dragStartX, dragStartY, dragOffsetX, dragOffsetY;

        const clampOffset = () => {
            const drawW = nw * scale;
            const drawH = nh * scale;
            const maxOX = Math.max(0, (drawW - canvas.width) / 2);
            const maxOY = Math.max(0, (drawH - canvas.height) / 2);
            offsetX = Math.max(-maxOX, Math.min(maxOX, offsetX));
            offsetY = Math.max(-maxOY, Math.min(maxOY, offsetY));
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const drawW = nw * scale;
            const drawH = nh * scale;
            const dx = (canvas.width - drawW) / 2 + offsetX;
            const dy = (canvas.height - drawH) / 2 + offsetY;
            ctx.drawImage(img, dx, dy, drawW, drawH);
        };

        // Initial draw
        draw();

        // Zoom slider
        zoomSlider.addEventListener('input', (e) => {
            const pct = parseInt(e.target.value);
            scale = baseScale * (pct / 100);
            zoomLabel.textContent = pct + '%';
            clampOffset();
            draw();
            this.updateCropResult();
        });

        // Mouse drag
        canvas.addEventListener('mousedown', (e) => {
            dragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragOffsetX = offsetX;
            dragOffsetY = offsetY;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            offsetX = dragOffsetX + (e.clientX - dragStartX);
            offsetY = dragOffsetY + (e.clientY - dragStartY);
            clampOffset();
            draw();
        });
        window.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                canvas.style.cursor = 'grab';
                this.updateCropResult();
            }
        });

        // Touch drag
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                dragging = true;
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                dragOffsetX = offsetX;
                dragOffsetY = offsetY;
                e.preventDefault();
            }
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            if (!dragging || e.touches.length !== 1) return;
            offsetX = dragOffsetX + (e.touches[0].clientX - dragStartX);
            offsetY = dragOffsetY + (e.touches[0].clientY - dragStartY);
            clampOffset();
            draw();
            e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('touchend', () => {
            if (dragging) {
                dragging = false;
                this.updateCropResult();
            }
        });

        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            let pct = parseInt(zoomSlider.value);
            pct += e.deltaY < 0 ? 10 : -10;
            pct = Math.max(10, Math.min(500, pct));
            zoomSlider.value = pct;
            scale = baseScale * (pct / 100);
            zoomLabel.textContent = pct + '%';
            clampOffset();
            draw();
            this.updateCropResult();
        }, { passive: false });

        canvas.style.cursor = 'grab';

        // Store references for crop extraction
        this.state._cropCanvas = canvas;
        this.state._cropBaseScale = baseScale;
        this.state._cropGetParams = () => ({ scale, offsetX, offsetY, baseScale, nw, nh, canvas });

        // Initial crop result
        this.updateCropResult();
    },

    /**
     * Extract cropped image data from current pan/zoom state
     */
    updateCropResult() {
        const { scale, offsetX, offsetY, baseScale, nw, nh, canvas } = this.state._cropGetParams();
        const img = this.state._cropImg;
        const gridW = this.state._cropGridW;
        const gridH = this.state._cropGridH;

        // Calculate source rect in image coordinates
        const drawW = nw * scale;
        const drawH = nh * scale;
        const dx = (canvas.width - drawW) / 2 + offsetX;
        const dy = (canvas.height - drawH) / 2 + offsetY;

        // Visible area in image coordinates
        const sx = Math.max(0, -dx / scale);
        const sy = Math.max(0, -dy / scale);
        const visibleW = Math.min(nw - sx, canvas.width / scale);
        const visibleH = Math.min(nh - sy, canvas.height / scale);

        // Crop the visible portion
        const sw = canvas.width / scale;
        const sh = canvas.height / scale;
        const cropSx = ((-dx) / scale);
        const cropSy = ((-dy) / scale);

        // High-res cropped
        const highCanvas = document.createElement('canvas');
        highCanvas.width = Math.round(sw);
        highCanvas.height = Math.round(sh);
        const hctx = highCanvas.getContext('2d');
        hctx.drawImage(img, cropSx, cropSy, sw, sh, 0, 0, sw, sh);
        const highResData = highCanvas.toDataURL('image/png');

        // Grid-sized for processing
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = gridW;
        gridCanvas.height = gridH;
        const gctx = gridCanvas.getContext('2d');
        gctx.drawImage(img, cropSx, cropSy, sw, sh, 0, 0, gridW, gridH);
        const gridData = gridCanvas.toDataURL('image/png');

        this.state.uploadedImage = gridData;
        this.state.uploadedImagePreview = highResData;
    },

    /**
     * Display image preview
     */
    displayImagePreview(imageData) {
        const uploadArea = document.getElementById('upload-area');
        const imagePreview = document.getElementById('image-preview');

        uploadArea.style.display = 'none';
        imagePreview.classList.remove('hidden');
        imagePreview.innerHTML = `<img src="${imageData}" alt="Preview">`;
        // Clear file input so selecting the same file again will trigger change
        const imgInput = document.getElementById('image-input');
        if (imgInput) imgInput.value = '';
    },

    /**
     * Enable next button
     */
    enableNextButton() {
        const nextBtn = document.getElementById('btn-step2-next');
        nextBtn.disabled = false;
    },

    /**
     * Go to specific step
     */
    goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.step').forEach(s => {
            s.classList.add('hidden');
        });

        // Show specific step
        const stepElement = document.getElementById(`step-${step}`);
        if (stepElement) {
            stepElement.classList.remove('hidden');
        }

        this.state.currentStep = step;
    },

    /**
     * Next step
     */
    nextStep() {
        switch (this.state.currentStep) {
            case 1:
                this.goToStep(2);
                break;
            case 2:
                if (this.state.uploadedImage) {
                    this.goToStep(3);
                    this.processImage();
                }
                break;
            case 3:
                // Processing is done, move to painting
                setTimeout(() => {
                    this.goToStep(4);
                    this.initializePainting();
                }, 1500);
                break;
        }
    },

    /**
     * Process image (convert to pixel art)
     */
    processImage() {
        // Simulate processing with timeout
        // In real app, this would process the image
        setTimeout(() => {
            this.nextStep();
        }, 2000);
    },

    /**
     * Initialize painting interface
     */
    initializePainting() {
        // Initialize canvas
        if (window.canvas) {
            window.canvas.initialize(
                this.state.selectedRatio,
                this.state.selectedLevel,
                this.state.uploadedImage
            );
        }

        // Initialize color panel
        if (window.colorPanel) {
            window.colorPanel.initialize(this.state.colors);
        }

        // Initialize tools
        if (window.tools) {
            window.tools.initialize();
        }
    },

    /**
     * Reset application state
     */
    resetState() {
        this.state = {
            currentStep: 1,
            selectedRatio: '16:9',
            selectedLevel: 0,
            uploadedImage: null,
            pixelArt: null,
            colors: this.state.colors,
            currentColorGroup: 1,
            currentColor: '#051616'
        };

        // Reset UI
        document.getElementById('upload-area').style.display = 'flex';
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('btn-step2-next').disabled = true;

        // Reset size selection
        document.querySelectorAll('.size-item').forEach(item => {
            item.setAttribute('data-selected', item.getAttribute('data-ratio') === '16:9' ? 'true' : 'false');
        });

        // Reset level selection
        document.querySelectorAll('.level-item').forEach(item => {
            item.setAttribute('data-selected', item.getAttribute('data-level') === '0' ? 'true' : 'false');
        });

        this.updateGridDisplay();
        // Clear file input to allow re-uploading same file
        const imgInput = document.getElementById('image-input');
        if (imgInput) imgInput.value = '';
    },

    /**
     * Show a simple modal popup with WeChat QR image
     */
    showWeChatPopup() {
        // Remove existing if present
        const existing = document.getElementById('wechat-popup');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'wechat-popup';
        Object.assign(modal.style, {
            position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 99999
        });

        const panel = document.createElement('div');
        Object.assign(panel.style, { position: 'relative', background: '#fff', padding: '12px', borderRadius: '8px', maxWidth: '90%', maxHeight: '90%', boxSizing: 'border-box' });

        const img = document.createElement('img');
        img.src = 'assets/images/wechat_pay.jpg';
        img.alt = 'WeChat Pay QR';
        Object.assign(img.style, { maxWidth: '400px', width: '100%', height: 'auto', display: 'block', borderRadius: '4px' });

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = 'Close';
        btn.className = 'btn-close';

        const closeImg = document.createElement('img');
        closeImg.src = 'assets/images/icon_btn_close.svg';
        closeImg.alt = 'Close';
       
        btn.appendChild(closeImg);
        btn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        panel.appendChild(img);
        panel.appendChild(btn);
        modal.appendChild(panel);
        document.body.appendChild(modal);
    }
};

// Fix --scale for browsers that can't do unitless division in CSS (e.g. Firefox)
function fixCssScale() {
    const root = document.documentElement;
    const test = getComputedStyle(root).getPropertyValue('--scale').trim();
    // If --scale is not a plain number, compute it via JS
    if (!test || isNaN(parseFloat(test))) {
        const update = () => {
            const cw = Math.min(window.innerWidth, window.innerHeight * 1920 / 1080);
            root.style.setProperty('--scale', cw / 1920);
        };
        update();
        window.addEventListener('resize', update);
    }
}
fixCssScale();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for color loader to be ready
    if (typeof colorLoader !== 'undefined') {
        app.init();
    } else {
        console.error('Color loader not loaded');
    }
});

const gameIdElement = document.querySelector('#game-id');
gameIdElement.addEventListener('click', function() {
    const text = this.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = this.textContent;
        this.textContent = $(".copied_text").html();
        setTimeout(() => {
            this.textContent = originalText;
        }, 1500);
    });
});
gameIdElement.style.cursor = 'pointer';
gameIdElement.title = '點擊複製遊戲ID';

$("div").click(function(e){
    
});
