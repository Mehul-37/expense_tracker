# 💸 SplitUp - Smart Expense Splitting App

> A modern, mobile-first expense tracking and bill splitting application built with React, TypeScript, and Supabase.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://hackathon-rho-nine.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## 🌐 Live Demo

**👉 [Try SplitUp Now](https://hackathon-rho-nine.vercel.app)**

---

## ✨ Features

### 💰 Core Functionality
| Feature | Description |
|---------|-------------|
| 📝 **Expense Tracking** | Log and categorize all your expenses |
| ✂️ **Bill Splitting** | Split bills equally or with custom amounts among group members |
| 🧮 **Smart Settlements** | Optimized debt simplification algorithm minimizes transactions |
| 👥 **Group Management** | Create and manage multiple expense groups (roommates, trips, events) |

### 🤖 AI-Powered Features
| Feature | Description |
|---------|-------------|
| 🎤 **Voice Input** | Add expenses using natural language voice commands |
| 🧠 **Smart Parsing** | Automatically extracts amount, description, and category from voice |

### 🎨 User Experience
| Feature | Description |
|---------|-------------|
| ⚡ **Real-time Sync** | Changes sync instantly across all devices |
| 🌙 **Dark/Light Theme** | Toggle between dark and light modes |
| 📱 **Mobile-First Design** | Optimized for mobile devices with responsive layouts |
| 📊 **Budget Tracking** | Set monthly budgets and track spending by category |
| 📥 **Export Data** | Export expenses to CSV for record keeping |

### 🔐 Authentication
| Feature | Description |
|---------|-------------|
| 🔵 **Google Sign-In** | Quick authentication with Google |
| ✉️ **Email/Password** | Traditional email-based authentication |
| 🎮 **Demo Mode** | Try the app without creating an account |

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br>React 19
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=vite" width="48" height="48" alt="Vite" />
<br>Vite
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br>Tailwind
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" />
<br>Supabase
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=vercel" width="48" height="48" alt="Vercel" />
<br>Vercel
</td>
</tr>
</table>

| Category | Technology |
|----------|------------|
| 🎨 **Frontend** | React 19, TypeScript, Vite |
| 💅 **Styling** | Tailwind CSS 4, Framer Motion |
| 🗃️ **State** | Zustand |
| 🔧 **Backend** | Supabase (PostgreSQL, Auth, Realtime) |
| 🤖 **AI** | Google Gemini API |
| 🧩 **UI Components** | Radix UI Primitives |
| 🚀 **Deployment** | Vercel |

---

## 📸 Screenshots

<details>
<summary>🖼️ Click to view screenshots</summary>

### 📊 Dashboard
The main dashboard shows your balance overview, recent expenses, and quick actions.

### 👥 Groups
Create and manage expense groups with friends, roommates, or travel companions.

### 📜 Activity
View all your expenses with search, filter, and export capabilities.

### 💵 Budget
Set and track monthly budgets across different spending categories.

</details>

---

## 🚀 Getting Started

### 📋 Prerequisites
- 📦 Node.js 18+
- 📦 npm or yarn
- 🔧 Supabase account (for backend)
- 🔧 Google Cloud account (for Gemini AI - optional)

### ⚙️ Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/Mehul-37/expense_tracker.git
cd expense_tracker

# 2️⃣ Install dependencies
npm install

# 3️⃣ Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4️⃣ Run the development server
npm run dev

# 5️⃣ Open the app
# Navigate to http://localhost:5173
```

### 🔑 Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## 📁 Project Structure

```
📦 src/
├── 🧩 components/       # Reusable UI components
│   ├── 📂 common/       # Shared components (Navigation, ThemeToggle)
│   ├── 📂 expense/      # Expense-related components
│   └── 📂 ui/           # Base UI primitives (Button, Card, Switch)
├── 🔌 contexts/         # React contexts (Auth)
├── 🪝 hooks/            # Custom React hooks
├── 📚 lib/              # Utility functions
├── 📄 pages/            # Page components
│   ├── Auth.tsx         # 🔐 Login/Signup page
│   ├── Dashboard.tsx    # 📊 Main dashboard
│   ├── Groups.tsx       # 👥 Groups list
│   ├── GroupDetail.tsx  # 📋 Single group view with settlements
│   ├── Activity.tsx     # 📜 Expense history
│   ├── Budget.tsx       # 💵 Budget management
│   └── Profile.tsx      # ⚙️ User settings
├── 🔧 services/         # API services (Supabase, AI)
├── 🗃️ store/            # Zustand state management
└── 📝 types/            # TypeScript type definitions
```

---

## 🧮 Key Algorithms

### 💡 Debt Simplification

The settlement feature uses a **greedy algorithm** to minimize the number of transactions needed to settle all debts:

```
┌─────────────────────────────────────────────────────────┐
│  1. 📊 Separate members into creditors (+) and debtors (-)  │
│  2. 📈 Sort both lists by amount (descending)               │
│  3. 🔄 Match largest creditor with largest debtor           │
│  4. 💰 Create transaction for min(creditor, debtor)         │
│  5. 🔁 Repeat until all debts are settled                   │
└─────────────────────────────────────────────────────────┘
```

> This reduces **O(n²)** potential transactions to at most **O(n-1)** transactions.

---

## 🔌 API Integrations

### 🟢 Supabase
- 🔐 **Authentication** - Email/password and OAuth providers
- 🗄️ **Database** - PostgreSQL for storing users, groups, expenses
- ⚡ **Realtime** - Live updates when expenses are added/modified

### 🤖 Google Gemini AI
- 🎤 **Voice Parsing** - Converts natural language to structured expense data
- 🏷️ **Smart Categorization** - Automatically categorizes expenses based on description

---

## 👨‍💻 Team

Built with ❤️ for hackathon submission.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

### 🌟 Star this repo if you found it helpful!

**[🚀 Live Demo](https://hackathon-rho-nine.vercel.app)** • **[🐛 Report Bug](https://github.com/Mehul-37/expense_tracker/issues)** • **[💡 Request Feature](https://github.com/Mehul-37/expense_tracker/issues)**

</div>
