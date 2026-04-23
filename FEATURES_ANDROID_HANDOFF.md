# Android Feature Handoff

This document explains the new features added in the web app so they can be implemented consistently in the Android app.

The goal of this file is not only to describe what the feature looks like, but also:

- who can access it
- what problem it solves
- how the user flow works
- what backend endpoints it uses
- what data should be shown in the UI
- what states the Android UI should handle

## 1. My Reports / Tip Tracking

### Purpose
This feature allows a logged-in user to track the tips they have personally submitted.

Before this feature, a citizen or tourist could submit a tip, but after submission there was no clear place to see:

- whether the tip is still pending
- whether police/admin approved it
- whether it was denied
- whether moderator notes were added
- whether the tip became a real crime case

This feature improves trust because the user can now see that their submission is not disappearing into a black hole.

### Who Can Access
- `tourist`
- `citizen`
- also visible to any authenticated user if needed, but mainly designed for citizen-side use

### Route in Web App
- `/my-reports`

### Backend Endpoint
- `GET /api/tips/mine`

### What the Endpoint Returns
For the currently logged-in user, it returns their submitted tips with:

- `id`
- `title`
- `description`
- `category`
- `severity`
- `status`
- `reported_at`
- `created_at`
- `moderator_notes`
- `moderated_at`
- `crime_id`
- `latitude`
- `longitude`

### Main UI Sections

#### Header
Shows:
- page title
- small explanation text
- button to create a new tip
- refresh button

#### Summary Cards
Shows counts for:
- total reports
- pending
- approved
- denied

#### Filter
The user can filter by:
- all
- pending
- approved
- denied

#### Report List
Each tip card shows:
- title
- current status badge
- description
- reported timestamp
- category
- severity
- coordinates
- moderated time
- moderator notes
- linked case outcome if the tip was converted into a case

### Important Status Meanings
- `pending`: still waiting for police/admin review
- `approved`: accepted and converted into workflow
- `denied`: reviewed but not accepted

### Android Implementation Notes
- This page can be built as a `RecyclerView` or `LazyColumn` style list.
- Summary cards can be shown at the top.
- Status should be color-coded:
  - pending = amber/yellow
  - approved = green
  - denied = red
- If `crime_id` exists, show “Converted into case”.
- If there are no reports, show a clear empty state and CTA to submit a new tip.

### Important UX Detail
After submitting a tip, the web app currently redirects to homepage, but `My Reports` remains the place where the user can later track all their past submissions.

## 2. Emergency Hub

### Purpose
This is a citizen safety utility page that groups urgent actions in one place.

It is meant to feel like a practical emergency toolkit, not just another static information page.

### Who Can Access
- authenticated users
- especially useful for `tourist` and `citizen`

### Route in Web App
- `/emergency`

### Main Capabilities

#### Emergency Numbers
The page shows quick actions for:
- `112` National Emergency
- `100` Police
- `108` Ambulance
- `1091` Women Helpline

Each card explains what the number is for.

#### Share Location
The user can share their current location using native web share when available.
Fallback behavior:
- copy location link to clipboard

#### Copy Emergency Info
Copies:
- emergency numbers
- current location link

#### Open Nearby Police / Hospital
Uses the current location to open a map search for:
- nearby police station
- nearby hospital

#### Live Safety Snapshot
This section uses the risk-level API and nearby crime stats to show:
- current risk level
- nearby incident count
- overall score
- alert message
- top nearby incident categories

### Backend Endpoints Used
- `GET /api/crimes/risk-level?lat=...&lng=...&radius=5000`
- `GET /api/crimes/nearby/stats?lat=...&lng=...`

### Android Implementation Notes
- On Android, this can be stronger than web:
  - phone dial actions can use intents directly
  - map opening can use Google Maps intent
  - location sharing can use native share sheet
- If location permission is denied:
  - show a clear permission warning
  - disable nearby police/hospital search
  - disable risk snapshot or show fallback text

### Important UX Goal
The page should feel calm but urgent-ready:
- big emergency actions first
- risk info second
- educational “what to do next” content third

## 3. Need Help

### Purpose
This is the distress-request feature for `tourist` and `citizen`.

It allows a user to send:
- a help message
- their live location

to:
- police
- admin

This is more urgent than a normal tip. A tip is informational. A help request means the person needs immediate assistance.

### Who Can Access
- `tourist`
- `citizen`

### Route in Web App
- `/need-help`

### Backend Endpoints
- `POST /api/alerts/help`
- `GET /api/alerts/help/mine`

### Request Payload for Sending Help
- `latitude`
- `longitude`
- `message`
- optional `city`

### What Happens on Send
1. App captures user location.
2. User writes or keeps the default distress message.
3. App submits the request to backend.
4. Backend creates a record in the existing `alert` table with:
   - `alert_type = 'help'`
   - `active = true`
   - current location
   - current user as creator
5. Backend emits a socket event so responders can be notified immediately.

### Main UI Sections

#### Hero / Explanation
Explains clearly:
- this is urgent
- it sends live location to responders

#### Current Location
Shows:
- latitude
- longitude
- location permission state

#### Help Message
User can customize the distress message.
Default message:
- “Need help at my current location. Please respond urgently.”

#### Send Button
Main CTA:
- `Send Help Request`

#### Recent Help Requests
User can see their own past help requests:
- title
- message
- created time
- active/resolved state

