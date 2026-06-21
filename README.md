# SportMate - Sports Matchmaking Platform

A modern, location-based sports matchmaking app that connects players in real-time using Google Maps integration and intelligent matching algorithms.

## ✨ Features

- **🎾 Real-time Player Matching**: Find nearby players for badminton, tennis, basketball, football, and more
- **📍 Location-based Discovery**: Google Maps & Places API integration for accurate court and player location
- **🗺️ Interactive Maps**: Visual court selection with real-time availability and Google Places search
- **👥 Group Matching**: Support for solo play or team formation (1-10+ players)
- **📱 Cross-platform**: Modern React frontend with Node.js/Express backend
- **💾 MongoDB Integration**: Robust data storage for users, matches, and courts
- **🔐 JWT Authentication**: Secure user authentication and authorization
- **📊 Smart Filtering**: Filter by sport, skill level, availability, and match type

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** for fast development
- **React Router** for navigation
- **Google Maps JavaScript API** for interactive maps
- **Google Places API** for location autocomplete and nearby search
- **Responsive CSS** with custom design system

### Backend
- **Node.js** + **Express.js** framework
- **MongoDB** with **Mongoose** ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **RESTful API** design

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Google Cloud Console account with Maps API enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sportmate.git
   cd sportmate
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install

   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**

   **Backend (.env file):**
   ```env
   MONGO_URI=mongodb://localhost:27017/sportmate
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   ```

   **Frontend (.env file):**
   ```env
   VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
   ```

4. **Google Cloud Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable **Maps JavaScript API**
   - Enable **Places API**
   - Create an API key
   - **Important**: Enable billing (Places API requires it)
   - Restrict the API key to your domain for security

5. **Database Setup**
   ```bash
   # Start MongoDB (if using local)
   mongod

   # Seed the database with sample data
   cd backend
   node seed.js
   ```

6. **Run the Application**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

   Access the app at: **http://localhost:5173/**

## 📁 Project Structure

```
sportmate/
├── backend/                      # Node.js/Express API
│   ├── models/                   # MongoDB schemas
│   │   ├── User.js              # User model
│   │   ├── Match.js             # Match model
│   │   └── Court.js             # Court model
│   ├── routes/                  # API endpoints
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management
│   │   ├── matches.js           # Match operations
│   │   ├── courts.js            # Court search
│   │   └── chat.js              # Chat functionality
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   ├── controllers/             # Business logic (future)
│   ├── server.js                # Main server file
│   ├── seed.js                  # Database seeding
│   └── package.json
├── frontend/                     # React/Vite app
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── NavBar.jsx       # Bottom navigation
│   │   │   ├── LocationSearch.jsx # Google Places autocomplete
│   │   │   └── BottomNav.jsx    # Navigation component
│   │   ├── pages/               # Page components
│   │   │   ├── Home.jsx         # Landing page
│   │   │   ├── Login.jsx        # Authentication
│   │   │   ├── Register.jsx     # User registration
│   │   │   ├── Profile.jsx      # User profile
│   │   │   ├── SelectPlayers.jsx # Player count selection
│   │   │   ├── NearbyPlayers.jsx # Player discovery
│   │   │   ├── Courts.jsx       # Court selection with maps
│   │   │   ├── ConfirmMatch.jsx # Match confirmation
│   │   │   ├── MyMatches.jsx    # User's matches
│   │   │   └── Chat.jsx         # Chat interface
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication state
│   │   ├── utils/
│   │   │   └── api.js           # API client
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # App entry point
│   ├── public/                  # Static assets
│   ├── index.html               # HTML template
│   ├── vite.config.js           # Vite configuration
│   └── package.json
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## 🔌 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### User Endpoints
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `GET /api/users/nearby` - Find nearby players

### Court Endpoints
- `GET /api/courts/nearby` - Find nearby courts

### Match Endpoints
- `POST /api/matches` - Create new match
- `GET /api/matches` - Get user's matches

## 🤝 Contributing

We welcome contributions from everyone! Here's how to get started:

### 1. Fork & Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/yourusername/sportmate.git
cd sportmate
```

### 2. Set up Development Environment
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start development servers
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

### 3. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass

### 5. Commit & Push
```bash
git add .
git commit -m "Add: Brief description of your changes"
git push origin feature/your-feature-name
```

### 6. Create a Pull Request
- Go to the original repository on GitHub
- Click "New Pull Request"
- Select your feature branch
- Provide a clear description of your changes
- Submit the PR for review

