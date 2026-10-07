# عُقدة سحب — sa1

حزمة **جاهزة ومجهّزة بالكامل** لهذا المزوّد: **cloudflare**.
العُقدة تسرّع السحب التلقائي عبر موازاة العمل مع السيرفر الأصلي
— **بدون** تخزين أي بيانات قاعدة هنا.

- رابط اللوحة: `https://tv-api.verx1.xyz/0000`
- التوكن: `nd_ضع-توكن-العقدة-هنا`
- نطاق العمل: كل المواقع

## النشر على Cloudflare Workers

1. `npm i -g wrangler` ثم `wrangler login`.
2. من داخل المجلد: `wrangler deploy`.
3. رابط العُقدة: `https://<name>.<account>.workers.dev`.
بعد أول `wrangler deploy` اضبط المتغيّرات من لوحة Cloudflare
(Workers ← worker ← Settings ← Variables) أو بالأسطر:

```bash
wrangler secret put NODE_TOKEN
wrangler secret put NODE_PANEL_URL
```

4. الكرون (`* * * * *`) مضبوط في `wrangler.toml` ويعمل تلقائيا.

## خطوات النشر التفصيلية

### الطريقة ١ — سطر الأوامر (موصى بها)
```bash
# 1. تثبيت wrangler
npm i -g wrangler

# 2. تسجيل الدخول
wrangler login

# 3. نشر العقدة
cd path/to/extracted-folder
wrangler deploy

# 4. ضبط متغيرات البيئة
wrangler secret put NODE_PANEL_URL
wrangler secret put NODE_TOKEN
```

### الطريقة ٢ — لوحة Cloudflare
1. ارفع المجلد إلى مستودع GitHub
2. ادخل https://dash.cloudflare.com → Workers & Pages → Create
3. Connect to Git ← اختر المستودع
4. Settings → Variables → Add:
   - NODE_PANEL_URL = https://tv-api.verx1.xyz/0000
   - NODE_TOKEN = nd_ضع-توكن-العقدة-هنا (Secret)
   - NODE_NAME = sa1
5. Deploy

### التحقق من النجاح
افتح الرابط في المتصفح: `https://<name>.<account>.workers.dev/`
يجب أن يظهر: `{"ok":true,"node":"<name>"}`

## التأكد من الاتصال

بعد النشر افتح رابط العُقدة — يجب أن يظهر: `{"ok":true,"node":"sa1"}`

بعدها ارجع للوحة ← «عُقد السحب» واضغط **فحص الاتصال**. لما تصير خضراء يبدأ التوزيع تلقائيا.
