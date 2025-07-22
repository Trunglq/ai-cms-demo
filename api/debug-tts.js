module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const debugResults = {
        timestamp: new Date().toISOString(),
        environment: 'Vercel Production',
        nodeVersion: process.version,
        tests: []
    };

    // Test 1: Environment Variable Check
    const envTest = {
        name: 'Environment Variable Check',
        status: 'unknown',
        details: {}
    };

    const hasGoogleKey = !!process.env.GOOGLE_CLOUD_KEY_JSON;
    envTest.details.hasGoogleCredentials = hasGoogleKey;
    
    if (hasGoogleKey) {
        envTest.details.credentialsLength = process.env.GOOGLE_CLOUD_KEY_JSON.length;
        envTest.details.preview = process.env.GOOGLE_CLOUD_KEY_JSON.substring(0, 150) + '...';
        envTest.status = 'pass';
    } else {
        envTest.status = 'fail';
        envTest.details.availableEnvVars = Object.keys(process.env).filter(key => 
            key.includes('GOOGLE') || key.includes('GCP') || key.includes('CLOUD')
        );
    }
    
    debugResults.tests.push(envTest);

    // Test 2: JSON Parse
    const jsonTest = {
        name: 'JSON Parsing Test',
        status: 'skip',
        details: {}
    };

    if (hasGoogleKey) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON);
            jsonTest.status = 'pass';
            jsonTest.details = {
                hasProjectId: !!credentials.project_id,
                hasClientEmail: !!credentials.client_email,
                hasPrivateKey: !!credentials.private_key,
                type: credentials.type,
                projectId: credentials.project_id,
                clientEmail: credentials.client_email
            };
        } catch (error) {
            jsonTest.status = 'fail';
            jsonTest.details.error = error.message;
            jsonTest.details.jsonStart = process.env.GOOGLE_CLOUD_KEY_JSON.substring(0, 50);
        }
    }
    
    debugResults.tests.push(jsonTest);

    // Test 3: TTS Client Initialization
    const clientTest = {
        name: 'TTS Client Initialization',
        status: 'skip',
        details: {}
    };

    if (hasGoogleKey && jsonTest.status === 'pass') {
        try {
            const textToSpeech = require('@google-cloud/text-to-speech');
            const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON);
            
            const client = new textToSpeech.TextToSpeechClient({
                projectId: credentials.project_id,
                credentials: credentials
            });
            
            clientTest.status = 'pass';
            clientTest.details.message = 'TTS Client initialized successfully';
        } catch (error) {
            clientTest.status = 'fail';
            clientTest.details.error = error.message;
            clientTest.details.stack = error.stack;
        }
    }
    
    debugResults.tests.push(clientTest);

    // Test 4: API Call Test (only if client initialized)
    const apiTest = {
        name: 'TTS API Call Test',
        status: 'skip',
        details: {}
    };

    if (clientTest.status === 'pass') {
        try {
            const textToSpeech = require('@google-cloud/text-to-speech');
            const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON);
            
            const client = new textToSpeech.TextToSpeechClient({
                projectId: credentials.project_id,
                credentials: credentials
            });

            const request = {
                input: { text: 'Test API call' },
                voice: { languageCode: 'vi-VN', name: 'vi-VN-Standard-A' },
                audioConfig: { audioEncoding: 'MP3' }
            };

            // Quick timeout test
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('API call timeout')), 10000)
            );

            const apiCallPromise = client.synthesizeSpeech(request);
            
            await Promise.race([apiCallPromise, timeoutPromise]);
            
            apiTest.status = 'pass';
            apiTest.details.message = '🎉 TTS API CALL SUCCESSFUL - REAL AUDIO MODE ACTIVE!';
            
        } catch (error) {
            apiTest.status = 'fail';
            apiTest.details.error = error.message;
            apiTest.details.errorCode = error.code;
            
            // Common error explanations
            if (error.code === 3) {
                apiTest.details.explanation = 'INVALID_ARGUMENT - Check voice settings or text content';
            } else if (error.code === 7) {
                apiTest.details.explanation = 'PERMISSION_DENIED - Service account lacks TTS permissions';
            } else if (error.code === 8) {
                apiTest.details.explanation = 'RESOURCE_EXHAUSTED - TTS quota exceeded';
            } else if (error.code === 14) {
                apiTest.details.explanation = 'UNAVAILABLE - Google Cloud TTS service temporarily down';
            }
        }
    }
    
    debugResults.tests.push(apiTest);

    // Summary
    const passCount = debugResults.tests.filter(t => t.status === 'pass').length;
    const failCount = debugResults.tests.filter(t => t.status === 'fail').length;
    const skipCount = debugResults.tests.filter(t => t.status === 'skip').length;

    debugResults.summary = {
        totalTests: debugResults.tests.length,
        passed: passCount,
        failed: failCount,
        skipped: skipCount,
        overallStatus: failCount === 0 && passCount > 0 ? 'WORKING' : 'NEEDS_FIX',
        recommendation: generateRecommendation(debugResults.tests)
    };

    return res.json(debugResults);
};

function generateRecommendation(tests) {
    const envTest = tests[0];
    const jsonTest = tests[1];
    const clientTest = tests[2];
    const apiTest = tests[3];

    if (!envTest.details.hasGoogleCredentials) {
        return {
            issue: 'Missing GOOGLE_CLOUD_KEY_JSON environment variable',
            solution: 'Add GOOGLE_CLOUD_KEY_JSON to Vercel Environment Variables with your service account JSON',
            priority: 'HIGH'
        };
    }

    if (jsonTest.status === 'fail') {
        return {
            issue: 'Invalid JSON format in GOOGLE_CLOUD_KEY_JSON',
            solution: 'Ensure the JSON is properly formatted and on a single line. Consider base64 encoding.',
            priority: 'HIGH'
        };
    }

    if (clientTest.status === 'fail') {
        return {
            issue: 'TTS Client initialization failed',
            solution: 'Check if @google-cloud/text-to-speech package is installed and credentials are valid',
            priority: 'HIGH'
        };
    }

    if (apiTest.status === 'fail') {
        return {
            issue: 'TTS API call failed',
            solution: 'Check Google Cloud project settings, API enablement, and service account permissions',
            priority: 'MEDIUM'
        };
    }

    return {
        issue: 'No issues detected',
        solution: 'TTS should be working in real mode!',
        priority: 'LOW'
    };
} 