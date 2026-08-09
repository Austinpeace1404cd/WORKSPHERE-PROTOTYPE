const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Public Frontend & Uploads Directory
app.use(express.static(path.join(__dirname, 'public')));
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer Disk Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// IN-MEMORY DATABASE STATE
let db = {
    users: [
        { 
            id: '1', 
            name: 'Chidi Okeke', 
            email: 'chidi@dev.ng', 
            password: 'password123',
            role: 'freelancer', 
            bio: 'Senior Full-Stack Node & React Developer based in Lagos.', 
            skills: 'React, Node.js, Tailwind, PostgreSQL', 
            stars: 4, 
            photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250', 
            workImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400', 
            isBlocked: false, 
            wallet: 1200, 
            refCode: 'CHIDI123' 
        },
        { 
            id: '2', 
            name: 'Amina Bello', 
            email: 'amina@design.ng', 
            password: 'password123',
            role: 'freelancer', 
            bio: 'Lead UI/UX & Brand Identity Designer specialized in Fintech SaaS.', 
            skills: 'Figma, UI/UX, Mobile Apps, Design Systems', 
            stars: 5, 
            photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250', 
            workImg: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=400', 
            isBlocked: false, 
            wallet: 850, 
            refCode: 'AMINA456' 
        }
    ],
    jobs: [
        { id: 'j1', title: 'Fintech Mobile App Frontend', type: 'Full-Time', budget: '₦250,000/mo', description: 'Looking for an expert React Native developer to build clean financial dashboards.' },
        { id: 'j2', title: 'Brand Identity & Logo Redesign', type: 'Half-Time', budget: '₦120,000/mo', description: 'Need clean brand design, logo variations, and social media media kits.' }
    ],
    offers: [],           // Contract letters
    payments: [],         // Smart Cash receipts
    withdrawals: [],      // User withdrawal requests
    workSubmissions: [],  // Submitted deliverables
    transactions: [],     // Audit ledger
    platformRevenue: 0,
    bankDetails: {
        accountNumber: "9117828218",
        bankName: "SMART CASH",
        accountName: "ABIDEMI SADU"
    }
};

// ==================== API ENDPOINTS ==================== //

// Get Database State
app.get('/api/state', (req, res) => {
    res.json(db);
});

// User Registration with Password & File Uploads
app.post('/api/register', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'workImg', maxCount: 1 }]), (req, res) => {
    try {
        const { name, email, password, role, bio, skills, refCodeUsed } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, Email, and Password are required!' });
        }

        const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email address is already registered!' });
        }

        const photoUrl = req.files && req.files['photo'] 
            ? `/uploads/${req.files['photo'][0].filename}` 
            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250';

        const workUrl = req.files && req.files['workImg'] 
            ? `/uploads/${req.files['workImg'][0].filename}` 
            : 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400';

        const myRefCode = name.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

        const newUser = {
            id: Date.now().toString(),
            name,
            email: email.toLowerCase(),
            password: password,
            role: role || 'freelancer',
            bio: bio || '',
            skills: skills || '',
            stars: 1,
            photo: photoUrl,
            workImg: workUrl,
            isBlocked: false,
            wallet: 0,
            refCode: myRefCode,
            referredBy: refCodeUsed || null
        };

        // Referral Reward: Credit ₦400 to Referrer
        if (refCodeUsed) {
            const referrer = db.users.find(u => u.refCode === refCodeUsed.trim().toUpperCase());
            if (referrer) {
                referrer.wallet += 400;
                db.transactions.push({
                    id: 'tx-' + Date.now(),
                    userId: referrer.id,
                    userName: referrer.name,
                    type: `Referral Bonus (New User: ${name})`,
                    amount: '₦400.00',
                    date: new Date().toLocaleDateString()
                });
            }
        }

        db.users.push(newUser);
        res.json({ success: true, user: newUser, message: 'Registration successful! You can now log in anytime.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// User & Admin Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // ADMIN AUTHENTICATION
    if (password === 'admin@web.org') {
        return res.json({
            success: true,
            user: { id: 'admin', name: 'System Administrator', email: email || 'admin@web.org', role: 'admin' }
        });
    }

    const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found! Please register first.' });
    }

    if (user.password && user.password !== password) {
        return res.status(400).json({ success: false, message: 'Incorrect Password! Please try again.' });
    }

    if (user.isBlocked) {
        return res.status(403).json({ success: false, message: 'ACCOUNT SUSPENDED: Your account has been blocked for terms violations.' });
    }

    res.json({ success: true, user, message: 'Welcome back!' });
});

