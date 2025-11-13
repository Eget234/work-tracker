# İş Takip – Statik Demo (Password Gate + Role)

Bu proje GitHub Pages üzerinde çalışacak şekilde **tamamen statik** (HTML/CSS/JS).

## Özellikler
- İlk ekranda **şifre kapısı** (HELLOWORLD).
- Rol tabanlı giriş: **admin** kullanıcı yeni kullanıcı ekleyebilir, görev atayabilir.
- Workflow (aşamalar) yönetimi: aşama ekle/kaldır/sıfırla.
- Görevler listesi: filtreler (sadece benim görevlerim, tamamlananları gizle), ilerletme ve bitirme.
- Tüm veriler **localStorage**'da saklanır (tarayıcı bazlı).

> Not: Gerçek çok kullanıcılı senaryoda (farklı bilgisayarlardan aynı veriyi görme) bir **backend** gerekir (Supabase/Firebase gibi). Bu demo, konsepti doğrulamak ve GitHub Pages'ta koşmak içindir.

## Varsayılan Giriş
- Şifre kapısı: `HELLOWORLD`
- Admin kullanıcı: `admin / Admin@123`

## Yayınlama
1. Dosyaları bir GitHub repo'ya yükle (`index.html`, `styles.css`, `app.js`).
2. **Settings → Pages → Branch: main, Folder: /(root)**.
3. Adres: `https://<kullanıcı>.github.io/<repo>/`

## Güvenlik Uyarısı
Şifre kapısı istemci tarafında SHA-256 ile kontrol edilir, gerçek güvenlik sağlamaz. Sadece kapı etkisi için yeterlidir. Gerçek erişim kontrolü için Cloudflare Access / Netlify Password / Firebase Auth vb. kullanın.
