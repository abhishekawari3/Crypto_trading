import express from "express";
import cors from "cors";
import helemet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from"express-rate-limit";

import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(helemt());
app.use(cookieParser());

app.use(rateLimit({
    windowMs: 15*60*1000,
    max: 100
}));

app.get("/", (req,res)=>{
    res.json({
        message:"Paper Trade API"
    });
});

module.exports = app;

