
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const thumbnails = document.getElementById('thumbnails');
const slideIndicator = document.getElementById('slideIndicator');
const socket = io();

canvas.width = window.innerWidth - 140;
canvas.height = window.innerHeight - 60;

let drawing = false;
let currentPath = [];
let slideIndex = 0;
let slides = [{}];

function drawPath(path, color = 'black', width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let point of path) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const slide = slides[slideIndex];
  for (let id in slide) {
    const { path, color, width } = slide[id];
    drawPath(path, color, width);
  }
}

canvas.onmousedown = (e) => {
  drawing = true;
  currentPath = [{ x: e.offsetX, y: e.offsetY }];
};

canvas.onmousemove = (e) => {
  if (!drawing) return;
  currentPath.push({ x: e.offsetX, y: e.offsetY });
  redraw();
  drawPath(currentPath);
};

canvas.onmouseup = () => {
  if (!drawing) return;
  drawing = false;
  const id = Date.now().toString();
  const data = { id, path: currentPath, color: 'black', width: 2 };
  slides[slideIndex][id] = data;
  socket.emit('draw', { slideIndex, data });
  updateThumbnail(slideIndex);
};

function undo() {
  const keys = Object.keys(slides[slideIndex]);
  if (keys.length === 0) return;
  const last = keys[keys.length - 1];
  delete slides[slideIndex][last];
  redraw();
  socket.emit('undo', { slideIndex, id: last });
  updateThumbnail(slideIndex);
}

function clearCanvas() {
  slides[slideIndex] = {};
  redraw();
  socket.emit('clear', slideIndex);
  updateThumbnail(slideIndex);
}

function saveImage() {
  const link = document.createElement('a');
  link.download = `slide${slideIndex + 1}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

function addSlide() {
  slides.push({});
  slideIndex = slides.length - 1;
  updateSlideIndicator();
  renderThumbnails();
  redraw();
  socket.emit('addSlide');
}

function prevSlide() {
  if (slideIndex > 0) {
    slideIndex--;
    updateSlideIndicator();
    redraw();
    socket.emit('changeSlide', slideIndex);
  }
}

function nextSlide() {
  if (slideIndex < slides.length - 1) {
    slideIndex++;
    updateSlideIndicator();
    redraw();
    socket.emit('changeSlide', slideIndex);
  }
}

function updateSlideIndicator() {
  slideIndicator.textContent = `Slide ${slideIndex + 1} di ${slides.length}`;
}

function renderThumbnails() {
  thumbnails.innerHTML = '';
  slides.forEach((_, i) => {
    const thumb = document.createElement('canvas');
    thumb.width = 100;
    thumb.height = 80;
    thumb.className = 'thumb';
    if (i === slideIndex) thumb.classList.add('active');
    drawThumbnail(thumb, slides[i]);
    thumb.onclick = () => {
      slideIndex = i;
      updateSlideIndicator();
      renderThumbnails();
      redraw();
      socket.emit('changeSlide', slideIndex);
    };
    thumbnails.appendChild(thumb);
  });
}

function drawThumbnail(canvas, slide) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let id in slide) {
    const { path, color, width } = slide[id];
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(path[0].x * canvas.width / window.innerWidth, path[0].y * canvas.height / window.innerHeight);
    for (let point of path) {
      ctx.lineTo(point.x * canvas.width / window.innerWidth, point.y * canvas.height / window.innerHeight);
    }
    ctx.stroke();
  }
}

function updateThumbnail(index) {
  const thumb = thumbnails.children[index];
  if (thumb) drawThumbnail(thumb, slides[index]);
}

socket.on('init', ({ slides: s, currentSlide }) => {
  slides = s;
  slideIndex = currentSlide;
  updateSlideIndicator();
  renderThumbnails();
  redraw();
});

socket.on('draw', ({ slideIndex: i, data }) => {
  slides[i] = slides[i] || {};
  slides[i][data.id] = data;
  if (i === slideIndex) {
    drawPath(data.path, data.color, data.width);
    updateThumbnail(i);
  }
});

socket.on('clear', (i) => {
  slides[i] = {};
  if (i === slideIndex) redraw();
  updateThumbnail(i);
});

socket.on('undo', ({ slideIndex: i, id }) => {
  if (slides[i]) delete slides[i][id];
  if (i === slideIndex) redraw();
  updateThumbnail(i);
});

socket.on('changeSlide', (i) => {
  slideIndex = i;
  updateSlideIndicator();
  renderThumbnails();
  redraw();
});

socket.on('addSlide', (i) => {
  slides[i] = {};
  renderThumbnails();
});
