const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');

// Initialize Google Cloud TTS client
let ttsClient;

console.log('🚀 TTS API Initializing... v4-MULTIPART');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('📊 All env vars with GOOGLE:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));

// Enhanced credential loading function with multi-part support
function loadGoogleCredentials() {
    console.log('\n🔍 Loading Google Cloud credentials...');
    
    // Method 1: Try multi-part Base64 (GOOGLE_CLOUD_KEY_PART1, PART2, etc.)
    console.log('📋 Method 1: Multi-part Base64 credentials');
    const multiPartCredentials = loadMultiPartBase64Credentials();
    if (multiPartCredentials) {
        console.log('✅ Multi-part credentials loaded successfully!');
        return multiPartCredentials;
    }
    
    // Method 2: Try single Base64 (backward compatibility)
    console.log('📋 Method 2: Single Base64 credentials');
    const singleCredentials = loadSingleCredentials();
    if (singleCredentials) {
        console.log('✅ Single credentials loaded successfully!');
        return singleCredentials;
    }
    
    console.log('❌ No valid credentials found');
    return null;
}

function loadMultiPartBase64Credentials() {
    console.log('🔍 Checking for multi-part Base64 credentials...');
    
    // Check for parts (PART1, PART2, PART3, PART4, etc.)
    const parts = [];
    let partIndex = 1;
    
    while (true) {
        const partKey = `GOOGLE_CLOUD_KEY_PART${partIndex}`;
        const partValue = process.env[partKey];
        
        if (!partValue) {
            console.log(`📊 No ${partKey} found, stopping at ${partIndex - 1} parts`);
            break;
        }
        
        console.log(`📋 Found ${partKey}: ${partValue.length} chars`);
        parts.push(partValue);
        partIndex++;
        
        // Safety limit to prevent infinite loop
        if (partIndex > 10) {
            console.log('⚠️ Safety limit reached (10 parts max)');
            break;
        }
    }
    
    if (parts.length === 0) {
        console.log('📊 No multi-part credentials found');
        return null;
    }
    
    try {
        // Combine all parts
        const combinedBase64 = parts.join('');
        console.log(`🔗 Combined ${parts.length} parts into ${combinedBase64.length} characters`);
        console.log(`📊 Combined preview: ${combinedBase64.substring(0, 100)}...`);
        
        // Decode Base64
        console.log('🔓 Decoding combined Base64...');
        const decoded = Buffer.from(combinedBase64, 'base64').toString('utf8');
        console.log(`✅ Base64 decoded: ${decoded.length} characters`);
        
        // Parse JSON
        console.log('📝 Parsing decoded JSON...');
        const credentials = JSON.parse(decoded);
        
        // Validate required fields
        const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !credentials[field]);
        
        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            return null;
        }
        
        console.log('🔧 Valid multi-part credentials found:');
        console.log('  Project ID:', credentials.project_id);
        console.log('  Client Email:', credentials.client_email);
        console.log('  Type:', credentials.type);
        console.log('  Parts used:', parts.length);
        
        return credentials;
        
    } catch (error) {
        console.log('❌ Multi-part credentials failed:', error.message);
        if (error instanceof SyntaxError) {
            console.log('📊 JSON parse error - check if all parts are correct');
        }
        return null;
    }
}