// WITHDRAWAL SYSTEM (Rule: Must leave at least ₦10 in balance)
app.post('/api/withdraw', (req, res) => {
    const { userId, accountName, bankName, accountNumber, amount } = req.body;
    const user = db.users.find(u => u.id === userId);

    if (!user) return res.status(404).json({ success: false, message: 'User record not found.' });

    const reqAmount = parseFloat(amount) || 0;
    const maxAllowedWithdrawal = Math.max(0, user.wallet - 10);

    if (reqAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Please enter a valid withdrawal amount!' });
    }

    if (reqAmount > maxAllowedWithdrawal) {
        return res.status(400).json({ 
            success: false, 
            message: `Withdrawal rejected! You must leave at least ₦10 in your account balance. Your maximum withdrawable amount is ₦${maxAllowedWithdrawal.toLocaleString()}.00` 
        });
    }

    // Create Withdrawal Request
    const withdrawal = {
        id: 'wd-' + Date.now(),
        userId,
        userName: user.name,
        accountName,
        bankName,
        accountNumber,
        amount: reqAmount,
        status: 'Pending Admin Approval',
        date: new Date().toLocaleDateString()
    };

    db.withdrawals.push(withdrawal);
    res.json({ 
        success: true, 
        message: `Withdrawal request for ₦${reqAmount.toLocaleString()}.00 submitted! Admin will verify and process payment to ${bankName} (${accountNumber}).` 
    });
});

// Admin Process Withdrawal Request (Approve/Reject)
app.post('/api/admin/verify-withdrawal', (req, res) => {
    const { withdrawalId, action } = req.body;
    const withdrawal = db.withdrawals.find(w => w.id === withdrawalId);

    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });

    const user = db.users.find(u => u.id === withdrawal.userId);

    if (action === 'Approve') {
        if (user) {
            if (user.wallet < withdrawal.amount) {
                return res.status(400).json({ success: false, message: 'User wallet balance is insufficient.' });
            }
            user.wallet -= withdrawal.amount; // Deduct funds on approval
        }
        withdrawal.status = 'Approved & Paid';

        db.transactions.push({
            id: 'tx-' + Date.now(),
            userId: withdrawal.userId,
            userName: withdrawal.userName,
            type: `Bank Withdrawal Payout (${withdrawal.bankName})`,
            amount: `-₦${withdrawal.amount.toLocaleString()}.00`,
            date: new Date().toLocaleDateString()
        });

        res.json({ success: true, message: 'Withdrawal approved & funds deducted from user wallet!' });
    } else {
        withdrawal.status = 'Rejected';
        res.json({ success: true, message: 'Withdrawal request rejected.' });
    }
});

