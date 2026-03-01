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
let currentTool = 'pen'; // 'pen' or 'fill'

// Offscreen canvas for per-stroke rendering (to fix blend inconsistency)
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');

// Blending state
let isBlending = true; // Default to true for the new mode
let snapshotData = null; // snapshot of canvas before stroke starts (for live preview)

// Canvas setup
// We'll set a background color to the canvas initially since multiply needs a base
function initCanvasBackground() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 1.5;
initCanvasBackground();
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
        // SUBTRACTIVE MIXING: use multiply
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.55;
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
        // SUBTRACTIVE MIXING: use multiply
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.55;
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        snapshotData = null;
    }

    ctx.beginPath();
}

// --- Flood Fill Algorithm ---
function floodFill(startX, startY, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const targetPos = (Math.round(startY) * width + Math.round(startX)) * 4;
    const targetR = data[targetPos];
    const targetG = data[targetPos + 1];
    const targetB = data[targetPos + 2];
    const targetA = data[targetPos + 3];

    // Convert hex color to RGBA
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = fillColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const fillPixel = tempCtx.getImageData(0, 0, 1, 1).data;
    const [fillR, fillG, fillB, fillA] = fillPixel;

    // If target color is same as fill color, return
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const stack = [[Math.round(startX), Math.round(startY)]];

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const pos = (y * width + x) * 4;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        if (data[pos] === targetR && data[pos + 1] === targetG &&
            data[pos + 2] === targetB && data[pos + 3] === targetA) {

            data[pos] = fillR;
            data[pos + 1] = fillG;
            data[pos + 2] = fillB;
            data[pos + 3] = fillA;

            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    if (currentTool === 'pen') {
        startStroke(e);
    } else if (currentTool === 'fill') {
        const pos = getCanvasPos(e);
        floodFill(pos.x, pos.y, strokeColorInput.value);
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (currentTool === 'pen') {
        continueStroke(e);
    }
});
canvas.addEventListener('mouseup', () => {
    if (currentTool === 'pen') endStroke();
});
canvas.addEventListener('mouseout', () => {
    if (currentTool === 'pen') endStroke();
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentTool === 'pen') {
        startStroke(e);
    } else if (currentTool === 'fill') {
        const pos = getCanvasPos(e);
        floodFill(pos.x, pos.y, strokeColorInput.value);
    }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (currentTool === 'pen') {
        continueStroke(e);
    }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (currentTool === 'pen') endStroke();
}, { passive: false });

// Tool Switching Logic
const penToolBtn = document.getElementById('penTool');
const fillToolBtn = document.getElementById('fillTool');

if (penToolBtn && fillToolBtn) {
    penToolBtn.addEventListener('click', () => {
        currentTool = 'pen';
        penToolBtn.classList.add('active');
        fillToolBtn.classList.remove('active');
        canvas.style.cursor = 'crosshair';
    });

    fillToolBtn.addEventListener('click', () => {
        currentTool = 'fill';
        fillToolBtn.classList.add('active');
        penToolBtn.classList.remove('active');
        canvas.style.cursor = 'copy'; // Cursor for bucket
    });
}

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
    // Transparent background for new area would break multiply, so we fill it with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    initCanvasBackground();
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
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    offscreen.width = canvas.width;
    initCanvasBackground();
    ctx.putImageData(imageData, 0, 0);
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