function loadSingleCredentials() {
    const possibleKeys = [
        'GOOGLE_CLOUD_KEY_JSON',
        'GOOGLE_CLOUD_KEY_BASE64',
        'GOOGLE_CLOUD_CREDENTIALS',
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GCP_SERVICE_ACCOUNT_KEY'
    ];

    for (const keyName of possibleKeys) {
        const value = process.env[keyName];
        if (!value) continue;

        console.log(`🔍 Trying ${keyName}, length:`, value.length);
        console.log(`📊 Preview:`, value.substring(0, 100) + '...');

        try {
            let credentials;
            
            // Handle Base64 encoded credentials
            if (keyName.includes('BASE64')) {
                console.log('🔓 Decoding Base64 credentials...');
                const decoded = Buffer.from(value, 'base64').toString('utf8');
                credentials = JSON.parse(decoded);
                console.log('✅ Base64 decode successful');
            } 
            // Handle direct JSON
            else {
                console.log('📝 Parsing direct JSON credentials...');
                credentials = JSON.parse(value);
                console.log('✅ Direct JSON parse successful');
            }
            
            // Validate required fields
            const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
            const missingFields = requiredFields.filter(field => !credentials[field]);
            
            if (missingFields.length > 0) {
                console.log('❌ Missing required fields:', missingFields);
                continue;
            }
            
            console.log('🔧 Valid single credentials found:');
            console.log('  Project ID:', credentials.project_id);
            console.log('  Client Email:', credentials.client_email);
            console.log('  Type:', credentials.type);
            console.log('  Source:', keyName);
            
            return credentials;
            
        } catch (error) {
            console.log(`❌ Failed to parse ${keyName}:`, error.message);
            continue;
        }
    }
    
    return null;
}

try {
    const credentials = loadGoogleCredentials();
    
    if (credentials) {
        console.log('\n🔑 Initializing Google Cloud TTS with valid credentials...');
        
        ttsClient = new textToSpeech.TextToSpeechClient({
            projectId: credentials.project_id,
            credentials: credentials
        });
        
        console.log('✅ Google Cloud TTS initialized successfully');
        console.log('🌟 PRODUCTION MODE - Real TTS active');
        console.log('📊 Project:', credentials.project_id);
        console.log('📊 Service Account:', credentials.client_email);
    } else {
        console.log('⚠️ No valid Google Cloud credentials found');
        console.log('📊 Checked for multi-part and single credentials');
        console.log('🎭 Falling back to demo mode');
        ttsClient = null;
    }
} catch (error) {
    console.error('❌ Failed to initialize Google Cloud TTS:', error.message);
    console.error('❌ Full error:', error);
    console.log('🎭 Falling back to demo mode due to initialization error');
    ttsClient = null;
}

