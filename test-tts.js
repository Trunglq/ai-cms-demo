const https = require('https');

// Test TTS API endpoint
async function testTTSAPI() {
    console.log('🎤 Testing Text-to-Speech API...\n');

    // Test 1: Health check (GET)
    console.log('1. Testing Health Check (GET)...');
    try {
        const response = await makeRequest('GET', '/api/text-to-speech');
        console.log('✅ Health Check Status:', response.status);
        console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Health Check Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: TTS Request (POST) - Should show credentials error
    console.log('2. Testing TTS Request (POST)...');
    const testPayload = {
        text: "Xin chào! Đây là test giọng nói tiếng Việt từ Google Cloud Text-to-Speech API.",
        language: "vi-VN",
        voice: "vi-VN-Standard-A", 
        speed: 1.0
    };

    try {
        const response = await makeRequest('POST', '/api/text-to-speech', testPayload);
        console.log('✅ TTS Request Status:', response.status);
        
        if (response.data.success) {
            console.log('🎉 TTS SUCCESS! Audio generated!');
            console.log('📊 Audio Info:', {
                size: response.data.size,
                duration: response.data.duration,
                voice: response.data.voiceUsed,
                quality: response.data.quality
            });
        } else {
            console.log('⚠️  TTS Error:', response.data.error);
            if (response.data.error.includes('not configured')) {
                console.log('💡 Solution: Need to set up Google Cloud credentials');
            }
        }
    } catch (error) {
        console.log('❌ TTS Request Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Invalid request
    console.log('3. Testing Invalid Request...');
    try {
        const response = await makeRequest('POST', '/api/text-to-speech', { text: '' });
        console.log('📋 Validation Response:', response.data.error || response.data.message);
    } catch (error) {
        console.log('❌ Validation Error:', error.message);
    }
}

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        statusMessage: res.statusMessage,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        statusMessage: res.statusMessage,
                        data: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data && method === 'POST') {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Run tests
if (require.main === module) {
    console.log('🚀 Starting TTS API Tests...\n');
    testTTSAPI().then(() => {
        console.log('🏁 TTS API Tests Completed!');
    }).catch(error => {
        console.error('💥 Test Suite Error:', error);
    });
}

module.exports = { testTTSAPI }; 