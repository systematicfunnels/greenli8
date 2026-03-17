

# 🌿 greenli8

> **AI-Powered Business Idea Validator**
> 
> Validate your startup ideas in seconds using advanced AI analysis powered by Google's Gemini API.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-greenli8.vercel.app-00D084?style=for-the-badge&logo=vercel)](https://greenli8.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.2.1-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.4.1-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Database Setup](#database-setup)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## 🎯 About

**greenli8** is a full-stack AI Studio application that helps entrepreneurs and innovators validate their business ideas instantly. By leveraging Google's Gemini AI, greenli8 analyzes ideas for market potential, feasibility, and competitive advantage—all in seconds.

Whether you're a startup founder, product manager, or entrepreneur, greenli8 provides intelligent, data-driven validation to help you make better decisions faster.

### Key Statistics
- ⚡ AI validation in **< 10 seconds**
- 🎨 Clean, intuitive UI
- 🔒 Secure authentication with Google OAuth
- 💳 Integrated payment processing
- 📧 Email notifications
- 📄 PDF export of analysis

---

## ✨ Features

### 🤖 AI-Powered Validation
- Advanced idea analysis using Google Gemini AI
- Multi-factor evaluation framework
- Real-time validation feedback
- Detailed insights and recommendations

### 🔐 Security & Authentication
- Google OAuth integration
- JWT-based session management
- Bcrypt password hashing
- Rate limiting & DDoS protection (Helmet, express-rate-limit)
- CORS configuration

### 💳 Monetization
- Stripe payment integration
- Credit-based system
- Flexible pricing tiers
- Subscription management

### 📊 User Features
- PDF export of analysis reports
- History tracking of validations
- User dashboard
- Email notifications via Resend
- Responsive design (Mobile + Desktop)

### 🛠️ Developer Features
- Full TypeScript codebase
- Modular component architecture
- API testing with Vitest
- Hot-reload development server
- Production-optimized build

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.4 | UI Framework |
| **TypeScript** | 5.8.2 | Type-safe development |
| **Vite** | 6.4.1 | Build tool & dev server |
| **Tailwind CSS** | 3.4.17 | Styling |
| **React Markdown** | 9.0.1 | Markdown rendering |
| **Lucide React** | 0.563.0 | Icon library |
| **html2canvas** | 1.4.1 | Screenshot/PDF support |
| **jsPDF** | 4.1.0 | PDF generation |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Express** | 5.2.1 | Web framework |
| **Prisma** | 6.19.2 | ORM & database |
| **Node.js** | 22.x | Runtime |
| **TypeScript** | 5.8.2 | Type safety |

### AI & Services
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Google Genai** | 1.40.0 | Gemini AI API |
| **google-auth-library** | 10.5.0 | Authentication |
| **Stripe** | 20.3.1 | Payment processing |
| **Resend** | 6.9.1 | Email delivery |

### Security & Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| **Helmet** | 8.1.0 | Security headers |
| **bcryptjs** | 3.0.3 | Password hashing |
| **jsonwebtoken** | 9.0.3 | JWT creation |
| **express-rate-limit** | 8.2.1 | Rate limiting |
| **Zod** | 4.3.6 | Schema validation |
| **CORS** | 2.8.6 | Cross-origin requests |

