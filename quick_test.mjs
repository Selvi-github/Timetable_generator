import fetch from 'node-fetch';

async function quickTest() {
    try {
        const res = await fetch('http://localhost:5000/api/status');
        const text = await res.text();
        console.log('Raw response:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', json);
        } catch (e) {
            console.log('Not valid JSON');
        }
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

quickTest();
