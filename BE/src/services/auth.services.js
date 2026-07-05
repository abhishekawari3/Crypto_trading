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

const parseExpiryToDate = (expiresIn) => {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    const now = new Date();
    if(!match) return new Date(now.getTime() +  7 * 24 * 60 * 60 * 1000); 

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return new Date(nopw.getTime() + value * multiplier[unit]); 
};

const issueTokenPair = async (user) => {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = parseExpiryToDate(process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt,
        },
    });

    return{ accessToken, refreshToken };
};

const register = async ({ email, password }) => {
    const existing = await prisma.user.findunique({where: { email }});
    if(existing){
        throw new AppError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            virtualBalance: INITIAL_BALANCE,
            intialBalance: INITIAL_BALANCE,
        },
    });

    const tokens = await issueTokenPair(user);

    return {
        user: sanitizeUser(user),
        ...tokens,
    };
};

const login = async ({email, password}) =>{
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user) {
        throw new AppError('Invalid username or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if(!isMatch){
        throw new AppError('Invalid username or password', 401);
    }

    const tokens = await issueTokenPair(user);
    return { 
        user: santizeUser(user),
        ...tokens,
    };
};

const refresh = async ({ refreshToken }) => {
    const tokenHash = hashToken(refreshToken);

    const record = await prisma.refreshToken.findFirst({
        where: { tokenHash },
        include: { user: true },
    });

    if(!record){
        throw new AppError('Invalid refresh token', 401);
    }

    if(record.expiresAt < new Date()) {
        await prisma.refreshToken.delete({where: {id: record.id }, }).catch(() => {});
        throw new AppError('Refresh token expired. Please log in again.', 401); 
    }

    await prisma.refreshToken.delete({where: {id: record.id }});
    const tokens = await issueTokenPair(record.user);

    return {
        user: santizeUser(record.user),
        ...tokens,
    };
};

const logout = async ({ refreshToken }) =>{
    const tokenHash = hashToken(refreshToken);
    await prisma.deleteMany( {where: {
        tokenHash,
    } });

    return {message: 'Logged out successfully'};
}

const santizeUser = (user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        virtualBalance: user.virtualBalance,
        initailBalance: user.initialBalance,
        createdAt: user.createdAt,
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    hashToken,
};
