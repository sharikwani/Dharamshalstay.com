# Directory batch 2 research report (McLeod Ganj, 20 listings)

Files: supabase/seed/directory/hotels-3.ts, media-4.ts, scripts/generate-directory-sql.ts (`--batch 2`), supabase/migration-v24-directory-hotels-2.sql.

"Own photos" = photos from the property's own listing on Trip.com or Hostelworld, which is the convention already used in media-1..3 (own-website photos were not available for these properties; only Hotel M has an official site and it has no photos). Photos viewed before alt text was written; images showing identifiable guests were excluded.

| # | Name | Locality | Type | Band | Sources | Own photos |
|---|------|----------|------|------|---------|-----------|
| 1 | Hotel Norbu House | Ridge near Hotel Bhagsu | hotel | upscale | 3 (Booking, Trip, mcleodganjhotels.net) | yes (7) |
| 2 | Hotel Bella Heights | Temple Road | hotel | mid-range | 4 (Trip, Hotels.com, Ostrovok, MGH) | yes (7) |
| 3 | Hotel M and Resort | Dalai Lama Temple Road (Mount View Complex) | hotel | mid-range | 2 (official mhotel.in, MGH) | no |
| 4 | Serkong House | Nowrojee Road | guesthouse | mid-range | 4 (Hotels.com, Expedia, Ostrovok, Lonely Planet) | no |
| 5 | Zambala House | End of Himachal Tourism Road | guesthouse | mid-range | 3 (Via, Wanderlog, MGH) | no |
| 6 | Hotel Akash | Jogiwara Road | hotel | budget | 3 (Trip, Hotels.com, MGH) | yes (7) |
| 7 | Hotel Mount View | Jogiwara Road, near Post Office | hotel | mid-range | 3 (Hotels.com, Expedia, MGH) | no |
| 8 | Hotel Pawan Regency | Jogiwara Road | hotel | mid-range | 3 (Trip, Hotels.com, MGH) | yes (7) |
| 9 | Hotel Lavish Inn | Jogiwara Road, near Post Office | hotel | budget | 2 (Trip, Justdial) | yes (6) |
| 10 | La Riqueza Koala Inn | Jogiwara Road | hotel | mid-range | 3 (Trip, Hotels.com, Expedia) | yes (6) |
| 11 | The Bougainvillea | Jogiwara Road, opp. Youngling School | guesthouse | budget | 2 (Trip, MakeMyTrip) | yes (7) |
| 12 | Zostel McLeodganj | Pink House, Jogiwara Road | hostel | budget | 2 (Trip, Hostelworld) | yes (7) |
| 13 | Hotel The Nest | Shivam Marg, end of Jogiwara Road | hotel | mid-range | 3 (Hostelworld, Hotels.com, Expedia) | yes (6) |
| 14 | HillOra McLeodganj | Shivam Marg | hotel | mid-range | 3 (Hostelworld, Expedia, Hotels.com) | yes (5) |
| 15 | Albela House Hotel | Shivam Marg | hotel | budget | 3 (Trip, Wanderlog, MGH) | yes (5) |
| 16 | Hotel Asian Plaza | Main Square | hotel | mid-range | 3 (Trip, Expedia, Via) | yes (7) |
| 17 | Shree Guest House | Just above Main Square | guesthouse | budget | 2 (Trip, MGH) | yes (7) |
| 18 | Mcleodganj Bed and Breakfast | Dharamkot Road, opp. TIPA | guesthouse | budget | 3 (Trip, MGH, Cleartrip) | yes (5) |
| 19 | Hotel Woodville Inn | Near Dalai Lama Temple | hotel | mid-range | 3 (Trip, Hotels.com, MGH) | yes (7) |
| 20 | Alivaa Hotel McLeodganj | Forsyth Ganj | hotel | upscale | 3 (Hotels.com, ixigo, MGH) | no |

MGH = mcleodganjhotels.net (an aggregator). Hotels.com, Expedia and Travelocity share a parent company, so they are not fully independent of each other; I always paired them with a different source type.

15 of 20 have own photos; 5 have none (Hotel M, Serkong House, Zambala House, Hotel Mount View, Alivaa Hotel), so the page will use the area photo.

## Dropped or considered and not used
- Alivaa Boutique (Tipa/Dharamkot Road): only one source found, and easily confused with Alivaa Hotel. Dropped.
- Hotel Wood Castle (OYO 6962), Jogiwara Road: Trip page could not be fetched for details; OYO-branded. Dropped.
- Hotel Varuni / The Varuni Mcleodganj, Temple Road: only OTA listings with inconsistent ratings (1/10 vs 4/10) and conflicting names; no further detail. Dropped.
- Pema Thang Guest House: pemathang.net turned out to be an unrelated Dubai blog; only Outlook India/Wanderlog/Via found. Dropped.
- Kailwood, Kareri Lodge, Kalsang Guest House, Loseling Guest House, Kunga Guest House: found in Lonely Planet/Wanderlog only, no second current booking listing with usable details. Dropped.
- Belmont Resorts / Hotel Satovari Pride: official site has no street address or photos, Satobari area (not clearly McLeod Ganj proper). Dropped.
- The Divine Hima: official site places it in Sidhpur, not McLeod Ganj. Dropped.
- Fortune Park Moksha, Chonor House, Glenmoor Cottages, Panchvati Cottages: already live. Hotel Mount View is not the same as the existing Backpackers Inn (which only mentions it as a landmark).
- Lemon Tree, Katson Castle, Gateway Dal Lake, Saheb's Castle, Maclo Classic (Satobari, Dal Lake, Rakkar Road, Naddi): outside McLeod Ganj proper.

## Doubts
- Official websites were found for only one property (Hotel M, no photos), so every photo set comes from a Trip.com or Hostelworld listing. This matches the established `photo_source` convention but is not "own website" photography. Trip.com's shared placeholder room image was excluded.
- Zambala House: reviews found are on Wanderlog/Via (some date from years back), plus the MGH aggregator. Strong evidence it exists, weaker evidence of current operation. Flagged for a manual check.
- Hotel M and Resort, Serkong House, Mount View, Alivaa: no photos; facts come from official site (Hotel M) or OTA summaries that were not fetched directly (Expedia/Hotels.com returned HTTP 429), so room names and check-in times for those rely on search result summaries.
- Conflicting facts were left out or generalised: Albela House check-in/out times and exact street (MGH says Dal Lake Road, Trip says Shivam Marg off Jogiwara Road; I used Trip), HillOra check-out, La Riqueza Koala Inn room count and check-in, Woodville Inn road (Temple Road vs Jogiwara Road), Serkong House room count.
- Price bands are judged from star rating plus indicative aggregator prices (MGH "from" prices), not verified rates.
- Hotel Pawan Regency pet policy ("allowed for a fee, cats") is from a single Trip.com listing.
- Zostel McLeodganj: Hostelworld mentions the main guest must be 18+ (from Trip); not used as a policy field.
- Distances in `nearby` come from OTA listings; walking times were taken only where a source gave them.
