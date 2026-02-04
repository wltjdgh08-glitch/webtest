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
let startX = 0;
let startY = 0;

// Canvas setup
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Re-context setup after resize might be needed if we want to redraw, 
    // but for a simple whiteboard, resizing usually clears content. 
    // To preserve content, we'd need to save it to an image/buffer and restore.
    // For this MVP, let's accept that resize clears canvas or just init once.
}

// Initial setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 1.5; // Start slightly larger

// Drawing function
const draw = (e) => {
    if (!isDrawing) return;

    ctx.lineWidth = lineWidthInput.value;
    ctx.lineCap = 'round';
    ctx.strokeStyle = strokeColorInput.value;

    let clientX, clientY;

    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        // e.preventDefault(); // Optional: prevent scrolling while drawing
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    // Get exact canvas position and scale
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Calculate correct X/Y relative to canvas bitmap
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Event Listeners
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    ctx.beginPath(); // Start new path
    draw(e); // Allow dots
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    ctx.beginPath();
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
    ctx.beginPath();
});

canvas.addEventListener('mousemove', draw);

// Infinite Scroll Logic
window.addEventListener('scroll', () => {
    // Check if near bottom (within 200px)
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        expandCanvas();
    }
});

function expandCanvas() {
    // Save current content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Increase height by 1000px
    canvas.height += 1000;

    // Restore content
    ctx.putImageData(imageData, 0, 0);

    // Restore context settings (they reset on resize)
    ctx.lineWidth = lineWidthInput.value;
    ctx.lineCap = 'round';
    ctx.strokeStyle = strokeColorInput.value;
}

// Touch support
canvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    draw(e);
});
canvas.addEventListener('touchend', () => {
    isDrawing = false;
    ctx.beginPath();
});
canvas.addEventListener('touchmove', draw);


// Tools logic
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

saveBtn.addEventListener('click', () => {
    // Create a temporary link to download
    const link = document.createElement('a');
    link.download = `my-drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
});

// Window resize handling
window.addEventListener('resize', () => {
    // Optional: Prompt user? or just resize? 
    // Resizing clears the canvas in default HTML5 canvas behavior.
    // Simple approach: set new dimensions.
    // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    // ctx.putImageData(imageData, 0, 0); // Restore content if simple crop
});

// Color Palette Logic
const colorBtns = document.querySelectorAll('.color-btn');

colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        colorBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked
        btn.classList.add('active');

        // Update color
        const color = btn.getAttribute('data-color');
        ctx.strokeStyle = color;
        strokeColorInput.value = color; // Sync color picker
    });
});

// Sync color picker change to highlight custom or deselect palette
strokeColorInput.addEventListener('input', (e) => {
    ctx.strokeStyle = e.target.value;
    colorBtns.forEach(b => b.classList.remove('active'));
});
