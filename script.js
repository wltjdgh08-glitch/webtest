const canvas = document.getElementById('drawing-board');
const toolbar = document.getElementById('toolbar');
const ctx = canvas.getContext('2d');

// Toolbar inputs
const strokeColorInput = document.getElementById('stroke');
const lineWidthInput = document.getElementById('lineWidth');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');

// State
let isDrawing = false;

// Offscreen canvas for per-stroke rendering (to fix blend inconsistency)
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');

// Blending state
let isBlending = false;
let snapshotData = null; // snapshot of canvas before stroke starts (for live preview)

// Canvas setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 1.5;
offscreen.width = canvas.width;
offscreen.height = canvas.height;

// --- Helper: Get canvas coordinates from event ---
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// --- Drawing Logic ---
// In blend mode: draw on offscreen canvas, composite to main on stroke end
// In normal mode: draw directly on main canvas

function startStroke(e) {
    isDrawing = true;
    const pos = getCanvasPos(e);

    if (isBlending) {
        // Save snapshot of current canvas so we can restore for live preview
        snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Clear offscreen canvas for fresh stroke
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.lineWidth = lineWidthInput.value;
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';
        offCtx.strokeStyle = strokeColorInput.value;
        offCtx.globalCompositeOperation = 'source-over';
        offCtx.globalAlpha = 1.0;
        offCtx.beginPath();
        offCtx.moveTo(pos.x, pos.y);
    } else {
        ctx.lineWidth = lineWidthInput.value;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColorInput.value;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }
}

function continueStroke(e) {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);

    if (isBlending) {
        // Draw on offscreen canvas
        offCtx.lineTo(pos.x, pos.y);
        offCtx.stroke();
        offCtx.beginPath();
        offCtx.moveTo(pos.x, pos.y);

        // Live preview: restore snapshot, then composite offscreen on top
        if (snapshotData) {
            ctx.putImageData(snapshotData, 0, 0);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.55; // Lower = darker mixing
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();
    } else {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }
}

function endStroke() {
    if (!isDrawing) return;
    isDrawing = false;

    if (isBlending) {
        // Final commit: restore snapshot and composite stroke cleanly
        if (snapshotData) {
            ctx.putImageData(snapshotData, 0, 0);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.55; // Lower = darker mixing
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        snapshotData = null;
    }

    ctx.beginPath();
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    startStroke(e);
});
canvas.addEventListener('mousemove', (e) => {
    continueStroke(e);
});
canvas.addEventListener('mouseup', endStroke);
canvas.addEventListener('mouseout', endStroke);

// Touch events
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startStroke(e);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    continueStroke(e);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    endStroke();
}, { passive: false });

// Blend Mode Toggle
const blendBtn = document.getElementById('blendBtn');
if (blendBtn) {
    blendBtn.addEventListener('click', () => {
        isBlending = !isBlending;
        blendBtn.classList.toggle('active');
    });
}

// Infinite Scroll Logic
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        expandCanvas();
    }
});

function expandCanvas() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.height += 1000;
    offscreen.height = canvas.height;
    ctx.putImageData(imageData, 0, 0);
    ctx.lineWidth = lineWidthInput.value;
    ctx.lineCap = 'round';
    ctx.strokeStyle = strokeColorInput.value;
}

// Zoom Logic
let currentScale = 1;
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');

function updateZoom() {
    canvas.style.transform = `scale(${currentScale})`;
    canvas.style.transformOrigin = 'top left';
}

zoomInBtn.addEventListener('click', () => {
    currentScale = Math.min(currentScale + 0.1, 3.0);
    updateZoom();
});

zoomOutBtn.addEventListener('click', () => {
    if (currentScale > 0.3) {
        currentScale -= 0.1;
        updateZoom();
    }
});

// Tools
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
});

saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `my-drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
});

// Window resize handling
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    offscreen.width = canvas.width;
});

// Color Palette Logic
const colorBtns = document.querySelectorAll('.color-btn');
colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.getAttribute('data-color');
        strokeColorInput.value = color;
    });
});

strokeColorInput.addEventListener('input', (e) => {
    colorBtns.forEach(b => b.classList.remove('active'));
});
