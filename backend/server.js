const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt-tracker')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    picture: String
});
const User = mongoose.model('User', userSchema);

const recordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: String,
    date: Date,
    startTime: String,
    endTime: String,
    breakDuration: Number,
    totalHours: Number,
    taskDescription: String,
    documentaryUrls: [String]
});
const Record = mongoose.model('Record', recordSchema);

// Auth Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Auth Route
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, name, email, picture } = payload;

        let user = await User.findOne({ googleId });
        if (!user) {
            user = new User({ googleId, name, email, picture });
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(400).json({ message: 'Google authentication failed' });
    }
});

// Records Routes
app.get('/api/records', verifyToken, async (req, res) => {
    try {
        const records = await Record.find({ userId: req.userId }).sort({ date: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/records', verifyToken, upload.array('documentaries', 10), async (req, res) => {
    try {
        const recordData = {
            ...req.body,
            userId: req.userId,
            totalHours: parseFloat(req.body.totalHours),
            breakDuration: parseInt(req.body.breakDuration),
            documentaryUrls: req.files ? req.files.map(f => `/uploads/${f.filename}`) : []
        };
        const record = new Record(recordData);
        const newRecord = await record.save();
        res.status(201).json(newRecord);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/records/:id', verifyToken, async (req, res) => {
    try {
        const record = await Record.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!record) return res.status(404).json({ message: 'Record not found' });
        res.json({ message: 'Record deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
