require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Delete existing users
        await usersCollection.deleteMany({});
        console.log('Cleared existing users.');

        const hashedPassword = await bcrypt.hash('password123', 12);
        const now = new Date();

        const users = [
            {
                name: 'Director Admin',
                email: 'director@company.com',
                password: hashedPassword,
                role: 'director',
                department: 'Management',
                status: 'active',
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: 'Store Manager',
                email: 'storemanager@company.com',
                password: hashedPassword,
                role: 'store_manager',
                department: 'Warehouse',
                status: 'active',
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: 'Manager',
                email: 'manager@company.com',
                password: hashedPassword,
                role: 'manager',
                department: 'Operations',
                status: 'active',
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: 'Employee One',
                email: 'employee@company.com',
                password: hashedPassword,
                role: 'employee',
                department: 'IT',
                status: 'active',
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
            },
        ];

        await usersCollection.insertMany(users);

        // ── Seed sample assets ──
        const assetsCollection = db.collection('assets');
        await assetsCollection.deleteMany({});
        console.log('Cleared existing assets.');

        const assets = [
            { name: 'Dell Laptop XPS 15', category: 'Laptop', serialNumber: 'SN-LAP-001', condition: 'new', status: 'available', vendor: 'Dell India', purchasePrice: 95000, location: 'Shelf A-1', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'MacBook Pro M3', category: 'Laptop', serialNumber: 'SN-LAP-002', condition: 'new', status: 'available', vendor: 'Apple Authorised', purchasePrice: 185000, location: 'Shelf A-2', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'HP EliteBook 840', category: 'Laptop', serialNumber: 'SN-LAP-003', condition: 'good', status: 'available', vendor: 'HP India', purchasePrice: 72000, location: 'Shelf A-3', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'iPad Pro 12.9"', category: 'Tablet', serialNumber: 'SN-TAB-001', condition: 'new', status: 'available', vendor: 'Apple Authorised', purchasePrice: 112000, location: 'Shelf B-1', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'Samsung Galaxy Tab S9', category: 'Tablet', serialNumber: 'SN-TAB-002', condition: 'good', status: 'available', vendor: 'Samsung India', purchasePrice: 65000, location: 'Shelf B-2', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'iPhone 15 Pro', category: 'Phone', serialNumber: 'SN-PHN-001', condition: 'new', status: 'available', vendor: 'Apple Authorised', purchasePrice: 134900, location: 'Shelf C-1', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'LG UltraWide Monitor 27"', category: 'Monitor', serialNumber: 'SN-MON-001', condition: 'new', status: 'available', vendor: 'LG India', purchasePrice: 28000, location: 'Shelf D-1', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'Logitech MX Keys Keyboard', category: 'Keyboard', serialNumber: 'SN-KEY-001', condition: 'new', status: 'available', vendor: 'Logitech', purchasePrice: 9500, location: 'Drawer E-1', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'Sony WH-1000XM5 Headset', category: 'Headset', serialNumber: 'SN-AUD-001', condition: 'good', status: 'available', vendor: 'Sony India', purchasePrice: 29990, location: 'Drawer E-2', isDeleted: false, createdAt: now, updatedAt: now },
            { name: 'Employee ID Card - Template', category: 'ID Card', serialNumber: 'SN-IDC-001', condition: 'new', status: 'available', vendor: 'In-house', purchasePrice: 150, location: 'Cabinet F-1', isDeleted: false, createdAt: now, updatedAt: now },
        ];

        await assetsCollection.insertMany(assets);
        console.log(`Inserted ${assets.length} sample assets.`);

        console.log('Database seeded successfully!');
        console.log('');
        console.log('Login credentials (password: password123):');
        console.log('  director@company.com');
        console.log('  storemanager@company.com');
        console.log('  manager@company.com');
        console.log('  employee@company.com');
    } catch (err) {
        console.error('Seed error:', err.message);
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
