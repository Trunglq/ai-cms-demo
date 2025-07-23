const speech = require('@google-cloud/speech');
const fs = require('fs').promises;
const path = require('path');

// Initialize Google Cloud Speech client
let speechClient;

console.log('🎙️ STT API Initializing... v1-MULTIPART');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('📊 All env vars with GOOGLE:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));

// Enhanced credential loading function with multi-part support
function loadGoogleCredentials() {
    console.log('\n🔍 Loading Google Cloud credentials for STT...');
    
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
        console.log('\n🔑 Initializing Google Cloud Speech-to-Text with valid credentials...');
        
        speechClient = new speech.SpeechClient({
            projectId: credentials.project_id,
            credentials: credentials
        });
        
        console.log('✅ Google Cloud Speech-to-Text initialized successfully');
        console.log('🌟 PRODUCTION MODE - Real STT active');
        console.log('📊 Project:', credentials.project_id);
        console.log('📊 Service Account:', credentials.client_email);
    } else {
        console.log('⚠️ No valid Google Cloud credentials found');
        console.log('📊 Checked for multi-part and single credentials');
        console.log('🎭 Falling back to demo mode');
        speechClient = null;
    }
} catch (error) {
    console.error('❌ Failed to initialize Google Cloud Speech-to-Text:', error.message);
    console.error('❌ Full error:', error);
    console.log('🎭 Falling back to demo mode due to initialization error');
    speechClient = null;
}

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
        if (!speechClient) {
            // Fallback to demo mode for health check
            return res.json({
                success: true,
                message: 'Demo Speech-to-Text API is working',
                version: '1.0.0-demo',
                mode: 'Demo/Fallback Mode',
                note: 'This is a demo endpoint. Real STT requires Google Cloud credentials.',
                supportedLanguages: {
                    'vi-VN': 'Vietnamese (Demo)',
                    'en-US': 'English (US) - Demo',
                    'en-GB': 'English (UK) - Demo',
                    'ja-JP': 'Japanese (Demo)',
                    'ko-KR': 'Korean (Demo)'
                },
                features: ['Demo transcription', 'Multiple languages', 'Audio upload support'],
                timestamp: new Date().toISOString()
            });
        }
        
        return res.json({
            success: true,
            message: 'Google Cloud Speech-to-Text API is working',
            version: '1.0.0',
            mode: 'Production Mode',
            supportedLanguages: {
                'vi-VN': 'Vietnamese',
                'en-US': 'English (US)',
                'en-GB': 'English (UK)', 
                'ja-JP': 'Japanese',
                'ko-KR': 'Korean'
            },
            features: ['Real-time transcription', 'Multiple audio formats', 'High accuracy', 'Punctuation auto-add'],
            status: 'Connected',
            timestamp: new Date().toISOString()
        });
    }

    // Main STT processing
    if (req.method === 'POST') {
        try {
            const { audioData, language = 'vi-VN', encoding = 'WEBM_OPUS', sampleRate = 48000 } = req.body;

            // Validation
            if (!audioData) {
                return res.status(400).json({
                    success: false,
                    error: 'Audio data is required'
                });
            }

            // Auto-fallback to demo mode if Google Cloud STT not configured
            if (!speechClient) {
                console.log('⚠️ Google Cloud STT not configured, falling back to demo mode...');
                
                // Demo response
                const demoTranscriptions = {
                    'vi-VN': 'Đây là kết quả demo cho Speech-to-Text tiếng Việt. Nội dung thực tế sẽ được chuyển đổi khi có Google Cloud credentials.',
                    'en-US': 'This is a demo result for English Speech-to-Text. Real content will be transcribed when Google Cloud credentials are configured.',
                    'en-GB': 'This is a demo result for British English Speech-to-Text.',
                    'ja-JP': 'これは日本語音声テキスト変換のデモ結果です。',
                    'ko-KR': '이것은 한국어 음성-텍스트 변환의 데모 결과입니다.'
                };

                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Demo delay

                return res.json({
                    success: true,
                    transcription: demoTranscriptions[language] || demoTranscriptions['vi-VN'],
                    confidence: 0.85 + Math.random() * 0.1, // Demo confidence
                    language: language,
                    mode: 'Demo/Fallback Mode',
                    demoMode: true,
                    note: 'This is a demo transcription. Enable Google Cloud STT for real functionality.',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`🎙️ Processing STT request: ${language}, ${encoding}, ${sampleRate}Hz`);

            // Decode base64 audio data
            let audioBuffer;
            try {
                // Remove data URL prefix if present
                const base64Audio = audioData.includes(',') ? audioData.split(',')[1] : audioData;
                audioBuffer = Buffer.from(base64Audio, 'base64');
                console.log(`📊 Audio buffer size: ${audioBuffer.length} bytes`);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid audio data format'
                });
            }

            // Prepare STT request
            const sttRequest = {
                audio: {
                    content: audioBuffer
                },
                config: {
                    encoding: encoding,
                    sampleRateHertz: sampleRate,
                    languageCode: language,
                    enableAutomaticPunctuation: true,
                    model: 'latest_long', // Best for longer audio
                    useEnhanced: true // Higher quality model when available
                }
            };

            console.log('📤 Sending request to Google Cloud Speech-to-Text...');
            const startTime = Date.now();

            // Call Google Cloud STT
            const [response] = await speechClient.recognize(sttRequest);
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ STT completed in ${processingTime}ms`);

            // Extract transcription results
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join(' ');

            // Get confidence score (average of all results)
            const confidence = response.results.length > 0
                ? response.results.reduce((sum, result) => sum + (result.alternatives[0].confidence || 0), 0) / response.results.length
                : 0;

            console.log(`📊 Transcription: "${transcription.substring(0, 100)}..."`);
            console.log(`📊 Confidence: ${(confidence * 100).toFixed(1)}%`);

            return res.json({
                success: true,
                transcription: transcription || '(Không nhận diện được âm thanh)',
                confidence: confidence,
                language: language,
                audioSize: formatFileSize(audioBuffer.length),
                processingTime: processingTime + 'ms',
                mode: 'Production Mode',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ STT Error:', error.message);
            console.error('❌ Full error:', error);

            // Handle specific Google Cloud errors
            let errorMessage = 'Lỗi không xác định khi xử lý audio';
            
            if (error.code === 3) {
                errorMessage = 'Định dạng audio không hợp lệ hoặc file bị lỗi';
            } else if (error.code === 7) {
                errorMessage = 'Không có quyền truy cập Speech-to-Text API';
            } else if (error.code === 8) {
                errorMessage = 'Đã vượt quá giới hạn API quota';
            } else if (error.code === 14) {
                errorMessage = 'Dịch vụ Google Cloud STT tạm thời không khả dụng';
            } else if (error.message.includes('audio')) {
                errorMessage = 'Lỗi xử lý file audio. Vui lòng thử định dạng khác.';
            }

            return res.status(500).json({
                success: false,
                error: errorMessage,
                details: error.message,
                errorCode: error.code
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
};

// Helper functions
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
} 