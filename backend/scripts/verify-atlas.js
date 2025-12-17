import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyConnection = async () => {
    console.log('🔍 Testing connection to MongoDB Atlas...');
    console.log(`📡 URI: ${process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`); // Hide password in logs

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully to MongoDB Atlas!');

        // Create a test collection and insert a document
        const TestSchema = new mongoose.Schema({ name: String, date: Date });
        const TestModel = mongoose.model('AtlasVerification', TestSchema);

        console.log('📝 Attempting to write test data...');
        const doc = await TestModel.create({ 
            name: 'Atlas Connection Verified', 
            date: new Date() 
        });
        console.log('✅ Successfully wrote data to Atlas:', doc);

        console.log('🧹 Cleaning up test data...');
        await TestModel.deleteOne({ _id: doc._id });
        console.log('✅ Cleanup complete.');

        console.log('\n🎉 SUCCESS: Your project is correctly configured to use MongoDB Atlas.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ CONNECTION FAILED');
        console.error('Error details:', error.message);
        
        if (error.message.includes('bad auth')) {
            console.error('👉 CAUSE: Incorrect Username or Password.');
            console.error('👉 FIX: Check your .env file and ensure the password is correct (no < > brackets).');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('👉 CAUSE: Network issue or IP whitelist.');
            console.error('👉 FIX: Go to Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0).');
        }
        
        process.exit(1);
    }
};

verifyConnection();
