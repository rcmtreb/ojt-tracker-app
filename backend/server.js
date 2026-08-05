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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1021240931407-d22o1pbm1c10jpsor4qc2irfmu66fmel.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'OJT Tracker API is running' });
});

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit per file
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt-tracker')
    .then(() => console.log('MongoDB connected'))
    .catch(() => console.log('MongoDB connection error: Check if MongoDB is running and accessible.'));

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
    category: { type: String, default: 'Development' },
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
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Auth Route
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
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
        res.status(400).json({ message: `Google auth error: ${err.message}` });
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

const uploadMiddleware = upload.array('documentaries', 5);

app.post('/api/records', verifyToken, (req, res) => {
    uploadMiddleware(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum size is 2MB per image.' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(500).json({ message: err.message });
        }

        try {
            const documentaryUrls = req.files ? req.files.map(file => {
                const base64String = file.buffer.toString('base64');
                return `data:${file.mimetype};base64,${base64String}`;
            }) : [];

            const recordData = {
                ...req.body,
                userId: req.userId,
                totalHours: parseFloat(req.body.totalHours),
                breakDuration: parseInt(req.body.breakDuration),
                documentaryUrls: documentaryUrls
            };
            
            const record = new Record(recordData);
            const newRecord = await record.save();
            res.status(201).json(newRecord);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });
});

app.put('/api/records/:id', verifyToken, (req, res) => {
    uploadMiddleware(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum size is 2MB per image.' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(500).json({ message: err.message });
        }

        try {
            const updateData = {
                ...req.body,
                totalHours: parseFloat(req.body.totalHours),
                breakDuration: parseInt(req.body.breakDuration)
            };

            // Only update documentaryUrls if new files were uploaded
            if (req.files && req.files.length > 0) {
                updateData.documentaryUrls = req.files.map(file => {
                    const base64String = file.buffer.toString('base64');
                    return `data:${file.mimetype};base64,${base64String}`;
                });
            }

            const record = await Record.findOneAndUpdate(
                { _id: req.params.id, userId: req.userId },
                updateData,
                { new: true }
            );

            if (!record) return res.status(404).json({ message: 'Record not found' });
            res.json(record);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });
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

// ─── Admin Middleware ────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ojttrackerapp@gmail.com';

const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || user.email !== ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Admin access only' });
        }
        req.userId = decoded.userId;
        req.adminUser = user;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// ─── Admin Routes ────────────────────────────────────────────────────────────

// GET /api/admin/stats — Aggregate platform statistics
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({});
        const allRecords = await Record.find({});
        const totalHours = allRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const recentUserIds = new Set(
            allRecords
                .filter(r => new Date(r.date) >= thirtyDaysAgo)
                .map(r => r.userId.toString())
        );

        res.json({
            totalStudents: users.length,
            totalRecords: allRecords.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            avgHoursPerStudent: users.length ? parseFloat((totalHours / users.length).toFixed(2)) : 0,
            activeThisMonth: recentUserIds.size
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/users — All students with per-student summary
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({});
        const summaries = await Promise.all(users.map(async (u) => {
            const records = await Record.find({ userId: u._id }).sort({ date: -1 });
            const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
            const categories = {};
            records.forEach(r => {
                if (r.category) {
                    categories[r.category] = (categories[r.category] || 0) + (r.totalHours || 0);
                }
            });
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                picture: u.picture,
                totalRecords: records.length,
                totalHours: parseFloat(totalHours.toFixed(2)),
                lastActive: records.length ? records[0].date : null,
                categories
            };
        }));
        res.json(summaries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/users/:id/records — All records for a specific student
app.get('/api/admin/users/:id/records', verifyAdmin, async (req, res) => {
    try {
        const records = await Record.find({ userId: req.params.id }).sort({ date: 1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
