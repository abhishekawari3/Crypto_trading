import http from 'http';
import app from './app.js';
import{ Server } from "socket.io";

const server = http.createServer(app);

const io = new Server(server,{
    corss: {
        origin:"*"
    }
});

app.set("io, io");

io.on("connection", (socket) =>{
    console.log("Client connected", socket.id);

    socket.on("disconnect", ()=>{
        console.log("Client disconnected");
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`)
});