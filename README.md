# AI-Proctored System

An intelligent online examination system with AI-powered proctoring capabilities to ensure academic integrity during remote assessments.

## 🎯 Overview

The AI-Proctored System is a full-stack web application that enables teachers to create and manage online exams while monitoring student behavior in real-time using advanced AI technologies. The system detects various forms of academic dishonesty including face detection violations, prohibited objects, browser tab switching, and unauthorized activities.

## ✨ Features

### For Teachers
- **Exam Management**: Create, edit, and manage online examinations
- **Question Management**: Add questions manually or import from PDF files
- **Access Control**: Set access codes for exams
- **Real-time Monitoring**: View cheating violation logs with timestamps and evidence
- **Result Management**: View and manage student exam results
- **Analytics Dashboard**: Track exam performance and violation statistics

### For Students
- **Secure Exam Taking**: Take exams with AI proctoring enabled
- **Real-time Alerts**: Receive immediate notifications for any violations
- **Result Viewing**: View exam results and scores after submission
- **Access Code Verification**: Secure exam access through access codes

### AI Proctoring Features
- **Face Detection**: Monitors student presence and detects multiple faces
- **Object Detection**: Identifies prohibited objects (phones, books, etc.)
- **Browser Monitoring**: Tracks tab switching, copy/paste, and right-click events
- **Voice Detection**: Monitors for unusual sounds or second person presence
- **Screenshot Capture**: Automatically captures evidence of violations
- **Real-time Violation Logging**: Records all violations with metadata

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0**: UI framework
- **Material-UI (MUI)**: Component library
- **Redux Toolkit**: State management
- **TensorFlow.js**: AI model integration
- **MediaPipe**: Face detection
- **COCO-SSD**: Object detection
- **React Router**: Navigation
- **Axios**: HTTP client

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **PDF-Parse**: PDF question import
- **Multer**: File upload handling

## 📋 Prerequisites

Before running this project, ensure you have the following installed:
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud instance)
- Python 3.x (for code execution feature)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Prajida/Explainability-of-AI-in-Online-Proctoring-Systems.git
   cd Explainability-of-AI-in-Online-Proctoring-Systems
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Configure environment variables**

   Create a `.env` file in the `backend` directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

6. **Start the development servers**

   From the root directory:
   ```bash
   npm run dev
   ```

   Or run separately:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

## 📁 Project Structure

```
AI-Proctored-System/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Authentication & error middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   └── server.js         # Express server
├── frontend/
│   ├── public/           # Static files
│   └── src/
│       ├── components/   # Reusable components
│       ├── context/      # React context
│       ├── layouts/      # Layout components
│       ├── routes/       # Route configuration
│       ├── slices/       # Redux slices
│       ├── views/        # Page components
│       └── App.js        # Main app component
└── README.md
```

## 🔐 Authentication

The system uses JWT (JSON Web Tokens) for authentication. Users must register/login to access the system. There are two user roles:
- **Teacher**: Can create exams, manage questions, and view violation logs
- **Student**: Can take exams and view results

## 📊 Database Models

- **User**: Stores user credentials and role information
- **Exam**: Stores exam details, access codes, and settings
- **Question**: Stores exam questions (multiple choice)
- **CheatingLog**: Stores violation records with timestamps and evidence
- **Result**: Stores exam results and scores
- **ExamAttempt**: Tracks student exam attempts

## 🎥 AI Proctoring Workflow

1. Student starts an exam
2. Webcam and AI models are initialized
3. Continuous frame processing begins
4. Multiple detection systems run in parallel:
   - Face detection (BlazeFace)
   - Object detection (COCO-SSD)
   - Browser event monitoring
   - Voice detection
5. Violations are logged with screenshots
6. Real-time alerts are sent to students
7. All data is stored in the database

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- CORS configuration
- Secure cookie handling
- Browser security restrictions during exams
- Access code verification

## 📝 API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `POST /api/users/logout` - User logout
- `GET /api/users/profile` - Get user profile

### Exams
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Create new exam
- `GET /api/exams/:id` - Get exam details
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam

### Questions
- `GET /api/questions/exam/:examId` - Get questions for exam
- `POST /api/questions` - Add question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Results
- `POST /api/results` - Submit exam result
- `GET /api/results/exam/:examId` - Get results for exam
- `GET /api/results/student/:studentId` - Get student results

### Cheating Logs
- `POST /api/cheating-logs` - Log violation
- `GET /api/cheating-logs/exam/:examId` - Get violations for exam
- `GET /api/cheating-logs/student/:studentId` - Get student violations

---

**Note**: This system is designed for educational purposes. Ensure compliance with privacy laws and regulations when implementing in production environments.

