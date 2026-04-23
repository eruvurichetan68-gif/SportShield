# SportShield - Sports Media Integrity Protection System

A comprehensive full-stack web application that protects the integrity of digital sports media from tampering, deepfakes, and unauthorized usage using blockchain-like verification and digital watermarking.

## Features

### Core Features
- **Media Upload & Fingerprinting**: Upload sports images/videos with SHA-256 hash generation
- **Tamper Detection System**: Compare file hashes to detect modifications
- **Blockchain-like Verification**: Maintain a chain of verification records
- **Digital Watermarking**: Add invisible/visible watermarks to uploaded media
- **Dashboard**: Real-time statistics and recent uploads
- **Search & Verify**: Search by filename or hash, verify authenticity instantly

### Technical Features
- SHA-256 cryptographic hashing
- Simplified blockchain implementation
- Digital watermarking for images
- RESTful API architecture
- Responsive web interface
- Real-time status updates

## Tech Stack

### Backend
- **Node.js** + **Express.js**
- **Multer** for file uploads
- **Sharp** for image processing
- **Crypto** for hashing
- **JSON file storage** (easily upgradeable to MongoDB)

### Frontend
- **HTML5**, **CSS3**, **JavaScript (ES6+)**
- Responsive design
- Modern UI with animations
- Real-time API integration

### Libraries
- `express` - Web framework
- `multer` - File upload handling
- `sharp` - Image processing and watermarking
- `crypto` - Cryptographic functions
- `cors` - Cross-origin resource sharing
- `uuid` - Unique identifier generation

## Project Structure

```
SportShield/
|-- backend/
|   |-- node_modules/
|   |-- package.json
|   |-- server.js
|   |-- database.json
|   `-- uploads/
|-- frontend/
|   |-- index.html
|   |-- style.css
|   `-- script.js
|-- uploads/
`-- README.md
```

## Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

Navigate to the backend directory and install required packages:

```bash
cd backend
npm install
```

### Step 2: Start the Backend Server

```bash
# For development (with auto-restart)
npm run dev

# For production
npm start
```

The server will start on `http://localhost:3000`

### Step 3: Open the Frontend

Open the `frontend/index.html` file in your web browser:

```bash
# Option 1: Double-click the file
# Option 2: Use a simple HTTP server
cd frontend
npx http-server . -p 8080
```

The application will be available at `http://localhost:8080`

## Usage Guide

### 1. Upload Media
1. Navigate to the **Upload Media** section
2. Optionally enter your name
3. Select an image or video file
4. Click "Upload & Protect"
5. The system will:
   - Generate SHA-256 hash
   - Add digital watermark (for images)
   - Create blockchain record
   - Store metadata

### 2. Verify Media
1. Navigate to the **Verify Media** section
2. Select a file you want to verify
3. Click "Verify Authenticity"
4. The system will:
   - Calculate file hash
   - Compare with database records
   - Show if file is authentic or tampered

### 3. Search Media
1. Navigate to the **Search** section
2. Enter filename or hash
3. Click search or press Enter
4. View matching media records

### 4. View Blockchain
1. Navigate to the **Blockchain** section
2. View the complete verification chain
3. Each block contains:
   - File hash
   - Previous block hash
   - Timestamp
   - Unique block hash

### 5. Dashboard
1. View real-time statistics
2. See recent uploads
3. Monitor system activity

## API Endpoints

### Media Management
- `POST /api/upload` - Upload and protect media
- `POST /api/verify` - Verify media integrity
- `GET /api/media` - Get all media records
- `GET /api/search?query=` - Search media

### Blockchain
- `GET /api/blockchain` - Get blockchain records

### Statistics
- `GET /api/stats` - Get dashboard statistics

### Files
- `GET /uploads/:filename` - Serve uploaded files

## File Types Supported

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)

### Videos
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- WMV (.wmv)

## Security Features

### Hashing
- SHA-256 cryptographic hashing
- Unique fingerprint for each file
- Tamper detection through hash comparison

### Watermarking
- Invisible watermarks using Sharp library
- Contains uploader ID and timestamp
- Helps track unauthorized usage

### Blockchain Verification
- Immutable record chain
- Each block references previous block
- Timestamped verification records

## Development

### Running in Development Mode

```bash
cd backend
npm run dev
```

This uses `nodemon` for automatic server restart on file changes.

### Project Structure Explanation

- **backend/server.js**: Main Express server with all API endpoints
- **backend/database.json**: Simple JSON storage (can be replaced with MongoDB)
- **frontend/**: Static web files
- **uploads/**: Storage for uploaded media files

### Adding New Features

The codebase is structured for easy extension:

1. **New API endpoints**: Add to `server.js`
2. **Database operations**: Modify the read/write functions
3. **Frontend features**: Add new sections to HTML/CSS/JS

## Production Deployment

### Environment Variables
```bash
PORT=3000
NODE_ENV=production
```

### Database Upgrade
For production use, replace JSON storage with MongoDB:

1. Install MongoDB driver: `npm install mongodb`
2. Replace JSON functions with MongoDB operations
3. Update database connection logic

### Security Considerations
- Add authentication system
- Implement rate limiting
- Add file size restrictions
- Set up HTTPS
- Add input validation

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   ```

2. **File upload fails**
   - Check file size limit (50MB default)
   - Verify file type is supported
   - Ensure uploads directory exists

3. **CORS errors**
   - Backend runs on port 3000
   - Frontend should be served from port 8080 or use CORS proxy

4. **Watermarking fails**
   - Sharp library requires proper installation
   - Only works for image files, not videos

### Logs
Server logs show in the terminal where you started the backend server.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue with detailed information

---

**SportShield** - Protecting the integrity of sports media, one hash at a time.
