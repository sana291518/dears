# DEARS - Distributed Emergency Alert & Response System 🚨

DEARS is a full-stack real-time emergency reporting system built as a Progressive Web App (PWA). It allows users to report incidents like fire, floods, medical emergencies, and more using geolocation. Admins can view and resolve alerts in real-time using a secure login.

🔗 **Live App**: [https://dearss.netlify.app](https://dearss.netlify.app)

---

## 🚀 Features

- 🔴 Real-time emergency alert broadcasting (Socket.IO)
- 📍 Interactive map with geolocation using Leaflet
- ✅ Admin login with JWT to resolve alerts
- 📡 Offline-first PWA with install prompt
- 🌐 Multilingual support (English and Hindi)
- 🌙 Dark/Light mode toggle
- 📱 Mobile-first and installable UI

---

## 🛠️ Tech Stack

**Frontend**:
- React (with Vite)
- Leaflet.js for maps
- i18next for translations
- PWA support via service workers

**Backend**:
- Node.js + Express.js
- MongoDB Atlas for storage
- Socket.IO for real-time updates
- JWT for authentication

---

## 📁 Folder Structure
DEARS/
├── client/ # Frontend (React)
│ ├── public/ # Static assets (manifest, icons, sounds)
│ ├── src/ # App.jsx, i18n, service worker, etc.
│ └── index.html
├── server/ # Backend (Express)
│ ├── controllers/ # Alert & Auth logic
│ ├── routes/ # API endpoints
│ ├── middleware/ # JWT middleware
│ └── server.js
├── .env # Environment variables
├── README.md # Project documentation
└── package.json # Project dependencies

## 📦 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/dears.git
cd dears
2. Backend Setup (/server)
bash
Copy
Edit
cd server
npm install
➕ Create a .env file in the server/ directory:
env
Copy
Edit
MONGO_URI=your_mongodb_atlas_url
JWT_SECRET=your_super_secret_key
bash
Copy
Edit
npm start
3. Frontend Setup (/client)
bash
Copy
Edit
cd ../client
npm install
➕ Create a .env file in the client/ directory:
env
Copy
Edit
VITE_API_URL=http://localhost:5000
Replace with your deployed backend URL when hosting, e.g. https://dears-api.onrender.com

bash
Copy
Edit
npm run dev
🧪 Testing Admin Login
Manually insert an admin user in your MongoDB collection using bcrypt-hashed password.

![image](https://github.com/user-attachments/assets/99013c45-2cfa-4e7b-80b0-4d7dd621859a)
![image](https://github.com/user-attachments/assets/3c36fa26-0da9-45f7-bfc9-fad9c15ad021)
![image](https://github.com/user-attachments/assets/b5a3e475-4b42-45a0-80f7-15dadcee86b3)
![image](https://github.com/user-attachments/assets/1de2243f-c859-499e-8bd9-157b55a51356)
![image](https://github.com/user-attachments/assets/01aff589-f5e6-4cfb-af57-52a90aceb239)







Use /api/auth/login with username and password to retrieve JWT.

📜 License
This project is licensed under the MIT License.
