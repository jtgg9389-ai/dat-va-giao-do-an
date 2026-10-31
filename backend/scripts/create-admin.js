// Optional bootstrap for a NEW database; never overwrites an existing account.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
(async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || !process.env.MONGO_URI) throw Error('Cấu hình MONGO_URI, ADMIN_EMAIL và ADMIN_PASSWORD (ít nhất 12 ký tự) trong .env trước khi chạy.');
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const current = await User.findOne({ email });
    if (current) throw Error('Email đã tồn tại. Không ghi đè hay tự nâng quyền tài khoản có sẵn.');
    await User.create({ name: 'Quản trị viên', email, password: await bcrypt.hash(password, 12), role: 'admin' });
    console.log('Đã tạo admin. Xóa ADMIN_PASSWORD khỏi cấu hình sau khi hoàn tất.');
  } finally { await mongoose.disconnect(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
