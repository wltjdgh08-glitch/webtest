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
canvas.height = window.innerHeight;

// Drawing function
const draw = (e) => {
    if (!isDrawing) return;

    ctx.lineWidth = lineWidthInput.value;
    ctx.lineCap = 'round';
    ctx.strokeStyle = strokeColorInput.value;

    // Handle both mouse and touch events
    let clientX, clientY;
    if(e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        // Prevent scrolling on touch
        e.preventDefault(); 
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    ctx.lineTo(clientX - canvas.offsetLeft, clientY - canvas.offsetTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - canvas.offsetLeft, clientY - canvas.offsetTop);
}

// Event Listeners
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    draw(e); // Allow dots
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    ctx.beginPath(); // Reset path so next line doesn't connect
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
    ctx.beginPath();
});

canvas.addEventListener('mousemove', draw);

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
    canvas.height = window.innerHeight;
    // ctx.putImageData(imageData, 0, 0); // Restore content if simple crop
});
