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
        environment: 'Vercel Production Environment Debug v3-MULTIPART',
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

    // 2. Multi-Part Credentials Check
    debug.multiPartCheck = {
        partsFound: 0,
        parts: [],
        totalLength: 0,
        isValid: false
    };

    // Check for multi-part credentials
    let partIndex = 1;
    while (partIndex <= 10) { // Max 10 parts
        const partKey = `GOOGLE_CLOUD_KEY_PART${partIndex}`;
        const partValue = process.env[partKey];
        
        if (!partValue) break;
        
        debug.multiPartCheck.parts.push({
            key: partKey,
            length: partValue.length,
            preview: partValue.substring(0, 50) + '...'
        });
        debug.multiPartCheck.totalLength += partValue.length;
        partIndex++;
    }
    
    debug.multiPartCheck.partsFound = debug.multiPartCheck.parts.length;

    // 3. Multi-Part Validation Test
    debug.multiPartValidation = {};
    
    if (debug.multiPartCheck.partsFound > 0) {
        try {
            // Combine parts
            const parts = [];
            for (let i = 1; i <= debug.multiPartCheck.partsFound; i++) {
                parts.push(process.env[`GOOGLE_CLOUD_KEY_PART${i}`]);
            }
            
            const combinedBase64 = parts.join('');
            debug.multiPartValidation.combinedLength = combinedBase64.length;
            debug.multiPartValidation.combinedPreview = combinedBase64.substring(0, 100) + '...';
            
            // Decode Base64
            const decoded = Buffer.from(combinedBase64, 'base64').toString('utf8');
            debug.multiPartValidation.decodedLength = decoded.length;
            debug.multiPartValidation.decodedSuccessful = true;
            
            // Parse JSON
            const credentials = JSON.parse(decoded);
            debug.multiPartValidation.jsonParseSuccessful = true;
            debug.multiPartValidation.projectId = credentials.project_id;
            debug.multiPartValidation.clientEmail = credentials.client_email;
            debug.multiPartValidation.type = credentials.type;
            
            // Check required fields
            const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
            const missingFields = requiredFields.filter(field => !credentials[field]);
            debug.multiPartValidation.hasRequiredFields = missingFields.length === 0;
            debug.multiPartValidation.missingFields = missingFields;
            
            debug.multiPartCheck.isValid = debug.multiPartValidation.hasRequiredFields;
            
        } catch (error) {
            debug.multiPartValidation.error = error.message;
            debug.multiPartValidation.decodedSuccessful = false;
            debug.multiPartValidation.jsonParseSuccessful = false;
            debug.multiPartCheck.isValid = false;
        }
    }

    // 4. Single Credentials Check (backward compatibility)
    debug.singleCredentialCheck = {};
    
    const possibleKeys = [
        'GOOGLE_CLOUD_KEY_JSON',
        'GOOGLE_CLOUD_KEY_BASE64',
        'GOOGLE_CLOUD_CREDENTIALS',
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GCP_SERVICE_ACCOUNT_KEY'
    ];
    
    possibleKeys.forEach(keyName => {
        const value = process.env[keyName];
        debug.singleCredentialCheck[keyName] = {
            exists: !!value,
            length: value ? value.length : 0,
            isValid: false
        };
        
        if (value) {
            try {
                let credentials;
                if (keyName.includes('BASE64')) {
                    const decoded = Buffer.from(value, 'base64').toString('utf8');
                    credentials = JSON.parse(decoded);
                } else {
                    credentials = JSON.parse(value);
                }
                
                const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
                const hasAllFields = requiredFields.every(field => credentials[field]);
                
                debug.singleCredentialCheck[keyName].isValid = hasAllFields;
                if (hasAllFields) {
                    debug.singleCredentialCheck[keyName].projectId = credentials.project_id;
                    debug.singleCredentialCheck[keyName].clientEmail = credentials.client_email;
                }
                
            } catch (e) {
                debug.singleCredentialCheck[keyName].parseError = e.message;
            }
        }
    });

    // 5. TTS Module Check
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

    // 6. Overall Assessment
    debug.assessment = {
        credentialsFound: false,
        credentialType: null,
        recommendation: null
    };

    if (debug.multiPartCheck.isValid) {
        debug.assessment.credentialsFound = true;
        debug.assessment.credentialType = 'Multi-part Base64';
        debug.assessment.partsUsed = debug.multiPartCheck.partsFound;
        debug.assessment.recommendation = 'Multi-part credentials are valid! TTS should work in Production Mode.';
    } else {
        // Check single credentials
        const validSingleCredential = Object.entries(debug.singleCredentialCheck)
            .find(([key, info]) => info.isValid);
            
        if (validSingleCredential) {
            debug.assessment.credentialsFound = true;
            debug.assessment.credentialType = 'Single credential';
            debug.assessment.credentialSource = validSingleCredential[0];
            debug.assessment.recommendation = 'Single credentials are valid! TTS should work in Production Mode.';
        } else {
            debug.assessment.credentialsFound = false;
            debug.assessment.recommendation = debug.multiPartCheck.partsFound > 0 
                ? 'Multi-part credentials found but invalid. Check if all parts are correctly set on Vercel.'
                : 'No valid credentials found. Add GOOGLE_CLOUD_KEY_PART1, PART2, etc. to Vercel Environment Variables.';
        }
    }

    // 7. Deployment Info
    debug.deploymentInfo = {
        vercelURL: process.env.VERCEL_URL,
        vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
        vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
        vercelRegion: process.env.VERCEL_REGION,
        vercelEnv: process.env.VERCEL_ENV
    };

    return res.json(debug);
}; 