// Upload Payment Receipt (Smart Cash Transfer Verification)
app.post('/api/upload-receipt', upload.single('receipt'), (req, res) => {
    try {
        const { userId, type, amount, targetId, details } = req.body;
        const user = db.users.find(u => u.id === userId);
        if (!user) return res.status(404).json({ success: false, message: 'User record not found.' });

        const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const payment = {
            id: 'pay-' + Date.now(),
            userId,
            userName: user.name,
            type: type || 'Platform Payment',
            amount: parseFloat(amount) || 0,
            targetId: targetId || null,
            details: details || '',
            receiptUrl,
            status: 'Pending Verification',
            date: new Date().toLocaleDateString()
        };

        db.payments.push(payment);
        res.json({ success: true, message: 'Payment receipt submitted! Pending Admin verification.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Verify Payment Receipt
app.post('/api/admin/verify-payment', (req, res) => {
    const { paymentId, action } = req.body;
    const payment = db.payments.find(p => p.id === paymentId);

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    if (action === 'Approve') {
        payment.status = 'Approved';
        db.platformRevenue += payment.amount;

        const user = db.users.find(u => u.id === payment.userId);

        if (payment.type === 'Star Purchase' && user) {
            const starsToSet = parseInt(payment.targetId) || 3;
            user.stars = Math.max(user.stars, starsToSet);
        }

        if (payment.type === 'Job Escrow') {
            const offer = {
                id: 'off-' + Date.now(),
                employerId: payment.userId,
                employerName: payment.userName,
                workerId: payment.targetId,
                type: 'Contract Hire',
                salary: payment.amount,
                message: 'Official Contract Offer with Escrow Deposit',
                status: 'Pending Worker Acceptance'
            };
            db.offers.push(offer);
        }

        db.transactions.push({
            id: 'tx-' + Date.now(),
            userId: payment.userId,
            userName: payment.userName,
            type: `${payment.type} (Verified)`,
            amount: `₦${payment.amount.toLocaleString()}.00`,
            date: new Date().toLocaleDateString()
        });

        res.json({ success: true, message: 'Payment approved & service activated!' });
    } else {
        payment.status = 'Rejected';
        res.json({ success: true, message: 'Payment receipt rejected.' });
    }
});

// Worker Accepts/Declines Job Offer
app.post('/api/respond-offer', (req, res) => {
    const { offerId, status } = req.body;
    const offer = db.offers.find(o => o.id === offerId);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    offer.status = status;
    res.json({ success: true, message: `Contract offer has been ${status}.` });
});

// Worker Submits Work Deliverable File
app.post('/api/submit-work', upload.single('workFile'), (req, res) => {
    const { offerId, workerId, notes } = req.body;
    const offer = db.offers.find(o => o.id === offerId);
    if (!offer) return res.status(404).json({ success: false, message: 'Contract offer not found.' });

    const submission = {
        id: 'sub-' + Date.now(),
        offerId,
        workerId,
        employerId: offer.employerId,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        notes: notes || '',
        status: 'Submitted to Admin',
        submittedAt: new Date().toLocaleDateString()
    };

    db.workSubmissions.push(submission);
    offer.status = 'Work Submitted (Pending Admin Review)';
    res.json({ success: true, message: 'Deliverable submitted to Platform Admin for inspection!' });
});

// Admin Forwards Delivered Work to Employer
app.post('/api/admin/deliver-work', (req, res) => {
    const { submissionId } = req.body;
    const sub = db.workSubmissions.find(s => s.id === submissionId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission record not found.' });

    sub.status = 'Delivered to Employer';
    const offer = db.offers.find(o => o.id === sub.offerId);
    if (offer) offer.status = 'Work Delivered (Awaiting Rating)';

    res.json({ success: true, message: 'Work deliverable forwarded to Employer!' });
});

// Employer Rates Worker
app.post('/api/rate-worker', (req, res) => {
    const { workerId, offerId, rating } = req.body;
    const worker = db.users.find(u => u.id === workerId);
    if (worker) {
        worker.stars = Math.min(5, Math.max(1, Math.round((worker.stars + parseInt(rating)) / 2)));
    }

    const offer = db.offers.find(o => o.id === offerId);
    if (offer) offer.status = 'Completed & Rated';

    res.json({ success: true, message: 'Worker rating updated!' });
});

// Admin Toggle User Block/Unblock Status
app.post('/api/admin/toggle-block', (req, res) => {
    const { userId } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isBlocked = !user.isBlocked;
    res.json({
        success: true,
        message: `Account has been ${user.isBlocked ? 'SUSPENDED/BLOCKED' : 'UNBLOCKED'}.`,
        isBlocked: user.isBlocked
    });
});

// Ad Watch Micro-Task
app.post('/api/complete-task', (req, res) => {
    const { userId } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.wallet += 50;
    db.transactions.push({
        id: 'tx-' + Date.now(),
        userId: user.id,
        userName: user.name,
        type: 'Ad Task Earnings',
        amount: '₦50.00',
        date: new Date().toLocaleDateString()
    });

    res.json({ success: true, newBalance: user.wallet, message: '₦50 credited to your wallet balance!' });
});

// Epic SphereAI Engine
app.post('/api/ai/chat', (req, res) => {
    const { prompt } = req.body;
    const query = (prompt || '').toLowerCase();

    let reply = "I am SphereAI. How can I help you hire, optimize your profile, or earn cash on WorkSphere?";

    if (query.includes('hire') || query.includes('developer') || query.includes('designer')) {
        const top = db.users.filter(u => u.role === 'freelancer' && !u.isBlocked).sort((a,b) => b.stars - a.stars).slice(0, 2);
        reply = `🤖 **SphereAI Worker Recommendations**:\n` + top.map(w => `• **${w.name}** (${w.stars}★) - Skills: ${w.skills}`).join('\n') + `\n\nNavigate to 'Pick Workers' to issue contract letters!`;
    } else if (query.includes('star') || query.includes('boost')) {
        reply = "⭐ **Profile Ranking Tip**:\n4-Star and 5-Star profiles appear at the top of employer searches. Head over to 'Buy Star Ratings' and send transfer to Smart Cash Account (9117828218) to rank higher!";
    } else if (query.includes('earn') || query.includes('task') || query.includes('referral')) {
        reply = "💰 **Earning Tips**:\n1. Share your Referral Link to get **₦400** per registration.\n2. Complete Sponsored Ad tasks to receive **₦50** instant wallet credits!";
    }

    res.json({ success: true, reply });
});

// Smart Catch-all Route to serve Frontend SPA
app.get('*', (req, res) => {
    const publicPath = path.join(__dirname, 'public', 'index.html');
    const rootPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(publicPath)) {
        res.sendFile(publicPath);
    } else if (fs.existsSync(rootPath)) {
        res.sendFile(rootPath);
    } else {
        res.status(404).send("WorkSphere API Active. Please check index.html file placement.");
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 WorkSphere Backend Server Live on Port ${PORT}`);
    console.log(`💳 Smart Cash Account: 9117828218 | ABIDEMI SADU`);
    console.log(`🔑 Admin Access Password: admin@web.org`);
    console.log(`====================================================`);
});
