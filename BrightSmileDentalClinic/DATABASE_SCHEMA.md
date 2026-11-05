# Database overview

## users
- id (primary key)
- name
- email (unique)
- password (demo only; hash in production)
- role: admin / doctor / patient
- address, sex, age
- doctor_id (reserved for future extension)

## doctors
- id (primary key)
- user_id (links to users)
- name
- specialization
- shift: Morning / Afternoon / Night
- start_time, end_time
- active

## appointments
- id (primary key)
- reference_no (unique)
- patient_id (links to users)
- doctor_id (links to doctors)
- appointment_date
- appointment_time
- concern
- status: Scheduled / Completed / Cancelled
- doctor_notes
- created_at

## Booking uniqueness rule
The app checks that there is no non-cancelled appointment with the same:
- doctor_id
- appointment_date
- appointment_time

Cancelled bookings do not block a slot. Completed bookings remain recorded and do block the same slot from being booked again.
