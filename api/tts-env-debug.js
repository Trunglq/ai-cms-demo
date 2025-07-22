module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const debug = {
        timestamp: new Date().toISOString(),
        environment: 'Vercel Production Environment Debug v2',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
    };

    // 1. Environment Variables Analysis
    debug.environmentVariables = {
        total: Object.keys(process.env).length,
        googleRelated: [],
        cloudRelated: [],
        ttssRelated: [],
        vercelVariables: [],
        allKeys: []
    };

    // Scan all environment variables
    Object.keys(process.env).forEach(key => {
        debug.environmentVariables.allKeys.push(key);
        
        const keyLower = key.toLowerCase();
        
        if (keyLower.includes('google')) {
            debug.environmentVariables.googleRelated.push({
                key: key,
                hasValue: !!process.env[key],
                length: process.env[key] ? process.env[key].length : 0,
                preview: process.env[key] ? process.env[key].substring(0, 50) + '...' : null
            });
        }
        
        if (keyLower.includes('cloud') || keyLower.includes('gcp')) {
            debug.environmentVariables.cloudRelated.push({
                key: key,
                hasValue: !!process.env[key],
                length: process.env[key] ? process.env[key].length : 0
            });
        }
        
        if (keyLower.includes('tts') || keyLower.includes('speech')) {
            debug.environmentVariables.ttssRelated.push({
                key: key,
                hasValue: !!process.env[key],
                length: process.env[key] ? process.env[key].length : 0
            });
        }

        if (keyLower.includes('vercel')) {
            debug.environmentVariables.vercelVariables.push({
                key: key,
                hasValue: !!process.env[key]
            });
        }
    });

    // 2. Specific Key Checks - UPDATED to include BASE64
    debug.keyChecks = {};
    
    const possibleKeys = [
        'GOOGLE_CLOUD_KEY_JSON',
        'GOOGLE_CLOUD_KEY_BASE64',  // ADDED THIS!
        'GOOGLE_CLOUD_CREDENTIALS',
        'GOOGLE_APPLICATION_CREDENTIALS', 
        'GCP_SERVICE_ACCOUNT_KEY',
        'GOOGLE_SERVICE_ACCOUNT_KEY',
        'GOOGLE_CLOUD_SERVICE_ACCOUNT',
        'TTS_CREDENTIALS',
        'GOOGLE_TTS_CREDENTIALS'
    ];
    
    possibleKeys.forEach(keyName => {
        const value = process.env[keyName];
        debug.keyChecks[keyName] = {
            exists: !!value,
            length: value ? value.length : 0,
            isJSON: false,
            validJSON: false,
            hasRequiredFields: false,
            preview: value ? value.substring(0, 100) + '...' : null
        };
        
        if (value) {
            try {
                let parsedCredentials;
                
                // Handle Base64 decoding first
                if (keyName.includes('BASE64')) {
                    console.log(`🔓 Decoding Base64 for ${keyName}...`);
                    const decoded = Buffer.from(value, 'base64').toString('utf8');
                    parsedCredentials = JSON.parse(decoded);
                    debug.keyChecks[keyName].decodedFromBase64 = true;
                    debug.keyChecks[keyName].decodedLength = decoded.length;
                } else {
                    parsedCredentials = JSON.parse(value);
                    debug.keyChecks[keyName].decodedFromBase64 = false;
                }
                
                debug.keyChecks[keyName].isJSON = true;
                debug.keyChecks[keyName].validJSON = true;
                debug.keyChecks[keyName].hasRequiredFields = !!(
                    parsedCredentials.type &&
                    parsedCredentials.project_id &&
                    parsedCredentials.private_key &&
                    parsedCredentials.client_email
                );
                debug.keyChecks[keyName].projectId = parsedCredentials.project_id;
                debug.keyChecks[keyName].clientEmail = parsedCredentials.client_email;
                debug.keyChecks[keyName].type = parsedCredentials.type;
            } catch (e) {
                debug.keyChecks[keyName].isJSON = false;
                debug.keyChecks[keyName].parseError = e.message;
            }
        }
    });

    // 3. TTS Module Check
    debug.moduleChecks = {};
    
    try {
        const textToSpeech = require('@google-cloud/text-to-speech');
        debug.moduleChecks.googleCloudTTS = {
            loaded: true,
            version: textToSpeech.version || 'unknown'
        };
    } catch (e) {
        debug.moduleChecks.googleCloudTTS = {
            loaded: false,
            error: e.message
        };
    }

    // 4. Test Enhanced TTS Logic
    debug.enhancedTTSTest = {};
    
    try {
        // Simulate the enhanced credential loading logic
        const possibleCredKeys = [
            'GOOGLE_CLOUD_KEY_JSON',
            'GOOGLE_CLOUD_KEY_BASE64', 
            'GOOGLE_CLOUD_CREDENTIALS',
            'GOOGLE_APPLICATION_CREDENTIALS',
            'GCP_SERVICE_ACCOUNT_KEY'
        ];

        let foundCredentials = null;
        let credentialSource = null;

        for (const keyName of possibleCredKeys) {
            const value = process.env[keyName];
            if (!value) continue;

            try {
                let credentials;
                
                if (keyName.includes('BASE64')) {
                    const decoded = Buffer.from(value, 'base64').toString('utf8');
                    credentials = JSON.parse(decoded);
                    credentialSource = `${keyName} (Base64 decoded)`;
                } else {
                    credentials = JSON.parse(value);
                    credentialSource = keyName;
                }
                
                const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
                const missingFields = requiredFields.filter(field => !credentials[field]);
                
                if (missingFields.length === 0) {
                    foundCredentials = credentials;
                    break;
                }
                
            } catch (error) {
                continue;
            }
        }

        debug.enhancedTTSTest = {
            foundValidCredentials: !!foundCredentials,
            credentialSource: credentialSource,
            projectId: foundCredentials ? foundCredentials.project_id : null,
            clientEmail: foundCredentials ? foundCredentials.client_email : null
        };
        
    } catch (e) {
        debug.enhancedTTSTest = {
            error: e.message
        };
    }

    // 5. Deployment Info
    debug.deploymentInfo = {
        vercelURL: process.env.VERCEL_URL,
        vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
        vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
        vercelRegion: process.env.VERCEL_REGION,
        vercelEnv: process.env.VERCEL_ENV
    };

    // 6. Updated Recommendations
    debug.recommendations = [];
    
    const hasBase64Key = !!process.env.GOOGLE_CLOUD_KEY_BASE64;
    const hasJsonKey = !!process.env.GOOGLE_CLOUD_KEY_JSON;
    
    if (!hasBase64Key && !hasJsonKey) {
        debug.recommendations.push({
            issue: 'No Google Cloud credentials found',
            solution: 'Add GOOGLE_CLOUD_KEY_BASE64 to Vercel environment variables',
            priority: 'HIGH'
        });
    } else if (hasBase64Key && debug.keyChecks.GOOGLE_CLOUD_KEY_BASE64.validJSON === false) {
        debug.recommendations.push({
            issue: 'GOOGLE_CLOUD_KEY_BASE64 exists but invalid Base64/JSON',
            solution: 'Check Base64 format and ensure it decodes to valid JSON',
            priority: 'HIGH'
        });
    } else if (hasBase64Key && !debug.keyChecks.GOOGLE_CLOUD_KEY_BASE64.hasRequiredFields) {
        debug.recommendations.push({
            issue: 'GOOGLE_CLOUD_KEY_BASE64 missing required fields',
            solution: 'Ensure service account JSON has type, project_id, private_key, client_email',
            priority: 'HIGH'
        });
    } else if (debug.enhancedTTSTest.foundValidCredentials) {
        debug.recommendations.push({
            issue: 'Valid credentials found but TTS still in demo mode',
            solution: 'Force redeploy Vercel or check TTS initialization logs',
            priority: 'MEDIUM'
        });
    }

    return res.json(debug);
}; 