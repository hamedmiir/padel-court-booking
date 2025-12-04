# MVP Refactor Summary

## Overview
The application has been refactored to match the MVP requirements for Padel Hub. The codebase has been simplified, removing over-engineered features and focusing on core functionality.

## Key Changes

### 1. Database Schema (`prisma/schema.prisma`)
- **Removed**: Wallet, WalletTransaction models
- **Updated User model**:
  - Removed `password` field (OTP-based auth)
  - Added: `family`, `dateOfBirth`, `gender`, `height`, `photo`
  - Added: `emailVerified`, `phoneVerified`
  - Phone is now primary identifier
- **Added City model**: For city-based club organization
- **Updated Court model**:
  - Changed `sportType` to `type` (OPEN, CLOSE, SALON)
  - Court must belong to a SportsClub
- **Simplified Booking model**:
  - Removed wallet-related fields
  - Removed complex cancellation statuses
  - Kept invitation system (1-3 participants)
- **Added OtpCode model**: For OTP verification

### 2. Authentication System
- **Replaced password auth with OTP**:
  - `app/actions/otp.ts`: Send and verify OTP codes
  - `auth.ts`: Updated to use userId-based credentials
  - `components/LoginForm.tsx`: New OTP-based login flow
- **Registration**: Now handled through OTP (no separate register page)

### 3. Booking System
- **Simplified booking flow**:
  - City → Club → Court selection
  - 4-week calendar view (using HijriDatePicker)
  - Invitation system: 1-3 participants
  - Gateway payment only (no wallet)
- **Booking editing**:
  - Remove/invite participants
  - Change time (6 hours before game)
  - Cancel based on policy
- **Removed**: Matchmaking, wallet payments, complex cancellation workflow

### 4. UI Components
- **Mobile-only design**: Simplified, responsive components
- **Removed**: Wallet pages, complex dashboards
- **Updated Navigation**: Removed wallet and find-players links
- **BookingPageClient**: New simplified flow with city/club/court selection
- **MyBookingsClient**: Shows upcoming/past bookings with edit capabilities

### 5. Removed Files
- `app/wallet/page.tsx`
- `components/WalletChargeModal.tsx`
- `components/WalletClient.tsx`
- Wallet-related actions (kept in codebase but not used)

## Next Steps

### 1. Database Migration
```bash
# Create and apply migration
npx prisma migrate dev --name mvp_refactor

# Or if you want to reset (WARNING: deletes all data)
npx prisma migrate reset
```

### 2. Seed Data
Update `prisma/seed.ts` to:
- Create cities
- Create sports clubs with cities
- Create courts with clubs
- Remove wallet-related seed data

### 3. Environment Variables
Ensure `.env` has:
```
DATABASE_URL="your_database_url"
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. OTP Service Integration
Currently, OTP is mocked (logged to console). For production:
- Integrate SMS service (e.g., Kavenegar, SMS.ir)
- Integrate email service (e.g., SendGrid, Mailgun)
- Update `app/actions/otp.ts` `sendOtp` function

### 5. Payment Gateway Integration
Currently using mock payment. For production:
- Integrate Iranian payment gateway (Zarinpal, Shaparak)
- Update `lib/payment.ts` `initiatePayment` function

### 6. SMS Notifications
Add SMS notifications for:
- Booking confirmation
- Invitation sent
- Booking changes
- Cancellation

### 7. Profile Page
Update `app/profile/page.tsx` and create profile component with:
- Photo upload
- All user fields (name, family, email, phone, dateOfBirth, gender, height)
- Delete account option

### 8. Admin/Field Owner Dashboards
Simplify or remove if not needed for MVP:
- Remove complex cancellation verification
- Simplify court/club management
- Basic booking management

## Features Implemented

✅ OTP-based authentication
✅ City/Club/Court selection
✅ 4-week calendar booking
✅ Invitation system (1-3 participants)
✅ Booking editing (remove/invite, change time, cancel)
✅ Gateway payment
✅ Mobile-only UI
✅ Hijri calendar integration

## Features Removed/Simplified

❌ Wallet system
❌ Matchmaking
❌ Complex cancellation workflow
❌ Password authentication
❌ Field owner verification workflow (simplified)

## Notes

- The codebase is now MVP-focused and simpler
- All wallet-related code has been removed from UI
- Booking flow is streamlined
- Mobile-first design
- Ready for production after OTP and payment gateway integration