### Development Guidelines

- **Code Style**: Follow existing patterns and use meaningful variable names
- **Commits**: Use conventional commit format (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Test your changes thoroughly before submitting
- **Documentation**: Update README and code comments as needed
- **Security**: Never commit API keys or sensitive data

## 📋 Available Scripts

### Backend
```bash
npm start      # Start production server
npm run dev    # Start development server with nodemon
npm test       # Run tests
```

### Frontend
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run preview # Preview production build
```

## 🐛 Troubleshooting

### Common Issues

**Google Maps not loading:**
- Check your API key is correct
- Ensure billing is enabled in Google Cloud
- Verify Maps JavaScript API and Places API are enabled

**Database connection failed:**
- Ensure MongoDB is running
- Check your MONGODB_URI in backend/.env
- For MongoDB Atlas, whitelist your IP

**Port already in use:**
- Kill processes on ports 5000 (backend) and 5173 (frontend)
- Or use different ports in your .env files

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Maps Platform for location services
- MongoDB for database solutions
- React community for amazing tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/sportmate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/sportmate/discussions)
- **Email**: maintainers@sportmate.com

---

Built with ❤️ for sports enthusiasts everywhere! 🏸⚽🏀🎾

### Step 4 — Frontend setup (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at http://localhost:5173

---

## Demo Login
- Email: `rahul@demo.com`
- Password: `demo1234`

---

## Auth, Email, and Notification Reliability

Backend `.env` values for the new features:

```env
MONGO_URI=mongodb://localhost:27017/sportmate
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MAIL_FROM=SportMate <no-reply@sportmate.com>
NOTIFICATION_WORKER_INTERVAL_MS=5000
CORS_ORIGIN=http://localhost:5173

# Optional high-scale notification worker mode.
# When REDIS_URL is present, notification jobs are executed through BullMQ.
REDIS_URL=redis://localhost:6379
NOTIFICATION_QUEUE_NAME=sportmate-notifications
NOTIFICATION_WORKER_CONCURRENCY=10
```

Frontend `.env` values:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_SOCKET_URL=http://localhost:5000
```

Notifications use Socket.IO for realtime browser delivery. The browser opens an authenticated websocket with the same JWT used for API calls, then receives `notification:new` and unread-count updates immediately.

Notification jobs are still saved in MongoDB for durability and idempotency. For local development without Redis, the app runs a Mongo-backed worker fallback. For production scale, set `REDIS_URL`; BullMQ will process notification jobs with configurable concurrency while MongoDB remains the source of truth for delivery state, retries, and dead-letter records.

Forgot-password emails require SMTP settings. Reset links are never returned to the browser; they are only sent to the account owner's email address. In local development without SMTP, the backend logs email dry-runs to the server console, but real users need SMTP configured.

---

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/google | Login or sign up with Google |
| POST | /api/auth/forgot-password | Send password reset email |
| POST | /api/auth/reset-password | Reset password with token |
| GET | /api/users/me | My profile |
| PUT | /api/users/me | Update profile |
| GET | /api/users/nearby?sport=Badminton&availability=Now | Find nearby players |
| GET | /api/courts/nearby?opponentId=xxx&sport=Badminton | Courts near midpoint |
| POST | /api/matches | Create a match |
| GET | /api/matches | My matches |
| GET | /api/matches/:id | Single match |
| PUT | /api/matches/:id/confirm | Confirm match |
| GET | /api/notifications | My in-app notifications |
| GET | /api/notifications/delivery-status | My recent notification delivery jobs |
| GET | /api/chat/:matchId | Get messages |
| POST | /api/chat/:matchId | Send message |

---

## Adding Google Maps API (later)

1. Get a key from https://console.cloud.google.com
2. Enable "Maps JavaScript API" and "Places API"
3. In frontend, replace the midpoint map placeholder in Courts.jsx with:
```jsx
<iframe
  src={`https://www.google.com/maps/embed/v1/place?key=YOUR_KEY&q=${court.lat},${court.lng}`}
  width="100%" height="110" style={{border:0, borderRadius:14}}
/>
```

---

## App Flow
1. Register → Login
2. Home → Pick Sport
3. Select Players (Singles/Doubles/Teams + availability)
4. Nearby Players (filtered by sport + distance + availability)
5. Courts (sorted by midpoint distance)
6. Confirm Match
7. Chat with opponent
