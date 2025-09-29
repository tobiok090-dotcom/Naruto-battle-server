// server.js

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app); 

// ⚠️ يجب تغيير هذا الرابط إلى رابط لعبتك النهائي على Vercel:
// https://naruto-card-game-od2enrwm9-tobiok090s-projects.vercel.app
const CLIENT_ORIGIN = 'https://naruto-card-game-od2enrwm9-tobiok090s-projects.vercel.app'; 

// إعداد CORS للسماح للعبتك بالتواصل مع الخادم
app.use(cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
}));
app.use(express.json());


// =================================================================
// إعداد Socket.IO
// =================================================================
const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST"]
    }
});

// متغيرات لتخزين حالة اللعبة
let pendingRequests = []; // طلبات القدرات المعلقة
const HOST_ID = 'your_unique_host_id_123'; // ⚠️ رمز تعريفي خاص بك (المضيف)

io.on('connection', (socket) => {
    console.log(`مستخدم جديد متصل: ${socket.id}`);

    // التسجيل: يجب على كل متصل أن يحدد هويته (مضيف أو لاعب)
    socket.on('register', (data) => {
        if (data.id === HOST_ID) {
            socket.join('host-room'); // وضع المضيف في غرفة خاصة لتلقي الإشعارات
            console.log('تم تسجيل المضيف.');
        } else {
            socket.join('player-room');
            console.log(`تم تسجيل اللاعب: ${data.id}`);
        }
    });

    // 1. استقبال طلب القدرة من اللاعب
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
        console.log(`طلب قدرة جديد من اللاعب ${data.playerId} - بانتظار المضيف.`);
    });
    
    // 2. استقبال قرار المضيف
    socket.on('host_decision', (data) => {
        // البحث عن الطلب وتحديث حالته
        const requestIndex = pendingRequests.findIndex(r => r.requestId === data.requestId);
        if (requestIndex !== -1) {
            // حذف الطلب المعالج
            pendingRequests.splice(requestIndex, 1);

            // إرسال القرار لجميع اللاعبين
            io.emit('ability_resolved', {
                playerId: data.playerId,
                ability: data.ability,
                decision: data.decision, // 'accept' أو 'reject'
                message: `تم ${data.decision === 'accept' ? 'قبول' : 'رفض'} قدرة ${data.ability} للاعب ${data.playerId}`
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('مستخدم قطع الاتصال');
    });
});

// =================================================================
// تشغيل الخادم (يستخدم منفذ Render)
// =================================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`خادم ناروتو يعمل الآن على المنفذ: ${PORT}`);
});
