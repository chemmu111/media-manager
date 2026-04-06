import mongoose from 'mongoose';

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection lost. Requests will be rejected until reconnected.');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

export async function connectDB(retries = 10) {
    const options = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        connectTimeoutMS: 15000,
        maxPoolSize: 10,
    };

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing in .env');
        }

        let uri = process.env.MONGODB_URI;
        if (!uri.includes('retryWrites')) {
            uri += (uri.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
        }

        await mongoose.connect(uri, options);
    } catch (error) {
        let errorMessage = error.message;

        if (errorMessage.includes('SSL alert number 80') || errorMessage.includes('IP address is not whitelisted')) {
            errorMessage = "IP Whitelist Error: Your current IP is likely NOT whitelisted in MongoDB Atlas. " +
                           "Please go to Atlas -> Network Access -> Add IP Address.";
        }

        console.error(`❌ MongoDB connection failed (Remaining attempts: ${retries}):`, errorMessage);

        if (retries > 0) {
            const delay = 5000;
            console.log(`🔄 Retrying in ${delay / 1000}s...`);
            setTimeout(() => connectDB(retries - 1), delay);
        } else {
            console.error('🚨 Maximum reconnection attempts reached. Critical failure.');
            console.log('💡 PRO TIP: If you see "Impaired Cluster", check AWS region health (us-east-1) at health.aws.amazon.com.');
        }
    }
}
