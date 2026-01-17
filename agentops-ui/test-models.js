const API_KEY = process.env.VITE_GEMINI_API_KEY || 'api here';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const modelsToTest = [
    'gemini-3.0-pro',
    'gemini-3-pro',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro-exp-0827'
];

async function testModel(modelName) {
    try {
        const url = `${API_BASE}/${modelName}:generateContent?key=${API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say OK' }] }],
                generationConfig: { maxOutputTokens: 5 }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.log(`❌ ${modelName}: FAILED - ${data.error?.message || response.statusText}`);
            return false;
        }

        console.log(`✅ ${modelName}: SUCCESS`);
        return true;
    } catch (error) {
        console.log(`❌ ${modelName}: NETWORK ERROR - ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('Testing Gemini Models availability via Fetch...');
    for (const model of modelsToTest) {
        await testModel(model);
    }
}

runTests();
