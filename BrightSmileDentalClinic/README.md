# BrightSmile Dental Clinic Appointment System

A React Native mobile app with Admin, Doctor, and Patient roles. It uses a local SQLite database through Expo SQLite. The welcome screen includes an Account dropdown at the upper-right; tap it to choose Patient, Doctor, or Admin before signing in. The clinic banner image is included in `assets/clinic-banner.jpg`.

## Included features

### Admin / Clinic Owner
- Dashboard menu
- View all appointments and filter by Scheduled, Completed, and Cancelled
- Add dentist accounts
- View, activate/deactivate, and delete dentists
- View appointment availability by date for each dentist

### Doctor
- Doctor login
- View only appointments assigned to their own account
- View patient name, address, age, contact email, concern, date, and time
- Add appointment notes
- Mark appointments Completed or Cancelled

### Patient
- Sign up and log in
- Register profile details: name, address, sex, age
- Choose a dentist and date
- View 30-minute slots for that dentist's shift
- Book and receive a booking reference
- View appointment history and cancel a scheduled appointment

### Booking rules
- A slot is unique by dentist + date + time.
- Different dentists can accept bookings on the same date/time if their shifts overlap (the sample shifts do not overlap).
- Cancelled appointments release the slot.
- Completed appointments keep their slot occupied in the booking history.
- Past dates and times outside a dentist's shift are rejected.
- The database performs a duplicate check before saving.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@brightsmile.com | admin123 |
| Doctor 1 (Morning) | maria@brightsmile.com | doctor123 |
| Doctor 2 (Afternoon) | john@brightsmile.com | doctor123 |
| Doctor 3 (Night) | angela@brightsmile.com | doctor123 |

Create patient accounts from the Sign up button.

## Requirements

- Node.js LTS
- npm
- Expo Go on an Android/iPhone for easiest mobile testing
- A computer and phone on the same Wi-Fi network (or use the Expo tunnel option)

## Run the app

1. Extract the ZIP file.
2. Open the extracted `BrightSmileDentalClinic` folder in VS Code or a terminal.
3. Run:

   ```bash
   npm install
   ```

4. Install the compatible Expo SQLite package:

   ```bash
   npx expo install --fix
   npx expo install expo-sqlite expo-status-bar
   ```

5. Start Expo:

   ```bash
   npx expo start --tunnel -c
   ```

6. Install Expo Go on your phone and scan the QR code shown in the terminal/browser.
7. Keep the computer and phone connected to the same network. If the QR connection does not work, run `npx expo start --tunnel`.

## Important notes

- This is a local-development starter project. SQLite data is stored on the device where the app runs.
- On a real phone, the Admin, Doctors, and Patients each have a separate local database. They will NOT see each other's bookings across different phones yet.
- To deploy for real multi-user use, replace local SQLite with a shared online backend/API and database. SQLite is suitable for a single-device demo or coursework prototype.
- Demo passwords are stored as plain text for classroom demonstration only. Do not use this authentication design in a real clinic. A production system needs secure password hashing, server-side authorization, backups, and privacy protections.
- Appointment date uses `YYYY-MM-DD`. Time slots are generated every 30 minutes.
- This project is a starter implementation; test each role and booking scenario before presenting it.
