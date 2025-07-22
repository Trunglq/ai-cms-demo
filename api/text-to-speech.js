const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');

// Initialize Google Cloud TTS client
let ttsClient;

try {
    // For production: Use service account key from environment variable
    if (process.env.GOOGLE_CLOUD_KEY_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON);
        ttsClient = new textToSpeech.TextToSpeechClient({
            projectId: credentials.project_id,
            credentials: credentials
        });
        console.log('✅ Google Cloud TTS initialized with service account');
    } else {
        // For local development: Use default credentials or key file
        ttsClient = new textToSpeech.TextToSpeechClient();
        console.log('⚠️ Google Cloud TTS initialized with default credentials');
    }
} catch (error) {
    console.error('❌ Failed to initialize Google Cloud TTS:', error.message);
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