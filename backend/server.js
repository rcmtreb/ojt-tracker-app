const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure S3 client (used for presigned URLs)
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET,
    }
});

// Helper to generate presigned PUT URL
async function generatePresignedPutUrl(key, contentType) {
    const putCmd = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: contentType,
        ACL: process.env.S3_PUBLIC === 'true' ? 'public-read' : undefined,
    });
    const url = await getSignedUrl(s3, putCmd, { expiresIn: 900 });
    const publicUrl = process.env.S3_PUBLIC === 'true' ? `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}` : null;
    return { url, key, publicUrl };
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt-tracker')
    .then(() => console.log('MongoDB connected'))
    .catch(() => console.log('MongoDB connection error: Check if MongoDB is running and accessible.'));

// Schemas (unchanged)
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

// S3 presign endpoint
app.post('/api/s3-presign', async (req, res) => {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) return res.status(400).json({ message: 'filename and contentType required' });
    try {
        const key = `uploads/${Date.now()}-${filename}`;
        const presign = await generatePresignedPutUrl(key, contentType);
        res.json(presign);
    } catch (err) {
        console.error('Presign error', err);
        res.status(500).json({ message: 'Failed to generate presigned URL' });
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

app.post('/api/records', verifyToken, async (req, res) => {
    try {
        // Expect JSON body with documentaryUrls array (already uploaded to S3)
        const { documentaryUrls = [] } = req.body;
        const recordData = {
            studentName: req.body.studentName || '',
            date: req.body.date ? new Date(req.body.date) : new Date(),
            startTime: req.body.startTime || '',
            endTime: req.body.endTime || '',
            breakDuration: parseInt(req.body.breakDuration) || 0,
            totalHours: parseFloat(req.body.totalHours) || 0,
            taskDescription: req.body.taskDescription || '',
            documentaryUrls: documentaryUrls,
            userId: req.userId
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

// Basic health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
