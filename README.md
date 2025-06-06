# Freelance Tracker

A complete internal project management system for solo freelance software developers. Track the entire lifecycle from client acquisition, through quotation, project execution, AI messaging costs, manual tasks, payments, and profitability analysis.

## 🚀 Features

### 👤 Client Management
- Store client information (name, contact, email, phone)
- Track multiple quotes per client
- Client relationship history

### 📄 Quotation Workflow
- Create detailed quotes with estimates and requirements
- Track lead sources (Fiverr, LinkedIn, Workana, etc.)
- Quote acceptance wizard that creates projects
- Status tracking: Quoted → Accepted/Rejected

### 🚧 Project Management
- Real project tracking with start/end dates
- GitHub integration for issues and milestones
- Baseline vs. extra scope tracking
- Progress monitoring with payment and AI usage indicators

### 🧠 AI Message Tracking
- Track AI message usage per GitHub issue
- Cost calculation based on per-message rates
- Usage vs. estimate monitoring with alerts

### 💰 Financial Management
- Payment tracking with multiple methods
- Manual task and expense recording
- Automatic profitability calculations
- Monthly income reporting

### ⚠️ Smart Alerts
- No payment after 5+ days
- AI message usage exceeding estimates
- Project deadline monitoring
- High usage warnings (80%+ of estimate)

### 📊 Reports & Analytics
- Project profitability analysis
- AI vs. manual work ratios
- Monthly AI usage reports
- CSV exports for all data

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Radix UI (Shadcn/ui)
- **GitHub Integration**: Octokit
- **Deployment**: Docker

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- GitHub Personal Access Token (for repository integration)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd freelance-tracker
npm install
```

### 2. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://freelancer:secure_password_123@localhost:5432/freelance_tracker"
GITHUB_TOKEN="your_github_personal_access_token_here"
NODE_ENV="development"
```

### 3. Database Setup

Generate Prisma client and push schema:
```bash
npm run db:generate
npm run db:push
```

Seed with sample data:
```bash
npm run db:seed
```

### 4. Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Start PostgreSQL and the app
docker-compose up -d

# Run database migrations
docker-compose exec app npm run db:push
docker-compose exec app npm run db:seed
```

### Production Docker Build

```bash
# Build the image
docker build -t freelance-tracker .

# Run with external PostgreSQL
docker run -p 3000:3000 \
  -e DATABASE_URL="your_production_db_url" \
  -e GITHUB_TOKEN="your_github_token" \
  freelance-tracker
```

## 📖 Usage Guide

### Creating Your First Quote

1. **Add a Client**: Go to Clients → Add New Client
2. **Create Quote**: Clients → Select Client → New Quote
3. **Fill Details**: Add project requirements, estimates, lead source
4. **Accept Quote**: Use the "Accept Quote" button to start a project

### Project Setup with GitHub

1. **Accept Quote**: This creates a project automatically
2. **GitHub Integration**: In project details, add GitHub repository URL
3. **Import Issues**: System imports existing issues as baseline
4. **Track Progress**: New issues created after import are marked as "extra"

### Recording AI Usage

1. **Navigate to Project**: Projects → Select Active Project
2. **Find Issue**: View project issues list
3. **Add AI Messages**: Click "Add AI Usage" on any issue
4. **Enter Details**: Number of messages used and date

### Payment Tracking

1. **Project Payments**: Projects → Select Project → Payments Tab
2. **Add Payment**: Record amount, date, method, and notes
3. **Progress Tracking**: Payment progress automatically calculated

### Generating Reports

1. **Reports Section**: Navigate to Reports in sidebar
2. **Choose Report Type**:
   - Project Profitability
   - AI vs Manual Work Ratios
   - Monthly AI Usage
3. **Export CSV**: Download data for external analysis

## 🔧 Database Schema

The system uses the following main entities:

- **Clients**: Customer information and contact details
- **Quotes**: Project estimates and requirements
- **Projects**: Active work with GitHub integration
- **Issues**: GitHub issues with AI usage tracking
- **Milestones**: Project organization from GitHub
- **AI Messages**: Usage tracking with cost calculation
- **Payments**: Financial transaction records
- **Manual Tasks**: Non-AI work tracking
- **Extra Expenses**: Additional project costs
- **Alerts**: Automated notifications

## 🔐 Security Notes

- This is a **single-user system** - no authentication required
- Keep your GitHub token secure and with minimal required permissions
- Use environment variables for all sensitive configuration
- Regular database backups recommended for production use

## 📝 Scripts Reference

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:seed         # Seed with sample data
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database (destructive)

# Docker
docker-compose up       # Start with PostgreSQL
docker build .          # Build production image
```

## 🤝 Contributing

This is a personal project template. Feel free to fork and customize for your own freelance business needs.

## 📄 License

MIT License - feel free to use this for your own freelance business!