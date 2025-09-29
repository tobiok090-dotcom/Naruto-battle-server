// server.js - كود الخادم الخلفي لإدارة التحكم الفوري في اللعبة

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app); 

// =================================================================
// ⚠️ 1. بيانات تسجيل دخول المضيف (يجب أن تتطابق مع ما أدخلته)
// =================================================================
const HOST_USERNAME = 'naruto-card-clash'; 
const HOST_PASSWORD = 'katsuki123'; // ملاحظة: يجب تخزين كلمات السر بشكل آمن في الإنتاج!

// =================================================================
// ⚠️ 2. رابط لعبتك الأمامية على Vercel (مهم جداً لعمل CORS)
// =================================================================
const CLIENT_ORIGIN = 'https://naruto-card-game-od2enrwm9-tobiok090s-projects.vercel.app'; 

// إعداد CORS للسماح للعبتك بالاتصال بالخادم
app.use(cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
}));
app.use(express.json());


// =================================================================
// تهيئة Socket.IO
// =================================================================
const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST"]
    }
});

// متغير لتخزين طلبات القدرات المعلقة
let pendingRequests = []; 
let connectedUsers = {}; // لتخزين معلومات الاتصال والمستخدمين

io.on('connection', (socket) => {
    console.log(`مستخدم جديد متصل: ${socket.id}`);

    // =================================================================
    // منطق التسجيل وتحديد الدور (المضيف/اللاعب)
    // =================================================================
    socket.on('register', (data) => {
        const { username, password } = data;

        if (username === HOST_USERNAME && password === HOST_PASSWORD) {
            socket.join('host-room'); // وضع المضيف في غرفة خاصة
            connectedUsers[socket.id] = { id: username, role: 'host' };
            console.log('✅ تم تسجيل المضيف بنجاح.');
            // إرسال أي طلبات معلقة للمضيف فور تسجيل الدخول
            if (pendingRequests.length > 0) {
                 socket.emit('pending_requests', pendingRequests);
            }
        } else {
            // أي مستخدم آخر يتم تسجيله كلاعب
            socket.join('player-room'); 
            connectedUsers[socket.id] = { id: username, role: 'player' };
            console.log(`✅ تم تسجيل اللاعب: ${username}`);
        }
    });

    // =================================================================
    // 1. استقبال طلب القدرة من اللاعب
    // =================================================================
    socket.on('request_ability', (data) => {
        const requestId = Date.now();
        const request = { 
            requestId: requestId, 
            playerId: data.playerId, 
            ability: data.abilityName,
            status: 'pending'
        };
        pendingRequests.push(request);

        // إرسال إشعار فوري إلى المضيف فقط
        io.to('host-room').emit('new_request', request); 
        console.log(`📢 طلب قدرة جديد من اللاعب ${data.playerId}: ${data.abilityName}`);
    });
    
    // =================================================================
    // 2. استقبال قرار المضيف
    // =================================================================
    socket.on('host_decision', (data) => {
        // البحث عن الطلب وتحديث حالته
        const requestIndex = pendingRequests.findIndex(r => r.requestId === data.requestId);
        if (requestIndex !== -1) {
            
            // إرسال القرار لجميع المستخدمين
            io.emit('ability_resolved', {
                playerId: data.playerId,
                ability: data.ability,
                decision: data.decision, // 'accept' أو 'reject'
            });

            // حذف الطلب المعالج
            pendingRequests.splice(requestIndex, 1);
        }
    });

    socket.on('disconnect', () => {
        delete connectedUsers[socket.id];
        console.log('مستخدم قطع الاتصال');
    });
});

// =================================================================
// تشغيل الخادم على منفذ Render
// =================================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`خادم ناروتو (Render) يعمل الآن على المنفذ: ${PORT}`);
});
