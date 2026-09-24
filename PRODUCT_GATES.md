# EZ-TV product gates

This file prevents prototype screens from quietly dressing up as production infrastructure.

## Implemented in the prototype

- [x] Caregiver and Resident View are separate browser experiences
- [x] Six-digit pairing code
- [x] Pairing code expiry and single use
- [x] Pairing-attempt limit
- [x] Device-bound anonymous resident identity
- [x] Private media bucket and signed media URLs
- [x] Row Level Security for residents, media, devices, and settings
- [x] Device disconnection and access revocation
- [x] Persistent cloud media
- [x] Local IndexedDB media and settings cache
- [x] Realtime refresh after caregiver changes
- [x] Photo deletion and ordering
- [x] Resident View always returns to three choices
- [x] Keyboard and television-remote directional navigation
- [x] Original, Warm Home, and Garden Calm appearance choices
- [x] Choose, Guide, and Channel ability settings
- [x] Morning, afternoon, and evening channel plan
- [x] Life Profile
- [x] Comfort Map
- [x] Home Today messages with expiry
- [x] Consent controls
- [x] Pilot maintenance-minute and observation logging on caregiver device
- [x] Service worker shell cache
- [x] Honest website labels for future hardware, cellular, facility, and pricing concepts

## Must pass before Wanda uses it independently

- [ ] Apply the current Supabase schema to production
- [ ] Confirm pairing and settings sync across two physical devices
- [ ] Test power loss and automatic relaunch on the chosen resident device
- [ ] Test a full day without internet using cached content
- [ ] Add remote device-health details that identify the failure and the next action
- [ ] Add a safe caregiver recovery method when browser data is lost
- [ ] Add photo names, relationships, captions, and individual visibility controls
- [ ] Verify focus, contrast, type size, sound, captions, and remote operation at television distance
- [ ] Test with Wanda, including refusal and signs of discomfort
- [ ] Establish a simple method to stop or remove any content immediately

## Must pass before any household is charged

- [ ] Formal name and trademark clearance
- [ ] Supported-device list
- [ ] Installation and return process
- [ ] Hardware failure and replacement policy
- [ ] Support hours and escalation path
- [ ] Backup and restore test
- [ ] Account and data deletion
- [ ] Bereavement and household-transfer process
- [ ] Threat model
- [ ] Privacy impact assessment
- [ ] Independent security review
- [ ] Content-rights policy
- [ ] Total-cost and support-cost model
- [ ] Four-week pilot evidence

## Must pass before a facility pilot

- [ ] Durable staff and administrator accounts
- [ ] Role-based access with least privilege
- [ ] Audit-log interface
- [ ] Data-processing agreement
- [ ] Subprocessor and data-residency disclosure
- [ ] Breach-response playbook
- [ ] Fleet health, remote update, and rollback
- [ ] Facility Wi-Fi, captive portal, and VLAN testing
- [ ] Shared-room privacy rules
- [ ] Resident move, discharge, death, and room-change workflows
- [ ] Staff training under ten minutes
- [ ] Evidence that staff work decreases or stays neutral

## Explicitly outside V1

- custom television
- custom remote
- camera or presence monitoring
- passive microphone
- emotion recognition
- cognitive or behaviour scoring
- medication management
- medical claims
- AI companion
- imitated family voices
- universal streaming integration
- every smart-TV platform
- cellular service
- full facility dashboard

## Failure rules

1. Wanda never receives a technical error message.
2. The resident screen falls back to the last safe local content.
3. A failed update never deletes the last working version.
4. The caregiver sees the exact problem and one next action.
5. Access can be revoked without touching the resident screen.
6. The three-choice home screen remains available after any media closes.
7. No feature may create recurring family work without measured value.