// Audio cache for temporary files (in-memory for serverless)
const audioCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Health check
    if (req.method === 'GET') {
        if (!ttsClient) {
            // Fallback to demo mode for health check
            const demoTTS = require('./text-to-speech-demo');
            return demoTTS(req, res);
        }
        
        return res.json({
            success: true,
            message: 'Google Cloud Text-to-Speech API is working',
            version: '1.0.0',
            mode: 'Production Mode',
            supportedLanguages: {
                'vi-VN': 'Vietnamese',
                'en-US': 'English (US)',
                'en-GB': 'English (UK)', 
                'ja-JP': 'Japanese',
                'ko-KR': 'Korean'
            },
            features: ['Multiple voices', 'Speed control', 'High quality audio', 'MP3 output'],
            status: 'Connected',
            timestamp: new Date().toISOString()
        });
    }

    // Main TTS processing
    if (req.method === 'POST') {
        try {
            const { text, language = 'vi-VN', voice, speed = 1.0 } = req.body;

            // Validation
            if (!text || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Text is required'
                });
            }

            if (text.length > 5000) {
                return res.status(400).json({
                    success: false,
                    error: 'Text too long. Maximum 5000 characters allowed.'
                });
            }

            // Auto-fallback to demo mode if Google Cloud TTS not configured
            if (!ttsClient) {
                console.log('⚠️ Google Cloud TTS not configured, falling back to demo mode...');
                
                // Import and use demo TTS
                const demoTTS = require('./text-to-speech-demo');
                return demoTTS(req, res);
            }

            console.log(`🎤 Processing TTS request: ${text.length} chars, ${language}, ${voice}`);

            // Create cache key
            const cacheKey = `${language}_${voice}_${speed}_${Buffer.from(text).toString('base64').substring(0, 50)}`;

            // Check cache first
            if (audioCache.has(cacheKey)) {
                const cached = audioCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_DURATION) {
                    console.log('📋 Serving from cache');
                    return res.json({
                        success: true,
                        audioUrl: cached.audioUrl,
                        duration: cached.duration,
                        size: cached.size,
                        voiceUsed: cached.voiceUsed,
                        quality: cached.quality,
                        fromCache: true,
                        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000 / 60) + ' minutes'
                    });
                } else {
                    audioCache.delete(cacheKey);
                }
            }

            // Determine voice if not specified
            const selectedVoice = voice || getDefaultVoice(language);
            
            // Validate voice for language
            if (!isValidVoiceForLanguage(selectedVoice, language)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid voice "${selectedVoice}" for language "${language}"`
                });
            }

            // Prepare TTS request
            const ttsRequest = {
                input: { text: text.trim() },
                voice: {
                    languageCode: language,
                    name: selectedVoice
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: Math.max(0.25, Math.min(4.0, parseFloat(speed))), // Clamp between 0.25-4.0
                    pitch: 0,
                    volumeGainDb: 0
                }
            };

            console.log('📤 Sending request to Google Cloud TTS...');
            const startTime = Date.now();

            // Call Google Cloud TTS
            const [response] = await ttsClient.synthesizeSpeech(ttsRequest);
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ TTS completed in ${processingTime}ms`);

            // Convert audio buffer to base64 data URL
            const audioBuffer = response.audioContent;
            const base64Audio = audioBuffer.toString('base64');
            const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;

            // Calculate audio info
            const audioSize = formatFileSize(audioBuffer.length);
            const estimatedDuration = estimateAudioDuration(text, parseFloat(speed));
            const quality = selectedVoice.includes('Wavenet') ? 'High (WaveNet)' : 'Standard';

            // Cache the result
            const result = {
                success: true,
                audioUrl: audioDataUrl,
                duration: estimatedDuration,
                size: audioSize,
                voiceUsed: selectedVoice,
                quality: quality,
                processingTime: processingTime + 'ms',
                fromCache: false
            };

            audioCache.set(cacheKey, {
                ...result,
                timestamp: Date.now()
            });

            console.log(`📊 Audio generated: ${audioSize}, ${estimatedDuration}, ${quality}`);
            return res.json(result);

        } catch (error) {
            console.error('❌ TTS Error:', error);
            
            // Handle specific Google Cloud errors
            let errorMessage = 'Internal server error during TTS processing';
            
            if (error.code === 3) { // INVALID_ARGUMENT
                errorMessage = 'Invalid TTS parameters. Please check voice and language settings.';
            } else if (error.code === 7) { // PERMISSION_DENIED
                errorMessage = 'Google Cloud TTS permission denied. Please check API credentials.';
            } else if (error.code === 8) { // RESOURCE_EXHAUSTED  
                errorMessage = 'TTS quota exceeded. Please try again later.';
            } else if (error.code === 14) { // UNAVAILABLE
                errorMessage = 'Google Cloud TTS service temporarily unavailable.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            return res.status(500).json({
                success: false,
                error: errorMessage,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
};

// Helper functions
function getDefaultVoice(language) {
    const defaultVoices = {
        'vi-VN': 'vi-VN-Standard-A',
        'en-US': 'en-US-Standard-A',
        'en-GB': 'en-GB-Standard-A',
        'ja-JP': 'ja-JP-Standard-A',
        'ko-KR': 'ko-KR-Standard-A'
    };
    return defaultVoices[language] || 'vi-VN-Standard-A';
}

function isValidVoiceForLanguage(voice, language) {
    return voice.startsWith(language);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function estimateAudioDuration(text, speed) {
    // Rough estimation: ~150 words per minute for Vietnamese, adjusted by speed
    const words = text.split(/\s+/).length;
    const baseWPM = 150;
    const adjustedWPM = baseWPM * speed;
    const durationMinutes = words / adjustedWPM;
    const durationSeconds = Math.round(durationMinutes * 60);
    
    if (durationSeconds < 60) {
        return durationSeconds + 's';
    } else {
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }
}

// Cleanup expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of audioCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            audioCache.delete(key);
        }
    }
    console.log(`🧹 Cache cleanup: ${audioCache.size} entries remaining`);
}, 10 * 60 * 1000); // Clean every 10 minutes 