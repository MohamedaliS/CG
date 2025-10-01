# Certificate Generator

A full-stack certificate generation platform with verification system built with TypeScript, Fastify, PostgreSQL, and HTMX.

## 🚀 Features

### Core Functionality
- **User Authentication** - JWT-based auth with registration and login
- **Enhanced Certificate Builder** - Modern UI with React-inspired design and HTMX interactivity
- **Template Management** - 6 professional templates (Academic, Corporate, Modern, Classic, Minimalist, Bronze/Silver/Golden) + custom uploads
- **Live Preview** - Real-time certificate preview with HTMX updates
- **Advanced Customization** - Color pickers, logo upload, badge system, font selection
- **Certificate Generation** - Individual and batch processing from CSV files
- **QR Code Integration** - Automatic QR codes for certificate verification
- **PDF Generation** - High-quality PDF certificates using Puppeteer
- **Verification Portal** - Public certificate verification by ID or QR scan
- **Batch Processing** - ZIP downloads for multiple certificates

### Technical Features
- **Responsive Design** - Mobile-first UI with Tailwind CSS
- **Interactive Frontend** - HTMX-powered dynamic interactions
- **Image Processing** - Sharp for certificate composition and optimization
- **Database Migrations** - PostgreSQL with automated schema management
- **File Uploads** - Secure multipart file handling
- **Environment Config** - Flexible configuration management

## 🛠️ Tech Stack

- **Backend**: Fastify + TypeScript + Node.js
- **Database**: PostgreSQL with pg driver
- **Frontend**: HTMX + EJS templating + Tailwind CSS + Alpine.js
- **Image Processing**: Sharp + Puppeteer + QRCode
- **Authentication**: JWT + bcrypt
- **File Handling**: Multipart uploads + archiver for ZIP

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Git

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd certificate-generator
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up PostgreSQL
```bash
# Create database user (if needed)
sudo -u postgres createuser -s yourusername
sudo -u postgres psql -c "ALTER USER yourusername PASSWORD 'yourpassword';"

# Create database
createdb certificate_gen
```

### 4. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 5. Run database migrations
```bash
npm run db:migrate
npm run db:seed
```

### 6. Start the application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 7. Access the application
- **Main App**: http://localhost:3000
- **🎨 Enhanced Certificate Builder**: http://localhost:3000/templates/builder
- **Health Check**: http://localhost:3000/health
- **Verification Portal**: http://localhost:3000/verify

## 📁 Project Structure

```
certificate-generator/
├── src/
│   ├── app.ts                 # Main application entry
│   ├── config/                # Configuration files
│   ├── database/              # Database setup, migrations, queries
│   ├── middleware/            # Authentication middleware
│   ├── routes/                # API routes (auth, templates, certificates)
│   ├── services/              # Business logic layer
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Utility functions
├── views/                     # EJS templates
├── public/                    # Static assets (CSS, JS, images)
├── uploads/                   # User uploaded files
├── certificates/              # Generated certificates
└── dist/                      # Compiled TypeScript output
```

## 🎯 Usage

### Creating Certificates

1. **Register/Login** at `/register` or `/login`
2. **Enhanced Certificate Builder** - Visit `/templates/builder` for the modern certificate builder
3. **Choose Template** - Select from 6 professional presets or customize your own
4. **Live Customization** - Real-time preview with:
   - Color picker system (primary, secondary, accent colors)
   - Logo upload and positioning
   - Badge system with icon selection
   - Font family and border style options
5. **Generate** - Create individual certificates or upload CSV for batch processing

### Batch Processing

Upload a CSV file with columns:
```csv
name,email,course,date,additional_info
John Doe,john@example.com,Web Development,2024-01-15,Excellent
Jane Smith,jane@example.com,Data Science,2024-01-15,Outstanding
```

### Certificate Verification

- Visit `/verify` and enter certificate ID
- Scan QR code on certificate
- View verification status and details

## 🧪 Testing

Comprehensive testing documentation is available in `TESTING.md`.

Quick test setup:
```bash
./setup-test.sh  # Initialize test environment
npm run dev      # Start development server
```

Test with provided:
- Sample CSV file (`test-participants.csv`)
- Default templates
- Verification examples

## 📜 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Templates
- `GET /api/templates` - List user templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `GET /templates/builder` - Enhanced certificate builder UI
- `POST /api/templates/builder/preview` - Live preview updates (HTMX)
- `POST /api/templates/builder/apply-preset` - Apply template presets
- `POST /api/templates/builder/upload-logo` - Logo upload handling

### Certificates
- `POST /api/certificates` - Generate certificate
- `POST /api/certificates/batch` - Batch generation
- `GET /api/certificates/download/:batchId` - Download ZIP

### Verification
- `GET /api/verify/:certificateId` - Verify certificate
- `GET /verify/:certificateId` - Verification page

## 🔧 Configuration

Key environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=certificate_gen
DB_USER=your_username
DB_PASSWORD=your_password

# Security
JWT_SECRET=your_jwt_secret

# Server
PORT=3000
NODE_ENV=development
DOMAIN=http://localhost:3000
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY views/ ./views/
COPY public/ ./public/
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email support@example.com or create an issue in the repository.

## 🏗️ Architecture

The application follows a clean architecture pattern:

- **Routes** handle HTTP requests and responses
- **Services** contain business logic
- **Database** layer handles data persistence
- **Utils** provide shared functionality
- **Middleware** handles cross-cutting concerns

Built with scalability and maintainability in mind.
