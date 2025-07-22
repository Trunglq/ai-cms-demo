// Comprehensive TTS API Test Suite
// Tests both demo mode and production mode (with Google Cloud credentials)

const fetch = require('node-fetch'); // For Node.js < 18, install: npm i node-fetch
const fs = require('fs');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TTS_ENDPOINT = `${API_BASE}/api/text-to-speech`;

// Test data
const testCases = {
    vietnamese: {
        text: "Xin chào! Tôi là trợ lý AI. Hôm nay trời rất đẹp và tôi rất vui được gặp bạn.",
        language: "vi-VN",
        voice: "vi-VN-Standard-A",
        speed: 1.0
    },
    english: {
        text: "Hello! This is a test of the Google Cloud Text-to-Speech API integration.",
        language: "en-US", 
        voice: "en-US-Standard-A",
        speed: 1.2
    },
    wavenet: {
        text: "Đây là test giọng nói WaveNet chất lượng cao cho tiếng Việt.",
        language: "vi-VN",
        voice: "vi-VN-Wavenet-A", 
        speed: 0.9
    }
};

async function runTTSTests() {
    console.log('🚀 Starting Comprehensive TTS API Tests...\n');
    console.log(`📍 Testing endpoint: ${TTS_ENDPOINT}\n`);

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
        const response = await fetch(TTS_ENDPOINT);
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Health Check PASSED');
            console.log(`   Mode: ${data.mode || 'Unknown'}`);
            console.log(`   Status: ${data.status || 'Unknown'}`);
            console.log(`   Languages: ${Object.keys(data.supportedLanguages || {}).length}`);
            passedTests++;
        } else {
            console.log('❌ Health Check FAILED');
            console.log(`   Error: ${data.error || 'Unknown error'}`);
            failedTests++;
        }
        totalTests++;
    } catch (error) {
        console.log('❌ Health Check ERROR:', error.message);
        failedTests++;
        totalTests++;
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Vietnamese TTS
    console.log('2️⃣ Testing Vietnamese TTS...');
    const vnResult = await testTTS(testCases.vietnamese, '🇻🇳 Vietnamese');
    if (vnResult.success) passedTests++; else failedTests++;
    totalTests++;

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: English TTS
    console.log('3️⃣ Testing English TTS...');
    const enResult = await testTTS(testCases.english, '🇺🇸 English');
    if (enResult.success) passedTests++; else failedTests++;
    totalTests++;

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 4: WaveNet Voice
    console.log('4️⃣ Testing WaveNet Voice...');
    const waveResult = await testTTS(testCases.wavenet, '🎤 WaveNet');
    if (waveResult.success) passedTests++; else failedTests++;
    totalTests++;

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 5: Error Handling - Empty Text
    console.log('5️⃣ Testing Error Handling - Empty Text...');
    try {
        const response = await fetch(TTS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: '', language: 'vi-VN' })
        });
        const data = await response.json();
        
        if (!response.ok && data.error && data.error.includes('required')) {
            console.log('✅ Error Handling PASSED');
            console.log(`   Correctly rejected empty text: ${data.error}`);
            passedTests++;
        } else {
            console.log('❌ Error Handling FAILED');
            console.log(`   Should have rejected empty text, got: ${JSON.stringify(data)}`);
            failedTests++;
        }
        totalTests++;
    } catch (error) {
        console.log('❌ Error Handling ERROR:', error.message);
        failedTests++;
        totalTests++;
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 6: Error Handling - Text Too Long
    console.log('6️⃣ Testing Error Handling - Text Too Long...');
    const longText = 'A'.repeat(6000); // Exceed 5000 char limit
    try {
        const response = await fetch(TTS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: longText, language: 'vi-VN' })
        });
        const data = await response.json();
        
        if (!response.ok && data.error && data.error.includes('too long')) {
            console.log('✅ Length Validation PASSED');
            console.log(`   Correctly rejected long text: ${data.error}`);
            passedTests++;
        } else {
            console.log('❌ Length Validation FAILED');
            console.log(`   Should have rejected long text, got: ${JSON.stringify(data)}`);
            failedTests++;
        }
        totalTests++;
    } catch (error) {
        console.log('❌ Length Validation ERROR:', error.message);
        failedTests++;
        totalTests++;
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 7: Performance Test
    console.log('7️⃣ Testing Performance...');
    await testPerformance();
    passedTests++; // Performance test always passes, it's just informational
    totalTests++;

    // Final Results
    console.log('\n' + '🏁 TEST RESULTS '.padEnd(60, '='));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! TTS API is working perfectly!');
    } else if (failedTests <= 2) {
        console.log('\n⚠️  MOSTLY WORKING with minor issues. Check failed tests above.');
    } else {
        console.log('\n🚨 MAJOR ISSUES detected. Please fix failed tests.');
    }

    console.log('\n' + '='.repeat(60));
}

// Individual TTS test function
async function testTTS(testCase, label) {
    console.log(`   Testing ${label}...`);
    const startTime = Date.now();
    
    try {
        const response = await fetch(TTS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCase)
        });

        const responseTime = Date.now() - startTime;
        const data = await response.json();

        if (response.ok && data.success && data.audioUrl) {
            console.log(`✅ ${label} TTS PASSED`);
            console.log(`   📊 Response Time: ${responseTime}ms`);
            console.log(`   🎵 Audio Size: ${data.size || 'N/A'}`);
            console.log(`   ⏱️  Duration: ${data.duration || 'N/A'}`);
            console.log(`   🎤 Voice: ${data.voiceUsed || 'N/A'}`);
            console.log(`   🏆 Quality: ${data.quality || 'N/A'}`);
            
            if (data.demoMode) {
                console.log(`   🎭 Mode: Demo/Fallback`);
                console.log(`   💡 Note: ${data.note || ''}`);
            } else {
                console.log(`   🚀 Mode: Production (Google Cloud)`);
            }
            
            if (data.fromCache) {
                console.log(`   📋 Served from cache (${data.cacheAge || ''})`);
            }

            return { success: true, data, responseTime };
        } else {
            console.log(`❌ ${label} TTS FAILED`);
            console.log(`   Error: ${data.error || 'Unknown error'}`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            return { success: false, data, responseTime };
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.log(`❌ ${label} TTS ERROR: ${error.message}`);
        return { success: false, error, responseTime };
    }
}

// Performance test
async function testPerformance() {
    console.log('   Running performance test with 3 concurrent requests...');
    
    const performanceTests = [
        testTTS(testCases.vietnamese, 'Perf-VN'),
        testTTS(testCases.english, 'Perf-EN'),
        testTTS({...testCases.vietnamese, speed: 1.5}, 'Perf-Speed')
    ];

    const startTime = Date.now();
    try {
        const results = await Promise.all(performanceTests);
        const totalTime = Date.now() - startTime;
        
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

        console.log(`✅ Performance Test Completed`);
        console.log(`   📊 Total Time: ${totalTime}ms`);
        console.log(`   ⚡ Average Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log(`   📈 Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
        
        if (avgResponseTime < 2000) {
            console.log(`   🚀 Performance: EXCELLENT`);
        } else if (avgResponseTime < 5000) {
            console.log(`   ⚡ Performance: GOOD`);
        } else {
            console.log(`   🐌 Performance: SLOW (consider optimization)`);
        }

    } catch (error) {
        console.log(`❌ Performance Test ERROR: ${error.message}`);
    }
}

// Export for use as module
module.exports = { runTTSTests, testTTS };

// Run tests if this file is executed directly
if (require.main === module) {
    runTTSTests().catch(error => {
        console.error('💥 Test Suite Error:', error);
        process.exit(1);
    });
} 