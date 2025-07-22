
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let slides = [{}]; // array of drawing data per slide
let currentSlide = 0;

io.on('connection', (socket) => {
    socket.emit('init', { slides, currentSlide });

    socket.on('draw', ({ slideIndex, data }) => {
        slides[slideIndex] = slides[slideIndex] || {};
        slides[slideIndex][data.id] = data;
        socket.broadcast.emit('draw', { slideIndex, data });
    });

    socket.on('clear', (slideIndex) => {
        slides[slideIndex] = {};
        io.emit('clear', slideIndex);
    });

    socket.on('undo', ({ slideIndex, id }) => {
        if (slides[slideIndex]) {
            delete slides[slideIndex][id];
            io.emit('undo', { slideIndex, id });
        }
    });

    socket.on('changeSlide', (index) => {
        currentSlide = index;
        io.emit('changeSlide', index);
    });

    socket.on('addSlide', () => {
        slides.push({});
        io.emit('addSlide', slides.length - 1);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
