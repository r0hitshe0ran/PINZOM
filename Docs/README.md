# 🍰 Pinzom

> Discover. Review. Recommend.

Pinzom is a bakery discovery and recommendation platform designed
to help people who are new to a city, university, hostel, or locality
discover bakeries through ratings, reviews, preferences, and social
recommendations.

## Problem

People moving to unfamiliar locations often don't know which local
bakeries are worth visiting. General food platforms provide many
options, but they are not focused specifically on bakery discovery
or recommendations from people users trust.

## Solution

Pinzom provides a bakery-focused platform where users can discover
bakeries, explore menus, search and filter options, read and write
reviews, save favorites, and receive recommendations based on their
preferences and friend activity.

## Key Features

- Bakery discovery
- Search and filtering
- Bakery profiles
- Bakery menus
- Ratings and reviews
- Favorites
- Personalized recommendations
- Friend activity and recommendations
- Location-based discovery

## Tech Stack (Initial Understanding)

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js
- Handlebars

### Database

- MongoDB
- Mongoose

### Tools

- Git & GitHub
- Figma

## Project Structure

Pinzom/
├── README.md
├── docs/
├── public/
├── views/
├── models/
├── routes/
├── config/
├── data/
└── app.js

## Documentation

Detailed project documentation is available in the `docs/` directory:

1. Project Overview
2. Requirements and Scope
3. Team and Timeline
4. Design and Architecture
5. Testing and Documentation

## Team

**Project 13 - Web Programming**

- **Member 1** - Home & Discovery
- **Member 2** - Explore, Search & Filters
- **Member 3** - Bakery Profiles & Menu
- **Member 4** - Reviews & Favorites
- **Member 5** - Profile, Recommendations & Integration

> All team members contribute across HTML, CSS, JavaScript,
> backend integration, testing, and documentation.

## Development Phases

### Phase 1

HTML, CSS, responsive design and accessibility.

### Phase 2

JavaScript, DOM manipulation, event handling and interactive features.

### Phase 3

Node.js, Express.js, Handlebars, MongoDB, Mongoose and full-stack
integration.

## Status

🚧 Currently under development.

## Run the second evaluation locally

Use Node.js 20 or newer. From the repository root, run:

    node server.js

Open http://127.0.0.1:3000. The server serves the HTML, CSS, and JavaScript and handles the forms. No package installation is required. Keep the server running during the demo.

### Evaluation walkthrough

1. **Linked pages** - Open Discover, How It Works, Explore, Categories, and Reviews from the shared header. Open a bakery from Explore to find directions, reviews, and a link back.
2. **JavaScript interactions** - Try the Explore search and category filters, Reviews category filters and star rating, password visibility, form validation, and favorites.
3. **Form submission** - Create an account, save the recovery code shown on signup, and post a review from a bakery page. The review appears in Reviews, on that bakery’s page, and in your profile. Log out and log back in to demonstrate that the account was saved. The recovery code lets you reset the password locally.
4. **Local JSON files** - The server creates and updates `data/users.json` and `data/reviews.json`. Signup, password changes, and favorites update the user record. Posting a review adds a review record. Login checks the account file and starts a session. Passwords and recovery codes are stored as salted hashes.

The review form lists the bakeries from Explore. New reviews save the selected bakery's ID, name, and category. Older reviews for names outside Explore stay in the author's profile and the local JSON file.

On Explore or a bakery page, select **Use my location** to see straight-line estimates for bakeries with known coordinates. The browser calculates the distance locally without saving your location.

Use fresh demo credentials for the evaluation. The server starts a new session when you log in, and any earlier browser-only accounts remain in that browser’s storage. The JSON data files are ignored by Git. Restarting the server preserves the files and ends active sessions.

Set `PORT` to use a different port or `PINZOM_DATA_DIR` to use a separate folder for test data.
