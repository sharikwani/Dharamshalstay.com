# Emergency medicine delivery page - design (20 Nov 2026)

## Why
People search for medicine delivery in Dharamshala. A licensed partner chemist will deliver emergency medicines only, and only when there is a real need. We screen every request: genuine + urgent + a doctor's prescription that we confirm with the doctor by phone. Only then does the chemist deliver.

## Goals / non-goals / anti-goals
- Goal: one SEO+AEO+GEO page that ranks for "medicine delivery Dharamshala" and collects screened requests.
- Non-goal: online pharmacy, payments, routine/monthly medicine orders, ambulance service.
- Anti-goal: delivering anything without a doctor-confirmed prescription; leaking prescriptions (health data); promising speed or availability we cannot guarantee.

## Facts (owner, 20 Nov 2026)
- Chemist stays unnamed: "a licensed partner chemist".
- Delivery areas: Kandi, Dharnu, Dari, Barol, Shyam Nagar, Khaniyara.
- Payment: on delivery, UPI or cash (owner, 20 Nov). Nothing is paid on the website.
- Delivery: free 10 am - 6 pm; Rs 200 extra on every delivery 6 pm - 10 pm (owner, 20 Nov). Our call: requests after 10 pm are handled from 10 am the next day.

## Approach (picked)
Reuse the local-guides upload pattern (private bucket, signed URLs in admin, honeypot, IP-hash rate limit, notifyOwner WhatsApp). Alternatives dropped: WhatsApp-only "send us your prescription" (no record, no SEO form, prescriptions in chat), and a third-party form (health data leaves our control).

## Design
- Page `/medicine-delivery-dharamshala`: bold Short answer, how it works (4 steps), areas served, what we do not deliver (Schedule X / controlled drugs, sleeping pills, codeine syrups, anything without a prescription), emergency numbers (108, Zonal Hospital Dharamshala), quick-facts table, 6-8 FAQs (FAQPage schema), form. In sitemap, footer link.
- Form: patient name, phone, area (select of the six + "other"), address/landmark, medicines needed, why urgent, doctor name + phone, prescription (JPEG/PNG/WebP/PDF, max 5 MB, required), consent tick (we may call the doctor; prescription stored privately, deleted after 30 days). Honeypot + max 3 requests per IP per day.
- API `POST /api/medicine`: validate (zod), check file magic bytes, upload to private bucket `medicine-prescriptions`, insert row, `notifyOwner` WhatsApp alert (no medicine names or health details in the alert, just "new request, open admin").
- Admin `/admin/medicine`: list requests, signed URL (1 h) to view the prescription, status: new -> checking -> doctor_confirmed -> delivered | rejected, note field.
- Migration v57: table `medicine_requests` (RLS on, no public policies; service role only), private bucket. Prescription file removed after 30 days by a cleanup step in the admin GET (delete files for rows older than 30 days).
- Builder's call: exact copy, layout, admin styling following existing pages.
