// Native fetch is used in Node 18+

const BACKEND_URL = 'https://cfa-project-y2hy.onrender.com';

const testDeployment = async () => {
    console.log(`🌍 Testing Remote Backend at: ${BACKEND_URL}`);

    // 1. Test Health/Root
    try {
        console.log('📡 Pinging server...');
        // The root path might not return anything, but let's try a known endpoint or just check connectivity
        // We'll try to register a dummy user to verify DB write

        const testUser = {
            username: `test_cli_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'password123'
        };

        console.log('📝 Attempting to register test user:', testUser.username);

        const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        const data = await res.json();

        if (res.ok) {
            console.log('✅ SUCCESS: User registered successfully!');
            console.log('   - Backend is reachable.');
            console.log('   - Backend connected to MongoDB Atlas.');
            console.log('   - Data was written to Atlas.');
            console.log('   User ID:', data._id);
            console.log('   Token:', data.token ? 'Received (Hidden)' : 'Missing');
        } else {
            console.error('❌ FAILED: Backend returned an error.');
            console.error('   Status:', res.status);
            console.error('   Response:', data);
        }

    } catch (error) {
        console.error('❌ FAILED: Could not connect to Backend.');
        console.error('   Error:', error.message);
        console.error('   Make sure the URL is correct and the server is running.');
    }
};

testDeployment();
