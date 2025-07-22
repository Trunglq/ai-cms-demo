// Demo/Fallback Text-to-Speech API for development and testing
// This generates mock audio responses when Google Cloud credentials are not available

const fs = require('fs');
const path = require('path');

// Simple in-memory cache
const demoCache = new Map();
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
        return res.json({
            success: true,
            message: 'Demo Text-to-Speech API is working',
            version: '1.0.0-demo',
            mode: 'Demo/Fallback Mode',
            note: 'This is a demo endpoint. Real TTS requires Google Cloud credentials.',
            supportedLanguages: {
                'vi-VN': 'Vietnamese (Demo)',
                'en-US': 'English (US) - Demo',
                'en-GB': 'English (UK) - Demo', 
                'ja-JP': 'Japanese (Demo)',
                'ko-KR': 'Korean (Demo)'
            },
            features: ['Demo audio generation', 'Speed simulation', 'Voice options'],
            timestamp: new Date().toISOString()
        });
    }

    // Main demo TTS processing
    if (req.method === 'POST') {
        try {
            const { text, language = 'vi-VN', voice, speed = 1.0 } = req.body;

            // Validation
            if (!text || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Text is required for demo TTS'
                });
            }

            if (text.length > 5000) {
                return res.status(400).json({
                    success: false,
                    error: 'Text too long. Maximum 5000 characters allowed.'
                });
            }

            console.log(`🎭 Demo TTS request: ${text.length} chars, ${language}, ${voice || 'default'}`);

            // Simulate processing time
            const startTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); // 0.5-1.5s delay

            // Create cache key
            const cacheKey = `demo_${language}_${voice}_${speed}_${text.substring(0, 50)}`;

            // Check cache first
            if (demoCache.has(cacheKey)) {
                const cached = demoCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_DURATION) {
                    console.log('📋 Serving demo from cache');
                    return res.json({
                        ...cached.data,
                        fromCache: true,
                        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000 / 60) + ' minutes'
                    });
                } else {
                    demoCache.delete(cacheKey);
                }
            }

            // Generate demo audio (base64 encoded silence with metadata)
            const demoAudio = generateDemoAudio(text, language, voice, speed);
            const processingTime = Date.now() - startTime;

            // Calculate realistic info
            const audioSize = formatFileSize(text.length * 0.8); // Rough estimation
            const estimatedDuration = estimateAudioDuration(text, speed);
            const selectedVoice = voice || getDefaultVoice(language);
            const quality = selectedVoice.includes('Wavenet') ? 'High (WaveNet) - Demo' : 'Standard - Demo';

            // Create response
            const result = {
                success: true,
                audioUrl: demoAudio,
                duration: estimatedDuration,
                size: audioSize,
                voiceUsed: selectedVoice,
                quality: quality,
                processingTime: processingTime + 'ms',
                fromCache: false,
                demoMode: true,
                note: 'This is demo audio. For real TTS, set up Google Cloud credentials.'
            };

            // Cache the result
            demoCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            console.log(`🎭 Demo audio generated: ${audioSize}, ${estimatedDuration}, ${quality}`);
            return res.json(result);

        } catch (error) {
            console.error('❌ Demo TTS Error:', error);
            return res.status(500).json({
                success: false,
                error: 'Demo TTS processing failed: ' + error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
};

// Generate demo audio data URL (silent audio with proper headers)
function generateDemoAudio(text, language, voice, speed) {
    // Generate a simple sine wave tone for demo purposes
    const duration = Math.min(text.length * 0.1, 30); // Max 30 seconds
    const sampleRate = 22050;
    const samples = Math.floor(duration * sampleRate);
    
    // Create simple WAV header
    const buffer = Buffer.alloc(44 + samples * 2);
    let offset = 0;
    
    // WAV header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(36 + samples * 2, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;
    buffer.writeUInt16LE(1, offset); offset += 2; // PCM
    buffer.writeUInt16LE(1, offset); offset += 2; // Mono
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(sampleRate * 2, offset); offset += 4;
    buffer.writeUInt16LE(2, offset); offset += 2;
    buffer.writeUInt16LE(16, offset); offset += 2;
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(samples * 2, offset); offset += 4;
    
    // Generate simple tone based on language/voice (different frequencies)
    const baseFreq = getLanguageFrequency(language);
    const voiceFreq = getVoiceFrequency(voice);
    const frequency = baseFreq + voiceFreq;
    
    for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1; // Very quiet
        buffer.writeInt16LE(sample * 32767, offset + i * 2);
    }
    
    // Convert to base64 data URL
    const base64Audio = buffer.toString('base64');
    return `data:audio/wav;base64,${base64Audio}`;
}

// Get base frequency for different languages (for demo variety)
function getLanguageFrequency(language) {
    const frequencies = {
        'vi-VN': 220,    // Vietnamese - A3
        'en-US': 261.63, // English US - C4
        'en-GB': 246.94, // English UK - B3
        'ja-JP': 293.66, // Japanese - D4
        'ko-KR': 329.63  // Korean - E4
    };
    return frequencies[language] || 220;
}

// Get voice variation frequency (for demo variety)
function getVoiceFrequency(voice) {
    if (!voice) return 0;
    
    if (voice.includes('-A')) return 0;
    if (voice.includes('-B')) return 20;
    if (voice.includes('-C')) return -10;
    if (voice.includes('-D')) return 15;
    if (voice.includes('Wavenet')) return 5; // Slight variation for premium voices
    
    return 0;
}

// Helper functions (same as real TTS API)
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
    for (const [key, value] of demoCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            demoCache.delete(key);
        }
    }
    console.log(`🧹 Demo cache cleanup: ${demoCache.size} entries remaining`);
}, 10 * 60 * 1000); 