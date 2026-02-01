# SplitUp - Smart Expense Splitting App

A modern, mobile-first expense tracking and bill splitting application built with React, TypeScript, and Supabase.

## Live Demo

**[View Live App](https://hackathon-rho-nine.vercel.app)**

## Features

### Core Functionality
- **Expense Tracking** - Log and categorize all your expenses
- **Bill Splitting** - Split bills equally or with custom amounts among group members
- **Smart Settlements** - Optimized debt simplification algorithm minimizes the number of transactions needed
- **Group Management** - Create and manage multiple expense groups (roommates, trips, events)

### AI-Powered Features
- **Voice Input** - Add expenses using natural language voice commands (powered by Google Gemini AI)
- **Smart Parsing** - Automatically extracts amount, description, and category from voice input

### User Experience
- **Real-time Sync** - Changes sync instantly across all devices using Supabase real-time
- **Dark/Light Theme** - Toggle between dark and light modes
- **Mobile-First Design** - Optimized for mobile devices with responsive layouts
- **Budget Tracking** - Set monthly budgets and track spending by category
- **Export Data** - Export expenses to CSV for record keeping

### Authentication
- **Google Sign-In** - Quick authentication with Google
- **Email/Password** - Traditional email-based authentication
- **Demo Mode** - Try the app without creating an account

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, Framer Motion |
| State Management | Zustand |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| AI | Google Gemini API |
| UI Components | Radix UI Primitives |
| Deployment | Vercel |

## Screenshots

<details>
<summary>View Screenshots</summary>

### Dashboard
The main dashboard shows your balance overview, recent expenses, and quick actions.

### Groups
Create and manage expense groups with friends, roommates, or travel companions.

### Activity
View all your expenses with search, filter, and export capabilities.

### Budget
Set and track monthly budgets across different spending categories.

</details>

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for backend)
- Google Cloud account (for Gemini AI - optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mehul-37/expense_tracker.git
   cd expense_tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file based on `.env.example`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**

   Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/       # Shared components (Navigation, ThemeToggle)
│   ├── expense/      # Expense-related components
│   └── ui/           # Base UI primitives (Button, Card, Switch)
├── contexts/         # React contexts (Auth)
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── pages/            # Page components
│   ├── Auth.tsx      # Login/Signup page
│   ├── Dashboard.tsx # Main dashboard
│   ├── Groups.tsx    # Groups list
│   ├── GroupDetail.tsx # Single group view with settlements
│   ├── Activity.tsx  # Expense history
│   ├── Budget.tsx    # Budget management
│   └── Profile.tsx   # User settings
├── services/         # API services (Supabase, AI)
├── store/            # Zustand state management
└── types/            # TypeScript type definitions
```

## Key Algorithms

### Debt Simplification
The settlement feature uses a greedy algorithm to minimize the number of transactions needed to settle all debts within a group:

1. Separate members into creditors (positive balance) and debtors (negative balance)
2. Sort both lists by amount (descending)
3. Match largest creditor with largest debtor
4. Create a transaction for the minimum of both amounts
5. Repeat until all debts are settled

This reduces an O(n²) number of potential transactions to at most O(n-1) transactions.

## API Integrations

### Supabase
- **Authentication** - Email/password and OAuth providers
- **Database** - PostgreSQL for storing users, groups, expenses
- **Realtime** - Live updates when expenses are added/modified

### Google Gemini AI
- **Voice Parsing** - Converts natural language to structured expense data
- **Smart Categorization** - Automatically categorizes expenses based on description

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Team

Built for hackathon submission.

## License

This project is open source and available under the [MIT License](LICENSE).

---

**[View Live Demo](https://hackathon-rho-nine.vercel.app)** | **[Report Bug](https://github.com/Mehul-37/expense_tracker/issues)**
