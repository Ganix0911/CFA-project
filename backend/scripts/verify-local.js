import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyLocalConnection = async () => {
    console.log('🏠 Testing connection to LOCAL MongoDB...');
    console.log(`📡 URI: ${process.env.MONGODB_URI}`);

    if (!process.env.MONGODB_URI.includes('localhost') && !process.env.MONGODB_URI.includes('127.0.0.1')) {
        console.warn('⚠️  WARNING: You are NOT connecting to localhost. Check your .env file.');
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully to LOCAL MongoDB!');

        // Create a test collection and insert a document
        const TestSchema = new mongoose.Schema({ name: String, date: Date });
        const TestModel = mongoose.model('LocalVerification', TestSchema);

        console.log('📝 Attempting to write test data...');
        const doc = await TestModel.create({
            name: 'Local Connection Verified',
            date: new Date()
        });
        console.log('✅ Successfully wrote data to Local DB:', doc);

        console.log('🧹 Cleaning up test data...');
        await TestModel.deleteOne({ _id: doc._id });
        console.log('✅ Cleanup complete.');

        console.log('\n🎉 SUCCESS: Your project is now using the Local Database (Compass).');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ CONNECTION FAILED');
        console.error('Error details:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.error('👉 CAUSE: MongoDB is not running on your computer.');
            console.error('👉 FIX: Start MongoDB Compass and connect, or run `brew services start mongodb-community` if installed via brew.');
        }

        process.exit(1);
    }
};

verifyLocalConnection();
