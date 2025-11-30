TA Assessment – Full Stack Application

This repository contains a full-stack application built with:

Frontend: Next.js

Backend: Node.js + Express

OCR + AI Processing: Tesseract.js + Google Gemini API

Both applications run independently and communicate using REST APIs.

📂 Project Structure
ta-assesment/
│
├── frontend/     # Next.js app
└── backend/      # Node.js + Express API

🚀 Getting Started

Follow the steps below to clone, install dependencies, configure environment variables, and run both applications.

📥 1. Clone the Repository
git clone https://github.com/nagalamp/ta-assesment.git
cd ta-assesment

⚙️ 2. Backend Setup (Node.js + Express)
📌 Navigate to the backend folder
cd backend

📦 Install dependencies
npm install

🔐 Create .env file

Inside backend/ add:

PORT=5001
GEMINI_API_KEY=your_api_key_here


Replace your_api_key_here with your actual Gemini API key.

▶️ Run backend server
npm start


For development with nodemon:

npm run dev

🔥 Backend will run at:
http://localhost:5001

🌐 3. Frontend Setup (Next.js)
📌 Navigate to the frontend folder
cd ../frontend

📦 Install dependencies
npm install

🔐 Create .env.local file

Inside frontend/ add:

NEXT_PUBLIC_API_URL=http://localhost:5001

▶️ Run frontend
npm run dev

🌍 Frontend will run at:
http://localhost:3000

🧪 4. Usage

Start backend on port 5001

Start frontend on port 3000

The frontend connects automatically using NEXT_PUBLIC_API_URL

You can now upload images, perform OCR, and generate structured timetable data.

🛠️ 5. Tech Stack
Frontend

Next.js 14

React

Tailwind CSS

Backend

Node.js

Express.js

Tesseract.js (OCR)

Google Gemini API

dotenv
