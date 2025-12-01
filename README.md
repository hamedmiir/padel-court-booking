# Padel Court Reservation System - MVP

A fully functional MVP for a Padel Court Reservation System built with Next.js 14+, TypeScript, PostgreSQL, and Prisma.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js v5 (Credentials Provider)
- **Date Handling:** date-fns
- **Validation:** Zod
- **Styling:** Tailwind CSS (minimal wireframe-style)

## Project Structure

```
padel-court-booking/
├── app/
│   ├── actions/          # Server Actions
│   │   ├── auth.ts       # Authentication logic
│   │   ├── booking.ts    # Booking operations
│   │   └── court.ts      # Court management (Admin)
│   ├── api/              # API routes (if needed)
│   └── ...               # Pages and layouts
├── lib/
│   ├── payment.ts        # Payment adapter (mock for MVP)
│   └── prisma.ts         # Prisma client instance
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed script
└── components/           # UI Components (separated from logic)
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database
2. Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/padel_court_booking?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

### 3. Initialize Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

## Seed Data

The seed script creates:
- **1 Admin User:**
  - Email: `admin@padel.com`
  - Password: `admin123`
  - Role: `ADMIN`

- **2 Courts:**
  - Court 1 (Base price: 100.0 per hour)
  - Court 2 (Base price: 100.0 per hour)

- **1 Pricing Rule:**
  - Court 1: Peak hours (18:00-23:00) with 1.5x multiplier

## Database Schema

- **User:** Users with roles (USER/ADMIN)
- **Court:** Court information with base pricing
- **PricingRule:** Dynamic pricing rules (time-based multipliers)
- **Booking:** Reservations with status tracking

## Features Implemented

✅ **Authentication System**
- User registration and login
- NextAuth.js v5 with Credentials Provider
- Role-based access control (USER/ADMIN)

✅ **Booking System**
- Court selection and date picker
- Available time slots display with dynamic pricing
- Booking creation with payment processing (mock)
- User booking management (view and cancel)

✅ **Admin Dashboard**
- View all bookings
- Add new courts
- Manage pricing rules (time-based multipliers)

✅ **Business Logic**
- Availability calculation with overlap detection
- Dynamic pricing based on time rules
- Payment adapter (mock - ready for Zarinpal/Shaparak integration)

## UI/UX Features

- **RTL Support:** Full right-to-left layout for Persian language
- **Mobile-First Design:** Optimized for mobile devices (max-width: 28rem)
- **Wireframe Styling:** Minimal Tailwind CSS (borders, grids, padding only)
- **Business Logic Separation:** All logic in Server Actions, hooks, and utils

## Pages

- `/` - Home (redirects based on role)
- `/login` - Login page
- `/register` - Registration page
- `/book` - Booking page (user)
- `/my-bookings` - User's bookings
- `/admin` - Admin dashboard

## Notes

- UI/UX is temporary and will be redesigned by a design team
- Business logic is strictly separated from UI components
- Minimal Tailwind CSS styling (wireframe-style only)
- Payment adapter is a mock implementation (will be replaced with Zarinpal/Shaparak)
- Mobile-first design: Even on desktop, the page is constrained to mobile width
- All text is in Persian (Farsi) with RTL support
