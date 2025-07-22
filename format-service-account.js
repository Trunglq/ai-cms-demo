#!/usr/bin/env node

/**
 * Service Account JSON Formatter for Vercel Environment Variables
 * Usage: node format-service-account.js <path-to-service-account.json>
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Service Account JSON Formatter for Vercel');
console.log('===============================================');

// Check if file path provided
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
    console.log('❌ Usage: node format-service-account.js <path-to-service-account.json>');
    console.log('');
    console.log('Example:');
    console.log('  node format-service-account.js ./my-project-key.json');
    console.log('  node format-service-account.js C:\\Downloads\\service-account.json');
    process.exit(1);
}

try {
    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
        console.log('❌ File not found:', jsonFilePath);
        process.exit(1);
    }

    // Read and parse JSON
    console.log('📖 Reading file:', jsonFilePath);
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(jsonContent);

    // Validate it's a service account
    if (jsonData.type !== 'service_account') {
        console.log('⚠️  Warning: This doesn\'t look like a service account JSON (type is not "service_account")');
    }

    // Display info
    console.log('✅ Valid JSON file found!');
    console.log('📊 Service Account Info:');
    console.log('   Project ID:', jsonData.project_id || 'N/A');
    console.log('   Client Email:', jsonData.client_email || 'N/A');
    console.log('   Key Type:', jsonData.type || 'N/A');
    console.log('');

    // Format for Vercel (minified, single line)
    const minifiedJson = JSON.stringify(jsonData);
    
    console.log('🎯 FORMATTED FOR VERCEL ENVIRONMENT VARIABLE:');
    console.log('===============================================');
    console.log('Name: GOOGLE_CLOUD_KEY_JSON');
    console.log('Value:');
    console.log(minifiedJson);
    console.log('');

    // Also provide base64 option
    const base64Encoded = Buffer.from(minifiedJson).toString('base64');
    console.log('🔐 ALTERNATIVE: BASE64 ENCODED (if JSON has issues):');
    console.log('===============================================');
    console.log('Name: GOOGLE_CLOUD_KEY_JSON_BASE64');
    console.log('Value:');
    console.log(base64Encoded);
    console.log('');

    // Save formatted versions to files
    const baseName = path.basename(jsonFilePath, path.extname(jsonFilePath));
    const minifiedFile = `${baseName}-vercel.json`;
    const base64File = `${baseName}-base64.txt`;

    fs.writeFileSync(minifiedFile, minifiedJson);
    fs.writeFileSync(base64File, base64Encoded);

    console.log('💾 Files saved:');
    console.log('   Minified JSON:', minifiedFile);
    console.log('   Base64 encoded:', base64File);
    console.log('');

    // Instructions
    console.log('📋 NEXT STEPS:');
    console.log('1. Copy the "Value" from above');
    console.log('2. Go to Vercel Dashboard → Settings → Environment Variables');
    console.log('3. Add new variable: GOOGLE_CLOUD_KEY_JSON');
    console.log('4. Paste the value');
    console.log('5. Redeploy your app');
    console.log('');
    console.log('🔍 To verify: Call /api/text-to-speech after redeploy');
    console.log('Expected: "mode": "Production Mode" (not Demo)');

} catch (error) {
    if (error.name === 'SyntaxError') {
        console.log('❌ Invalid JSON file:', error.message);
    } else {
        console.log('❌ Error processing file:', error.message);
    }
    process.exit(1);
} 