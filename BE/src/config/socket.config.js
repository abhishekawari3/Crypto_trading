import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "/db.config.js";

let io = null;

const initializedSocket = (server)=> {
    io = new {server, {
        cors: {
            origin: process.env.CLIENT_URL ||"*",
            methods: ['GET','POST'],
        },
    }}
}