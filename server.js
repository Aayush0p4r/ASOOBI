const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FEEDBACK_FILE = 'feedback.csv';

// Helper to get today's date string
function getTimestamp() {
    return new Date().toISOString();
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
                // Sanitize fields to prevent CSV injection mostly by escaping commas or newlines
                const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
                
                const csvLine = `${getTimestamp()},${sanitize(data.name)},${sanitize(data.email)},${sanitize(data.type)},${sanitize(data.message)}\n`;
                
                fs.appendFile(FEEDBACK_FILE, csvLine, (err) => {
                    if (err) {
                        console.error('Error writing to file', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to save feedback' }));
                    } else {
                        console.log('Feedback saved:', csvLine);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Feedback saved' }));
                    }
                });
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
