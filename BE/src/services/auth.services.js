const bcrypt = require('bcrypt');
const jwt = require('josnwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/db');
const { AppError } =require('../middleware/error.Middleware');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
const INITIAL_BALANCE = parseFloat(process.env.INITIAL_VIRTUAL_BALANCE) || 10000;

const hashToken = (token =>{
    crypto.createHash('sha256').update(token).digest('hex');
});

const generateAccessToken = (user) =>
    jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

const generateRefreshToken = ()=> crypto.randomBytes(48).toString('hex');

