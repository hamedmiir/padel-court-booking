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

## Next Steps

After confirming the project structure and seed data, the following will be implemented:

1. Authentication (NextAuth.js v5)
2. Server Actions for business logic
3. Payment adapter (mock implementation)
4. Admin Dashboard
5. Booking Flow UI

## Notes

- UI/UX is temporary and will be redesigned by a design team
- Business logic is strictly separated from UI components
- Minimal Tailwind CSS styling (wireframe-style only)
- Payment adapter is a mock implementation (will be replaced with Zarinpal/Shaparak)

# padel-court-booking
