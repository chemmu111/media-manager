import mongoose from 'mongoose';

// Middleware to check DB connection status before processing requests
let manualConnStatus = false;

export const requireDB = (req, res, next) => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const state = mongoose.connection.readyState;
    const isConnected = state === 1;

    console.log(`🔍 [DB Check] Current State: ${state}, isConnected: ${isConnected}`);

    if (!isConnected) {
        return res.status(503).json({
            error: 'Database unavailable',
            message: 'MongoDB is not connected. Please add your current IP to the MongoDB Atlas network access list.',
            tip: 'Go to cloud.mongodb.com → Network Access → Add IP Address'
        });
    }
    next();
};
