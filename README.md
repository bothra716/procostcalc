# 🏭 Costing & Inventory Management System

A comprehensive, production-ready business management system for costing, inventory tracking, and sales management with special support for Indian businesses and GST compliance.

## ✨ Features

### 🎯 Core Modules
- **👤 User Management**: Complete authentication system with JWT tokens
- **🏢 Business Profile**: Country-aware setup with India-specific GST validation
- **📦 Products Management**: Advanced product costing with materials, job work, and additional costs
- **📊 Inventory Tracking**: Real-time stock movements, sales recording, and low stock alerts
- **💰 Overheads Management**: Categorized expense tracking with analytics and trends
- **📈 Reports**: Professional PDF/Excel export for cost analysis and profitability reports
- **📱 Dashboard**: Interactive KPIs, trends, and quick access to key functions
- **⚙️ Settings**: Comprehensive user and application preferences

### 🌟 Key Features
- **🌍 Multi-country Support**: Special handling for India with state codes and GST validation
- **🔍 GST Integration**: Real-time GSTIN validation with checksum verification
- **📄 Document Verification**: OCR-based document processing pipeline
- **📊 Real-time Analytics**: Profit margins, cost breakdowns, and trend analysis
- **📦 Smart Stock Management**: Automated stock tracking with sales integration
- **📋 Professional Reports**: PDF and Excel report generation
- **📱 Responsive Design**: Mobile-first design for all devices
- **🔒 Enterprise Security**: JWT authentication, rate limiting, and data validation
- **☁️ Cloud Ready**: AWS S3 integration for file storage
- **🐳 Docker Support**: Complete containerization for easy deployment

## 🛠 Technology Stack

### Backend
- **Node.js 18+** with Express.js
- **PostgreSQL 15+** with advanced indexing
- **JWT** authentication with refresh tokens
- **AWS S3** for file storage and CDN
- **PDFKit** and **ExcelJS** for report generation
- **Sharp** for image processing
- **Winston** for logging
- **Joi** for validation

### Frontend
- **React 18** with modern hooks
- **React Router** for navigation
- **React Query** for state management
- **React Hook Form** for form handling
- **Tailwind CSS** for styling
- **React Icons** for iconography
- **DatePicker** for date selection
- **Toast notifications** for user feedback

### DevOps & Deployment
- **Docker** containerization
- **Docker Compose** for orchestration
- **Nginx** reverse proxy
- **PostgreSQL** database
- **Redis** for caching (optional)
- **AWS S3** for file storage

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd costing-inventory-system

# Run automated setup
npm run setup

# Follow the setup instructions
```

### Option 2: Manual Setup

1. **Prerequisites**
   ```bash
   # Install Node.js 18+
   # Install PostgreSQL 15+
   # Install Docker (optional)
   ```

2. **Install Dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client && npm install && cd ..
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb costing_system
   
   # Run migrations
   npm run migrate
   
   # Seed with sample data (optional)
   npm run seed
   ```

5. **Start Development**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run server  # Backend only
   npm run client  # Frontend only
   ```

6. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

## 🐳 Docker Deployment

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production
```bash
# Deploy with production configuration
./deploy.sh prod deploy

# Or on Windows
deploy.bat prod deploy
```

## 📊 Business Logic

### 💰 Cost Calculation Engine
```
Product Cost = Materials + Job Work + Additional Costs
Net Cost = Product Cost - Scrap Value
Profit Margin = (Selling Price - Net Cost) / Selling Price × 100
```

### 📦 Stock Management
```
Current Stock = Opening Stock + Stock In - Stock Out
Low Stock Alert = Current Stock ≤ Threshold
Suggested Production = Average Daily Sales × 7 - Current Stock
```

### 🇮🇳 India-Specific Features
- **GST Validation**: Real-time GSTIN format and checksum validation
- **State Mapping**: Automatic state selection from GSTIN
- **Document Verification**: OCR-based PAN and GST certificate processing
- **Compliance**: Built-in GST reporting and compliance features

## 🔧 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get user profile
- `POST /api/auth/logout` - Logout

### Business Profile
- `POST /api/business-profile` - Create/update business profile
- `GET /api/business-profile` - Get business profile
- `GET /api/business-profile/states/india` - Get Indian states
- `POST /api/business-profile/validate-gstin` - Validate GSTIN

### Products
- `GET /api/products` - List products with pagination
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/materials` - Add material
- `POST /api/products/:id/job-work` - Add job work
- `POST /api/products/:id/additional-costs` - Add additional cost

