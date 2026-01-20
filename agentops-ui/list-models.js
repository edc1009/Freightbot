import 'dotenv/config';
const API_KEY = process.env.VITE_GEMINI_API_KEY || 'AIzaSyBu2oaEbpfNuEvgMhlj0LtoF1HEnLE4wwo';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function listModels() {
    try {
        const url = `${API_BASE}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.log(`❌ ListModels FAILED`);
            return;
        }

        console.log('Available Models:');
        (data.models || []).forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
            }
        });

    } catch (error) {
        console.log(`❌ NETWORK ERROR - ${error.message}`);
    }
}

listModels();
