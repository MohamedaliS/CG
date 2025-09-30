# Certificate Generator - Testing Guide

## 🧪 How to Test the Application

### Prerequisites

1. **PostgreSQL Database**
   ```bash
   # Install PostgreSQL (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   
   # Start PostgreSQL service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Create database
   sudo -u postgres createdb certificate_gen
   
   # Create user (optional)
   sudo -u postgres psql
   CREATE USER cert_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE certificate_gen TO cert_user;
   \q
   ```

2. **Node.js & npm** (already installed)

### Step-by-Step Testing

#### 1. Environment Setup
```bash
# Navigate to project directory
cd /home/maxx/Documents/GitHub/CG

# Install dependencies (already done)
npm install

# Copy environment file (already done)
# Edit .env file with your database credentials
```

#### 2. Database Setup
```bash
# Run database migrations
npm run db:migrate

# Seed default templates
npm run db:seed
```

#### 3. Build TypeScript
```bash
# Compile TypeScript
npm run build
```

#### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm run start
```

#### 5. Access the Application
- **Main App**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Verification Portal**: http://localhost:3000/verify

### 🧩 Testing Scenarios

#### A. User Registration & Login
1. **Navigate to**: http://localhost:3000/register
2. **Fill out form**:
   - Email: test@example.com
   - Organization: Test Organization
   - Password: Password123!
   - Confirm Password: Password123!
3. **Expected**: Successful registration → Redirect to dashboard
4. **Test Login**: http://localhost:3000/login

#### B. Template Selection & Customization
1. **From Dashboard**: Click "Create Certificates"
2. **Select Template**: Choose from Modern, Classic, or Minimalist
3. **Customize**:
   - Upload logo (optional)
   - Change primary color
   - Adjust text position
   - Modify font settings
4. **Preview**: Generate preview certificate

#### C. Certificate Generation

**Method 1: Manual Entry**
1. **Enter Event Name**: "Web Development Bootcamp"
2. **Add Participants**:
   ```
   John Doe
   Jane Smith
   Mike Johnson
   ```
3. **Generate**: Click "Generate Certificates"
4. **Download**: ZIP file with PDFs

**Method 2: CSV Upload**
1. **Create CSV file** (`participants.csv`):
   ```csv
   John Doe
   Jane Smith
   Mike Johnson
   Sarah Wilson
   David Brown
   ```
2. **Upload CSV**: Use file upload form
3. **Generate**: Process batch
4. **Download**: ZIP with all certificates

#### D. Certificate Verification
1. **Get Certificate ID**: From generated certificate or QR code
2. **Navigate to**: http://localhost:3000/verify
3. **Enter ID**: Paste certificate UUID
4. **Verify**: Should show certificate details

### 🔧 API Testing with curl

#### Authentication
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "organization_name": "Test Org"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

#### Get Default Templates
```bash
curl -X GET http://localhost:3000/api/templates/defaults
```

#### Generate Certificates
```bash
# Get JWT token from login response first
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/api/certificates/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "event_name": "Test Event",
    "participant_names": ["John Doe", "Jane Smith"],
    "template_id": "template_id_from_templates_endpoint"
  }'
```

#### Verify Certificate
```bash
curl -X GET http://localhost:3000/api/verify/CERTIFICATE_UUID_HERE
```

### 🐛 Troubleshooting

#### Common Issues

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL is running
   sudo systemctl status postgresql
   
   # Check database exists
   sudo -u postgres psql -l | grep certificate_gen
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port 3000
   sudo lsof -i :3000
   
   # Kill process
   sudo kill -9 PID
   ```

3. **TypeScript Compilation Errors**
   ```bash
   # Check TypeScript installation
   npx tsc --version
   
   # Compile with verbose output
   npx tsc --noEmit
   ```

4. **Missing Dependencies**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### 📊 Expected Test Results

✅ **Successful Registration**: User created, JWT token received  
✅ **Template Loading**: 3 default templates available  
✅ **Certificate Generation**: PDF files created in ZIP  
✅ **QR Code**: Scannable QR code on certificates  
✅ **Verification**: Certificate details displayed correctly  
✅ **File Download**: ZIP file downloads properly  
✅ **Free Tier Limit**: Stops at 10 certificates for free users  

### 🧪 Advanced Testing

#### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test verification endpoint
ab -n 100 -c 10 http://localhost:3000/api/verify/valid-uuid-here
```

#### File Upload Testing
```bash
# Test large file upload
curl -X POST http://localhost:3000/api/templates/upload-logo \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@large_image.png"
```

### 📝 Test Checklist

- [ ] Database connection works
- [ ] Server starts without errors
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads
- [ ] Templates load correctly
- [ ] Certificate generation works (manual)
- [ ] Certificate generation works (CSV)
- [ ] PDF files are created
- [ ] QR codes are generated
- [ ] ZIP download works
- [ ] Certificate verification works
- [ ] API endpoints respond correctly
- [ ] Error handling works
- [ ] Free tier limits enforced

### 🚀 Next Steps After Testing

1. **Create Default Template Images**: Add actual template images to `public/images/default-templates/`
2. **Configure Production Database**: Set up production PostgreSQL
3. **SSL Configuration**: Add HTTPS for production
4. **Email Integration**: Add email notifications
5. **Payment Integration**: Add premium upgrade functionality
6. **Analytics**: Add usage tracking
7. **Rate Limiting**: Configure rate limits for API endpoints

The application should now be fully functional for testing! Let me know if you encounter any issues.
