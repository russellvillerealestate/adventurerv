# Adventure RV Park

Static GitHub Pages site for stayarv.com.

## Questionnaire and rules

- `signup.html` gates Continue on damage = no, cleanliness = yes, and rules agreement = checked.
- Answers remain in the browser. There is no application submission, reservation, identity verification, payment, or saved consent record.
- Continue currently reveals the park's existing call/text contact for availability confirmation.
- `rules.html` transcribes the owner-supplied rules; `park-rules.pdf` is the original unchanged document supplied September 29, 2026.
- `site.css` is the existing homepage stylesheet shared by all pages; `signup.css` styles the new forms and rules.

Before connecting automatic signup or payments, add server-side eligibility validation and versioned consent records. Client-side controls are not an authorization boundary. Confirm available inventory before reservations. Existing resident payments must settle their actual Square invoice, not a separate generic checkout. Secure tenant identification requires individual verified contact details; the shared temporary park email cannot identify a tenant. The existing Square automation does not implement the rules' late fees or move-in credits.

Validation: all eight answered combinations checked in the browser; only no/yes/agreed enables Continue. Changing agreement hides the next step and disables Continue. Mobile layout checked at 390px; rules text compared with all 21 PDF sections and original PDF retained byte-for-byte.
