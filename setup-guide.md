# Certificate Generator - Local Setup Guide

## Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database
- Git (optional)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=certificate_generator
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate a secure random string)
JWT_SECRET=your-very-secure-random-string-here

# Application URLs
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup
```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Build and Start
```bash
# Development mode (with hot reload)
npm run dev

# Or build and run production
npm run build
npm start
```

## Access the Application

- **Main Application**: http://localhost:3000
- **Enhanced Certificate Builder**: http://localhost:3000/templates/builder
- **Login Page**: http://localhost:3000/login
- **Registration**: http://localhost:3000/register

## Testing the Enhanced Certificate Builder

1. Register a new account or login
2. Navigate to `/templates/builder`
3. Use the template presets in the left sidebar
4. Customize colors, fonts, and content
5. Upload logos and add badges
6. Watch the live preview update in real-time
7. Save templates and download certificates

## Features Available

### 🎨 Template Presets
- Academic
- Corporate  
- Modern
- Classic
- Minimalist
- Bronze/Silver/Golden themes

### 🎯 Live Customization
- Real-time HTMX preview updates
- Color picker synchronization
- Logo upload and positioning
- Badge system with icons
- Font family selection
- Border style options

### 📱 Responsive Design
- Mobile-friendly interface
- Tailwind CSS styling
- Modern gradient backgrounds
- Smooth animations

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **Port Conflicts**: Change PORT in .env if 3000 is occupied
3. **TypeScript Errors**: Run `npm run build` to check for compilation issues

### Development Tips
- Use `npm run dev` for development with automatic restarts
- Check browser console for HTMX errors
- Monitor server logs for API endpoint issues
- Verify database schema with migration files

## Project Structure
```
src/
├── app.ts                 # Main application entry
├── routes/
│   └── enhancedTemplates.ts   # Enhanced certificate builder routes
├── services/
│   └── templateService.ts     # Template rendering logic
├── database/
│   └── migrations/            # Database schema
└── types/                     # TypeScript definitions

views/
└── templates/
    └── enhanced-builder.ejs   # Main certificate builder UI

public/
└── css/
    └── styles.css            # Custom styling
```