
const socket = io();
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
let drawing = false;
let paths = [];
let currentPath = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    currentPath = [{ x: e.clientX, y: e.clientY }];
});
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const point = { x: e.clientX, y: e.clientY };
    currentPath.push(point);
    drawLine(currentPath[currentPath.length - 2], point, 'black', 2);
    socket.emit('drawing', { from: currentPath[currentPath.length - 2], to: point });
});
canvas.addEventListener('mouseup', () => {
    if (drawing) {
        drawing = false;
        paths.push(currentPath);
        currentPath = [];
    }
});

function drawLine(from, to, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths = [];
    socket.emit('clear');
}

function undo() {
    paths.pop();
    redraw();
    socket.emit('undo');
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const path of paths) {
        for (let i = 1; i < path.length; i++) {
            drawLine(path[i - 1], path[i], 'black', 2);
        }
    }
}

socket.on('drawing', (data) => {
    drawLine(data.from, data.to, 'black', 2);
});
socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths = [];
});
socket.on('undo', () => {
    paths.pop();
    redraw();
});
