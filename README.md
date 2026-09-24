# EZ-TV

EZ-TV is an independently created accessible-media product by Savannah Sidle. It is being developed first for Savannah and her mother, Wanda, then tested for possible household and long-term-care use.

## Current product thesis

EZ-TV turns a person's relationships, culture, routines, favourite media, pets, places, and memories into a calm experience that can run by itself and require very little family maintenance.

The resident experience always returns to three familiar choices:

- Family photos
- Favourite show
- Relaxing music

## Working prototype

`prototype-demo/` contains the household prototype:

- caregiver web app
- dedicated Resident View
- secure one-time pairing-code flow
- persistent private media storage through Supabase
- local IndexedDB cache for offline fallback
- photo upload, deletion, and ordering
- video and audio upload
- device disconnection
- three resident appearance themes
- Choose, Guide, and Channel ability modes
- personal daily programming
- portable Life Profile
- Comfort Map
- Home Today family messages
- consent controls
- device-health summary
- caregiver-maintenance and pilot check-ins

The public website remains a product demonstration. Facility management, broad smart-TV compatibility, installation, cellular service, streaming partnerships, and final pricing remain future work.

## Two new product angles

### Home Today

Families can share one small piece of current life with an automatic expiry. It keeps the person included in the family's present instead of turning the product into a museum of old photographs.

### Comfort Map

The family can record approved people, words, content, places, and things to avoid. The Resident View can use this information when the person asks for help. It does not use cameras, behaviour scoring, diagnosis, or emotion recognition.

## Run locally

Serve the repository with a static web server:

```bash
python -m http.server 4173
```

Then open:

- Public demonstration: `http://localhost:4173/`
- Caregiver prototype: `http://localhost:4173/prototype-demo/`
- Resident screen: `http://localhost:4173/prototype-demo/tv.html`

## Supabase setup

The prototype uses Supabase anonymous device identities so Wanda never needs an email address or login. Apply `prototype-demo/supabase-schema.sql` to the configured Supabase project before testing cross-device settings.

The schema includes:

- Row Level Security
- single-use six-digit codes with ten-minute expiry
- attempt limits
- device-bound identities
- caregiver and resident-device access separation
- private storage with signed URLs
- access revocation
- security-event records
- revisioned resident settings

This is prototype security. A production release still requires a threat model, privacy impact assessment, external security review, breach procedure, backup testing, and a durable caregiver account-recovery method that does not burden the resident.

## V1 boundary

Build and validate:

- one caregiver web app
- one resident app
- one controlled Android or Google TV device
- real synchronization
- offline personal content
- automatic recovery after restart
- four-week Wanda pilot

Defer:

- custom televisions or remotes
- camera monitoring
- medical or medication claims
- AI companionship or imitated voices
- wide streaming-service integration
- cellular service
- native apps for every smart-TV platform
- facility rollout

## Pilot measures

- successful use without repeated teaching
- caregiver setup and maintenance minutes
- ordinary failure recovery
- content that creates interest, comfort, choice, or connection
- signs of discomfort or refusal
- usefulness after the novelty period

## Content boundary

Use family-owned media, original content, public-domain material, or content with documented permission. Spotify's Web Playback SDK and commercial streaming services cannot be treated as unrestricted product integrations.

## Project origin

Designed independently by Savannah Sidle. The project originated in 2024 after Savannah's mother developed early-onset Alzheimer's disease and entered long-term care.

All rights reserved. No permission is granted to copy, modify, distribute, sublicense, or sell this code.
