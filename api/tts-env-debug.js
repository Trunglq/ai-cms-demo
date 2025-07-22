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
        environment: 'Vercel Production Environment Debug',
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

    // 2. Specific Key Checks
    debug.keyChecks = {};
    
    const possibleKeys = [
        'GOOGLE_CLOUD_KEY_JSON',
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
                const parsed = JSON.parse(value);
                debug.keyChecks[keyName].isJSON = true;
                debug.keyChecks[keyName].validJSON = true;
                debug.keyChecks[keyName].hasRequiredFields = !!(
                    parsed.type &&
                    parsed.project_id &&
                    parsed.private_key &&
                    parsed.client_email
                );
                debug.keyChecks[keyName].projectId = parsed.project_id;
                debug.keyChecks[keyName].clientEmail = parsed.client_email;
                debug.keyChecks[keyName].type = parsed.type;
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

    // 4. Deployment Info (Vercel specific)
    debug.deploymentInfo = {
        vercelURL: process.env.VERCEL_URL,
        vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
        vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
        vercelRegion: process.env.VERCEL_REGION,
        vercelEnv: process.env.VERCEL_ENV
    };

    // 5. Working Directory and Files
    try {
        const workingDir = process.cwd();
        debug.workingDirectory = {
            cwd: workingDir,
            dirname: __dirname,
            filename: __filename
        };
    } catch (e) {
        debug.workingDirectory = { error: e.message };
    }

    // 6. Recommendations
    debug.recommendations = [];
    
    const googleKeyExists = !!process.env.GOOGLE_CLOUD_KEY_JSON;
    const googleCredentialsExists = !!process.env.GOOGLE_CLOUD_CREDENTIALS;
    
    if (!googleKeyExists && !googleCredentialsExists) {
        debug.recommendations.push({
            issue: 'No Google Cloud credentials found',
            solution: 'Add GOOGLE_CLOUD_KEY_JSON to Vercel environment variables',
            priority: 'HIGH'
        });
    } else if (googleKeyExists && debug.keyChecks.GOOGLE_CLOUD_KEY_JSON.validJSON === false) {
        debug.recommendations.push({
            issue: 'GOOGLE_CLOUD_KEY_JSON exists but invalid JSON',
            solution: 'Check JSON format, ensure single line, consider base64 encoding',
            priority: 'HIGH'
        });
    } else if (googleKeyExists && !debug.keyChecks.GOOGLE_CLOUD_KEY_JSON.hasRequiredFields) {
        debug.recommendations.push({
            issue: 'GOOGLE_CLOUD_KEY_JSON missing required fields',
            solution: 'Ensure service account JSON has type, project_id, private_key, client_email',
            priority: 'HIGH'
        });
    }

    return res.json(debug);
}; 