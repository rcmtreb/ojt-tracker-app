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
    picture: String,
    targetHours: { type: Number, default: 486 },
    companyName: { type: String, default: '' },
    department: { type: String, default: '' },
    supervisorName: { type: String, default: '' },
    courseProgram: { type: String, default: '' },
    defaultStartTime: { type: String, default: '08:00' },
    defaultEndTime: { type: String, default: '17:00' },
    defaultBreakDuration: { type: Number, default: 60 },
    includeSignatureBlock: { type: Boolean, default: true },
    ojtStatus: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    completedAtDate: { type: String, default: null },
    currentBatch: { type: Number, default: 1 },
    internshipHistory: [{
        batchNumber: Number,
        companyName: String,
        department: String,
        supervisorName: String,
        courseProgram: String,
        targetHours: Number,
        totalHours: Number,
        completedAtDate: String,
        completedAt: { type: Date, default: Date.now }
    }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});
userSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
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
    documentaryUrls: [String],
    internshipBatch: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});
recordSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
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
        if (user && user.isDeleted) {
            return res.status(403).json({ message: 'This account has been deleted. Please contact your administrator if you need to restore it.' });
        }

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

// GET /api/user/profile — Fetch current user profile & settings
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// User Target Sync Route
app.patch('/api/user/target', verifyToken, async (req, res) => {
    try {
        const { targetHours } = req.body;
        const parsed = parseFloat(targetHours);
        if (isNaN(parsed) || parsed <= 0) {
            return res.status(400).json({ message: 'Target hours must be a positive number' });
        }
        const user = await User.findByIdAndUpdate(
            req.userId,
            { targetHours: parsed },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Target hours updated', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// User Full Settings Route
app.patch('/api/user/settings', verifyToken, async (req, res) => {
    try {
        const allowed = [
            'targetHours', 'companyName', 'department', 'supervisorName',
            'courseProgram', 'defaultStartTime', 'defaultEndTime',
            'defaultBreakDuration', 'includeSignatureBlock'
        ];
        const updateData = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        if (updateData.targetHours !== undefined) {
            updateData.targetHours = parseFloat(updateData.targetHours) || 486;
        }
        if (updateData.defaultBreakDuration !== undefined) {
            updateData.defaultBreakDuration = parseInt(updateData.defaultBreakDuration) || 0;
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Settings saved successfully', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Student Mark OJT Complete Route
app.patch('/api/user/complete', verifyToken, async (req, res) => {
    try {
        const { completedAtDate } = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            {
                ojtStatus: 'completed',
                completedAtDate: completedAtDate || new Date().toISOString().split('T')[0]
            },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'OJT marked as completed', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Student Start New OJT Route
app.post('/api/user/start-new-ojt', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const records = await Record.find({ userId: user._id, isDeleted: { $ne: true }, internshipBatch: user.currentBatch || 1 });
        const totalHoursBatch = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

        const completedHistoryItem = {
            batchNumber: user.currentBatch || 1,
            companyName: user.companyName || '',
            department: user.department || '',
            supervisorName: user.supervisorName || '',
            courseProgram: user.courseProgram || '',
            targetHours: user.targetHours || 486,
            totalHours: parseFloat(totalHoursBatch.toFixed(2)),
            completedAtDate: user.completedAtDate || new Date().toISOString().split('T')[0],
            completedAt: new Date()
        };

        const updatedHistory = [...(user.internshipHistory || []), completedHistoryItem];
        const nextBatch = (user.currentBatch || 1) + 1;

        const updateData = {
            currentBatch: nextBatch,
            internshipHistory: updatedHistory,
            ojtStatus: 'in_progress',
            completedAtDate: null,
            targetHours: req.body.targetHours ? parseFloat(req.body.targetHours) : user.targetHours,
            companyName: req.body.companyName !== undefined ? req.body.companyName : user.companyName,
            department: req.body.department !== undefined ? req.body.department : user.department,
            supervisorName: req.body.supervisorName !== undefined ? req.body.supervisorName : user.supervisorName,
            courseProgram: req.body.courseProgram !== undefined ? req.body.courseProgram : user.courseProgram
        };

        const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true });
        res.json({ message: 'Started new OJT internship successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Records Routes
app.get('/api/records', verifyToken, async (req, res) => {
    try {
        const records = await Record.find({ userId: req.userId, isDeleted: { $ne: true } }).sort({ date: -1 });
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
            const user = await User.findById(req.userId);
            if (user && user.ojtStatus === 'completed') {
                return res.status(400).json({ message: 'OJT Training is marked as completed. Please click "Start New OJT" to log further entries.' });
            }

            const documentaryUrls = req.files ? req.files.map(file => {
                const base64String = file.buffer.toString('base64');
                return `data:${file.mimetype};base64,${base64String}`;
            }) : [];

            const recordData = {
                ...req.body,
                userId: req.userId,
                internshipBatch: user ? (user.currentBatch || 1) : 1,
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
        const users = await User.find({ isDeleted: { $ne: true }, email: { $ne: ADMIN_EMAIL } });
        const allRecords = await Record.find({ isDeleted: { $ne: true } });
        const totalHours = allRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const recentUserIds = new Set(
            allRecords
                .filter(r => new Date(r.date) >= thirtyDaysAgo)
                .map(r => r.userId.toString())
        );

        const completedStudents = users.filter(u => u.ojtStatus === 'completed').length;

        res.json({
            totalStudents: users.length,
            completedStudents,
            totalRecords: allRecords.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            avgHoursPerStudent: users.length ? parseFloat((totalHours / users.length).toFixed(2)) : 0,
            activeThisMonth: recentUserIds.size
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/users — All active students with per-student summary
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ isDeleted: { $ne: true }, email: { $ne: ADMIN_EMAIL } }).lean();
        const summaries = await Promise.all(users.map(async (u) => {
            const records = await Record.find({ userId: u._id, isDeleted: { $ne: true } }).sort({ date: -1 }).lean();
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
                targetHours: u.targetHours || 486,
                companyName: u.companyName || '',
                department: u.department || '',
                supervisorName: u.supervisorName || '',
                courseProgram: u.courseProgram || '',
                ojtStatus: u.ojtStatus || 'in_progress',
                completedAtDate: u.completedAtDate || null,
                currentBatch: u.currentBatch || 1,
                internshipHistory: u.internshipHistory || [],
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

// GET /api/admin/users/archived — List all soft-deleted students within 30-day grace period
app.get('/api/admin/users/archived', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ isDeleted: true, email: { $ne: ADMIN_EMAIL } }).lean();
        const summaries = await Promise.all(users.map(async (u) => {
            const records = await Record.find({ userId: u._id }).lean();
            const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                picture: u.picture,
                targetHours: u.targetHours || 486,
                companyName: u.companyName || '',
                department: u.department || '',
                supervisorName: u.supervisorName || '',
                courseProgram: u.courseProgram || '',
                deletedAt: u.deletedAt,
                totalRecords: records.length,
                totalHours: parseFloat(totalHours.toFixed(2))
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
        const records = await Record.find({ userId: req.params.id, isDeleted: { $ne: true } }).sort({ date: 1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/users/:id/target — Update student target hours
app.patch('/api/admin/users/:id/target', verifyAdmin, async (req, res) => {
    try {
        const { targetHours } = req.body;
        const parsed = parseFloat(targetHours);
        if (isNaN(parsed) || parsed <= 0) {
            return res.status(400).json({ message: 'Target hours must be a positive number' });
        }
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { targetHours: parsed },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ message: 'Target hours updated successfully', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/users/:id/completion — Update student OJT completion status
app.patch('/api/admin/users/:id/completion', verifyAdmin, async (req, res) => {
    try {
        const { ojtStatus, completedAtDate } = req.body;
        const statusVal = ojtStatus === 'completed' ? 'completed' : 'in_progress';
        const dateVal = statusVal === 'completed'
            ? (completedAtDate || new Date().toISOString().split('T')[0])
            : null;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { ojtStatus: statusVal, completedAtDate: dateVal },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Student completion status updated', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/admin/users/:id — Soft-delete a student account and their records
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Student not found' });
        }
        if (targetUser.email === ADMIN_EMAIL) {
            return res.status(400).json({ message: 'The Admin account cannot be deleted.' });
        }

        const now = new Date();
        await User.findByIdAndUpdate(
            userId,
            { isDeleted: true, deletedAt: now },
            { new: true }
        );
        await Record.updateMany(
            { userId },
            { isDeleted: true, deletedAt: now }
        );
        res.json({ message: 'Student account moved to trash. Automatically purged in 30 days unless restored.', userId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/users/:id/restore — Retrieve / Restore a soft-deleted student account
app.patch('/api/admin/users/:id/restore', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndUpdate(
            userId,
            { isDeleted: false, deletedAt: null },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }
        await Record.updateMany(
            { userId },
            { isDeleted: false, deletedAt: null }
        );
        res.json({ message: 'Student account and records successfully restored!', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
