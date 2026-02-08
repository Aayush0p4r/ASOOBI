const http = require('http');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const PORT = process.env.PORT || 3000;
// Use persistent disk path if provided (for Render), otherwise use current directory
const DATA_DIR = process.env.DATA_DIR || '.';
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.csv');

// Google Sheets Configuration
const GOOGLE_SHEETS_ENABLED = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let sheets = null;

// Initialize Google Sheets API
if (GOOGLE_SHEETS_ENABLED) {
    try {
        // Handle private key format - remove quotes if present and fix newlines
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;
        
        // Remove outer quotes if they exist
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
            privateKey = privateKey.slice(1, -1);
        }
        
        // Replace all variations of newline characters
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                type: 'service_account',
                project_id: process.env.GOOGLE_PROJECT_ID,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: privateKey,
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                token_uri: 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)}`
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        sheets = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets integration enabled');
    } catch (error) {
        console.error('❌ Failed to initialize Google Sheets:', error.message);
    }
}

// Function to append feedback to Google Sheets
async function appendToGoogleSheets(timestamp, name, email, type, message) {
    if (!GOOGLE_SHEETS_ENABLED || !sheets) {
        return { success: false, message: 'Google Sheets not configured' };
    }
    
    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'Sheet1!A:E', // Adjust if your sheet has a different name
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[timestamp, name, email, type, message]]
            }
        });
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error appending to Google Sheets:', error.message);
        return { success: false, message: error.message };
    }
}

// Helper to get today's date string
function getTimestamp() {
    return new Date().toISOString();
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create CSV if not exists with headers
if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, 'Timestamp,Name,Email,Type,Message\n');
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Handle Feedback Submission
    if (req.method === 'POST' && req.url === '/submit-feedback') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const timestamp = getTimestamp();
                
                // Sanitize fields to prevent CSV injection mostly by escaping commas or newlines
                const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
                
                const csvLine = `${timestamp},${sanitize(data.name)},${sanitize(data.email)},${sanitize(data.type)},${sanitize(data.message)}\n`;
                
                // Save to CSV file (local backup)
                fs.appendFile(FEEDBACK_FILE, csvLine, (err) => {
                    if (err) {
                        console.error('Error writing to CSV file', err);
                    } else {
                        console.log('✅ Feedback saved to CSV:', csvLine);
                    }
                });
                
                // Also save to Google Sheets (async, don't wait)
                if (GOOGLE_SHEETS_ENABLED) {
                    appendToGoogleSheets(timestamp, data.name, data.email, data.type, data.message)
                        .then(result => {
                            if (result.success) {
                                console.log('✅ Feedback saved to Google Sheets');
                            } else {
                                console.error('⚠️ Failed to save to Google Sheets:', result.message);
                            }
                        })
                        .catch(error => {
                            console.error('⚠️ Google Sheets error:', error.message);
                        });
                }
                
                // Respond immediately to user
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Feedback saved' }));
                
            } catch (e) {
                console.error('Error parsing JSON', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Static File Serving
    let filePath = '.' + decodeURIComponent(req.url); // Decode URL to handle spaces
    if (filePath === './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT') {
                fs.readFile('./404.html', (error, content) => {
                    if (error) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            // Don't use utf-8 encoding for binary files (images)
            if (contentType.startsWith('image/')) {
                res.end(content);
            } else {
                res.end(content, 'utf-8');
            }
        }
    });

});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop');
});