### Development & Testing
| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.0.18 | Testing framework |
| **Supertest** | 7.2.2 | HTTP testing |
| **Concurrently** | 9.2.1 | Run multiple scripts |
| **TSX** | 4.21.0 | TypeScript execution |

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 22.x or higher - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Google API Key** - [Get your Gemini API key](https://ai.google.dev/)
- **Database** - PostgreSQL, MySQL, or SQLite (configured in Prisma)
- **Stripe Account** (optional) - For payments - [Sign up here](https://stripe.com)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/systematicfunnels/greenli8.git
   cd greenli8
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   > The postinstall script will automatically run `prisma generate`

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables** (see [Configuration](#configuration) section below)

5. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000

---

## 💻 Running Locally

### Development Server

Run both frontend and backend concurrently:

```bash
npm run dev
```

This will start:
- Vite development server (frontend) on port 5173
- Express server (backend) on port 3000

### Frontend Only

```bash
npm run frontend
```

### Backend Only

```bash
npm run backend
```

### Production Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
npm test
```

Tests use Vitest and Supertest for API testing.

---

## 📁 Project Structure

```
greenli8/
├── api/                          # API route handlers
├─��� components/                   # React components
│   ├── IdeaValidator.tsx        # Main validation component
│   ├── ResultsDisplay.tsx       # Results visualization
│   └── ...
├── config/                       # Configuration files
├── context/                      # React context providers
├── services/                     # Business logic & utilities
│   ├── geminiService.ts         # Gemini API integration
│   ├── authService.ts           # Authentication logic
│   ├── stripeService.ts         # Payment processing
│   └── ...
├── views/                        # Page components
│   ├── Dashboard.tsx
│   ├── Validator.tsx
│   └── ...
├── prisma/                       # Database schema
│   ├── schema.prisma
│   └── migrations/
├── public/                       # Static assets
├── src/                          # Main source directory
├── scripts/                      # Utility scripts
├── App.tsx                       # Root component
├── index.html                    # HTML entry point
├── server.ts                     # Express server
├── types.ts                      # TypeScript type definitions
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.cjs           # Tailwind CSS config
├── package.json                  # Dependencies
├── .env.example                  # Environment variables example
└── README.md                     # This file
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Google Gemini API
GEMINI_API_KEY=your_api_key_here

# Database (Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/greenli8

# Authentication
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (Email Service)
RESEND_API_KEY=your_resend_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,https://greenli8.vercel.app
```

### .env.example

Refer to the provided [.env.example](.env.example) file for all available environment variables.

---

## 📊 Database Setup

### Initialize Database

```bash
npx prisma migrate dev
```

This will:
- Create the database
- Run pending migrations
- Generate Prisma client

### View Database

```bash
npx prisma studio
```

Opens a web UI to browse and manage your database.

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### API Testing

The project includes example tests in `server.test.js`:
- POST /api/validate - Idea validation endpoint
- GET /api/results/:id - Fetch validation results
- POST /api/stripe/webhook - Stripe webhook handling

---

## 🌐 Deployment

### Deploy on Vercel (Recommended)

greenli8 is optimized for Vercel deployment.

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your greenli8 repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.example`
   - Key variables:
     - `GEMINI_API_KEY`
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `STRIPE_SECRET_KEY`
     - `RESEND_API_KEY`

4. **Deploy**
   ```bash
   npm run build
   ```
   - Vercel will automatically deploy on push to `main`

### Alternative Deployment Options

#### Docker Deployment
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.ts"]
```

#### Railway / Heroku / Fly.io / AWS
- All support Node.js applications
- Configure environment variables in their dashboards
- Push and deploy automatically

---

## 🔌 API Integration Guide

### Google Gemini API

#### Setup

1. Get API key from [Google AI Studio](https://ai.google.dev/)
2. Add to `.env.local`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

#### Usage Example

```typescript
import { GoogleGenerativeAI } from "@google/genai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const result = await model.generateContent({
  contents: [
    {
      role: "user",
      parts: [
        {
          text: "Validate this business idea: " + userIdea
        }
      ]
    }
  ]
});
```

### Stripe Integration

#### Setup

1. Create account at [stripe.com](https://stripe.com)
2. Get keys from Dashboard → API Keys
3. Add to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

#### Webhook Configuration

Add Stripe webhook endpoint to your Stripe Dashboard:
```
https://greenli8.vercel.app/api/stripe/webhook
```

### Email Service (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Get API key
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=your_resend_api_key
   ```

---

## 🤝 Contributing

We welcome contributions! Follow these steps:

### Fork & Clone
```bash
git clone https://github.com/your-username/greenli8.git
cd greenli8
```

### Create Feature Branch
```bash
git checkout -b feature/amazing-feature
```

### Make Changes
- Follow TypeScript strict mode
- Use Tailwind CSS for styling
- Keep components modular
- Write tests for new features

### Commit Changes
```bash
git add .
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

### Create Pull Request
1. Go to GitHub repository
2. Click "New Pull Request"
3. Describe your changes
4. Wait for review

### Code Standards
- **Language**: TypeScript (strict mode)
- **Formatting**: Prettier auto-format
- **Linting**: ESLint
- **Testing**: Vitest for unit tests
- **Components**: Functional + hooks

---

## 📄 License

This project currently has **no license specified**.

> **Note**: Before using greenli8 commercially, clarify the licensing terms with the repository owner.

---

## 📞 Support & Contact

### Report Issues
- 🐛 [Open a GitHub Issue](https://github.com/systematicfunnels/greenli8/issues)
- Describe the problem clearly
- Include error messages and screenshots
- Provide reproduction steps

### Get Help
- 📖 [View Discussions](https://github.com/systematicfunnels/greenli8/discussions)
- 💬 Ask questions in discussions
- Share ideas and feedback

### Contact
- **Repository**: https://github.com/systematicfunnels/greenli8
- **Live Demo**: https://greenli8.vercel.app
- **Owner**: [@systematicfunnels](https://github.com/systematicfunnels)

---

## 🔗 Resources & Documentation

### Framework Documentation
- [React 19 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Express.js Docs](https://expressjs.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### AI & External Services
- [Google Gemini API](https://ai.google.dev/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Email API](https://resend.com/docs)
- [Google OAuth](https://developers.google.com/identity)

### Database & ORM
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Studio](https://www.prisma.io/studio)

### Testing & Quality
- [Vitest Documentation](https://vitest.dev/)
- [Supertest Guide](https://github.com/visionmedia/supertest)

---

## 🎉 Quick Start Checklist

- [ ] Clone repository
- [ ] Install Node.js 22.x+
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Get Gemini API key
- [ ] Set up database (PostgreSQL/MySQL/SQLite)
- [ ] Run `npx prisma migrate dev`
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Test the app locally
- [ ] Deploy to Vercel (optional)

---

<div align="center">

## Made with ❤️ by systematicfunnels

**[⭐ Star on GitHub](https://github.com/systematicfunnels/greenli8)** • **[🚀 Try the Demo](https://greenli8.vercel.app)**

Questions? [Open an Issue](https://github.com/systematicfunnels/greenli8/issues) or [Start a Discussion](https://github.com/systematicfunnels/greenli8/discussions)

</div>