### Android Implementation Notes
- This feature is a strong candidate for a large red CTA.
- Before send:
  - ensure location permission granted
  - ensure location captured
- After send:
  - show confirmation state immediately
  - append the new request to local list if possible

### Important Product Difference
- `Report Tip` = report suspicious activity or information
- `Need Help` = user is in trouble now

That distinction should stay very clear in Android UI.

## 4. Help Requests (Responder Side)

### Purpose
This is the responder-side queue for police/admin to monitor incoming help requests from users.

### Who Can Access
- `admin`
- `police`

### Route in Web App
- `/help-requests`

### Backend Endpoints
- `GET /api/alerts/help`
- `PATCH /api/alerts/help/:id/resolve`

### Real-Time Events
Backend emits socket events:
- `help-request:new`
- `help-request:resolved`

The responder page listens for these events using Socket.IO.

### What Responders See
For each help request:
- title
- message
- status: active or resolved
- reporter name
- reporter email
- reporter phone
- reporter role
- latitude/longitude
- created timestamp

### Responder Actions

#### Open Location
Opens map to the request coordinates.

#### Call Reporter
If reporter phone is available, responder can call directly.

#### Mark Resolved
Marks the help request as no longer active.

When resolved:
- backend sets `active = false`
- backend sets `expires_at = NOW()`
- backend emits `help-request:resolved`

### Android Implementation Notes
- This should be built as a real-time queue.
- Use websocket or polling fallback.
- Show `active` items first.
- For each request, make the action buttons very obvious:
  - open map
  - call
  - resolve

### Notification Behavior
When a new request arrives while responder is already logged in:
- show an in-app banner
- optionally show local notification
- play sound if product wants stronger urgency later

## 5. Active Help Request Highlight in Sidebar

### Purpose
Responders should not have to manually open the `Help Requests` tab to know something urgent arrived.

This feature makes active requests visible from anywhere in the app.

### Who Sees It
- `admin`
- `police`

### Behavior
In the sidebar:
- `Help Requests` tab shows a count badge
- when count > 0, the tab becomes highlighted in urgent styling
- the badge pulses to attract attention

### How It Works
The sidebar polls:
- `GET /api/alerts/help`

Then it counts how many items have:
- `active = true`

### Refresh Frequency in Web
- every 15 seconds

### Android Implementation Notes
This should be even better on Android:
- show badge in bottom navigation or drawer
- show top app bar badge if possible
- show push/local notification in future

### Important Product Reason
This is not just cosmetic.
Without it, responders may miss help requests unless they are already watching the queue.

## 6. Admin User Management

### Purpose
Admins need a proper interface to manage platform users instead of relying on manual database changes.

### Who Can Access
- `admin` only

### Route in Web App
- `/admin-panel`

### Backend Endpoints
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

### Capabilities

#### List Users
Shows:
- name
- email
- role
- phone
- date of birth
- verification status
- created date

#### Create User
Admin can create:
- tourist
- citizen
- police
- admin

Fields used:
- name
- email
- phone
- dob
- role
- password
- is_verified

#### Edit User
Admin can edit:
- name
- email
- phone
- dob
- role
- verified status
- password reset through new password field

#### Delete User
Admin can remove a user.

### Safety Rules Added
- admin cannot delete themselves from this screen
- admin cannot remove their own admin role from this screen

### Android Implementation Notes
- This page is more operational than citizen-facing
- use searchable list if user count becomes large
- separate form for create/edit
- destructive delete action should always use confirmation dialog

## 7. Public Signup Role Restriction

### Problem Before
The public registration screen allowed users to self-select:
- tourist
- citizen
- police
- admin

That is unsafe because privileged roles should never be publicly self-assigned.

### What Was Changed

#### Frontend
Public signup UI now only offers:
- `tourist`
- `citizen`

#### Backend
Even if someone manually sends a custom API request, backend still restricts self-signup role to:
- `tourist`
- `citizen`

If another role is sent, backend normalizes it to `tourist`.

### Android Implementation Notes
The Android signup flow must follow the same rule:
- only allow tourist and citizen in UI
- never expose police/admin role picker in public registration

Police/admin creation must only happen through admin-controlled management.

## Suggested Android Screen Mapping

### Citizen / Tourist
- Dashboard
- Map
- Emergency Hub
- Need Help
- Report Tip
- My Reports

### Police / Admin
- Dashboard
- Map
- Help Requests
- Manage Crimes
- Tip Moderation
- Statistics

### Admin Extra
- Admin Panel / User Management

## Suggested Android Priorities

### High Priority
- Need Help
- Help Requests
- My Reports
- Emergency Hub

### Medium Priority
- Admin User Management
- Active help badge/highlight

### Important Technical Notes for Android Team

1. Respect role-based access
- tourist/citizen and police/admin should not see the same tabs

2. Help requests are urgent objects, not ordinary notifications
- surface them more aggressively

3. Location permission handling is critical
- many of these features depend on location
- always design for denied permission state

4. Socket support is recommended for responder views
- especially for `Help Requests`
- if socket is not available at first, polling can be used as fallback

5. Keep status names consistent with backend
- `pending`
- `approved`
- `denied`
- `active`
- `resolved`

## Future Features That Would Fit Naturally Next

If Android continues after these:

- responder claim/acknowledge for help requests
- topbar alert bell for responders
- trusted contacts
- safe check-in
- safe route planner

