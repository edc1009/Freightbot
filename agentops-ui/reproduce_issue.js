// reproduce_issue.js
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { processEmailWithAgent } from './src/services/geminiServiceNode.js';

// Polyfill removed - using safe getApiKey now

const FILES_TO_TEST = [
    '../TEST FILE/SH26010007 D-N.pdf',
    '../TEST FILE/SH26010007 HBL T.pdf',
    '../TEST FILE/142503915452.pdf'
];

async function runTest() {
    try {
        console.log('🚀 Starting Test Agent Reproduction...');
        const apiKey = process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('API Key missing in .env');

        // Read files and convert to base64
        const attachments = [];
        for (const filePath of FILES_TO_TEST) {
            const absolutePath = path.resolve(process.cwd(), filePath);
            if (fs.existsSync(absolutePath)) {
                console.log(`📄 Loading file: ${path.basename(filePath)}`);
                const fileBuffer = fs.readFileSync(absolutePath);
                attachments.push({
                    name: path.basename(filePath),
                    type: 'application/pdf',
                    content: fileBuffer.toString('base64')
                });
            } else {
                console.warn(`⚠️ File not found: ${filePath}`);
            }
        }

        const emailData = {
            from: 'test-agent@example.com',
            subject: 'Test Shipment Import',
            body: 'Please process these attached shipment documents.',
            attachments: attachments
        };

        console.log('📨 Sending to Agent...');
        const result = await processEmailWithAgent(apiKey, emailData, []);

        console.log('✅ Success! Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Test Failed:', error);
        if (error.message.includes('hallucinated')) {
            console.log('⚠️ Re-production successful: Hallucination detected.');
        }
    }
}

runTest();