### Stock & Sales
- `GET /api/stock/movements/:productId` - Get stock movements
- `POST /api/stock/movements` - Record stock movement
- `GET /api/stock/sales/:productId` - Get sales history
- `POST /api/stock/sales` - Record sale
- `GET /api/stock/alerts/low-stock` - Get low stock alerts
- `GET /api/stock/summary` - Get stock summary

### Overheads
- `GET /api/overheads` - List overheads with filtering
- `POST /api/overheads` - Create overhead
- `PUT /api/overheads/:id` - Update overhead
- `DELETE /api/overheads/:id` - Delete overhead
- `GET /api/overheads/analytics` - Get analytics

### Reports
- `GET /api/reports/product-cost/:productId` - Product cost report
- `GET /api/reports/overheads` - Overheads report
- `GET /api/reports/profitability` - Profitability analysis

### File Upload
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `POST /api/upload/logo` - Upload business logo
- `POST /api/upload/receipt` - Upload receipt
- `DELETE /api/upload/:key` - Delete file

## 🗄 Database Schema

### Core Tables
- **users** - User accounts and authentication
- **business_profiles** - Business information with country-specific fields
- **products** - Product master data
- **product_materials** - Product material costs
- **product_job_work** - Job work costs
- **product_additional_costs** - Additional costs
- **overheads** - Business overhead expenses
- **stock_movements** - Stock in/out/adjustment records
- **sales** - Sales transactions
- **document_verifications** - Document verification pipeline

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Password Hashing** using bcrypt with salt rounds
- **Input Validation** using Joi schemas
- **Rate Limiting** to prevent abuse
- **CORS Protection** with configurable origins
- **SQL Injection Prevention** using parameterized queries
- **File Upload Security** with type and size validation
- **Environment-based Configuration** for different deployments

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "Authentication"
npm test -- --grep "Products"

# Run with coverage
npm run test:coverage
```

## 📱 Mobile Support

The system is fully responsive and works on:
- 📱 Mobile phones (iOS/Android)
- 📱 Tablets (iPad/Android tablets)
- 💻 Desktop computers
- 🖥 Large screens

## 🌐 Internationalization

Supported languages:
- 🇺🇸 English
- 🇮🇳 Hindi
- 🇮🇳 Tamil
- 🇮🇳 Telugu
- 🇮🇳 Bengali
- 🇮🇳 Gujarati
- 🇮🇳 Kannada
- 🇮🇳 Malayalam
- 🇮🇳 Marathi
- 🇮🇳 Odia
- 🇮🇳 Punjabi
- 🇮🇳 Urdu

## 🚀 Deployment Options

### 1. Docker Compose (Recommended)
```bash
docker-compose up -d
```

### 2. Manual Deployment
```bash
# Build and start
npm run build
npm start
```

### 3. Cloud Deployment
- **AWS**: EC2 + RDS + S3
- **Google Cloud**: Compute Engine + Cloud SQL + Cloud Storage
- **Azure**: App Service + SQL Database + Blob Storage
- **DigitalOcean**: Droplets + Managed Database + Spaces

## 📈 Performance Features

- **Database Indexing** for fast queries
- **Query Optimization** with proper joins
- **Caching** with Redis (optional)
- **Image Optimization** with Sharp
- **Lazy Loading** for large datasets
- **Pagination** for all list endpoints
- **Compression** with gzip

## 🔧 Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=costing_system
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Server
PORT=5000
NODE_ENV=production
CLIENT_URL=http://localhost:3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@costingsystem.com
- 📚 Documentation: [docs.costingsystem.com](https://docs.costingsystem.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/costing-system/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/costing-system/discussions)

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js team for the robust backend framework
- PostgreSQL team for the reliable database
- All open-source contributors who made this possible

---

**Made with ❤️ for businesses worldwide**
