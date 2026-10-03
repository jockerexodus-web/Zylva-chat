require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY manquant dans .env');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS bloqué'));
    }
  }
}));

app.use(express.json());

// Rate limiting : 5 emails / 15 min / IP
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de demandes, réessaie dans 15 minutes' }
});

// ============= TEMPLATE EMAIL =============
function emailTemplate(code) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#111113;border:1px solid #232327;border-radius:20px;padding:40px;">

          <!-- Logo / Titre -->
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <div style="font-size:32px;letter-spacing:3px;color:#f5f5f5;font-weight:300;">
                zylva<span style="color:#2dd4bf;font-weight:700;">labs</span>
              </div>
              <div style="font-size:11px;color:#8a8a94;letter-spacing:8px;margin-top:8px;">
                LABS
              </div>
            </td>
          </tr>

          <!-- Titre -->
          <tr>
            <td style="padding-bottom:15px;">
              <h2 style="margin:0;color:#f5f5f5;font-size:18px;font-weight:600;">
                Ton code de vérification
              </h2>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding-bottom:25px;">
              <p style="margin:0;color:#8a8a94;font-size:14px;line-height:1.6;">
                Utilise ce code pour te connecter à Zylva Labs :
              </p>
            </td>
          </tr>

          <!-- Code -->
          <tr>
            <td align="center" style="padding-bottom:25px;">
              <table cellpadding="0" cellspacing="0" style="background:#17171a;border:1px solid #232327;border-radius:12px;">
                <tr>
                  <td style="padding:25px 40px;">
                    <div style="font-size:36px;font-weight:700;color:#2dd4bf;letter-spacing:8px;font-family:'Courier New',monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Info expiration -->
          <tr>
            <td style="padding-bottom:30px;">
              <p style="margin:0;color:#8a8a94;font-size:12px;line-height:1.6;">
                Ce code expire dans <strong style="color:#2dd4bf;">10 minutes</strong>.<br>
                Si tu n'es pas à l'origine de cette demande, ignore cet email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #232327;padding-top:20px;">
              <p style="margin:0;color:#8a8a94;font-size:11px;text-align:center;">
                © Zylva Labs — Messagerie sécurisée
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ============= ROUTES =============
app.get('/', (req, res) => {
  res.json({ service: 'Zylva Labs API', status: 'ok', version: '1.0.0' });
});

app.post('/api/send-code', emailLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Zylva Labs <onboarding@resend.dev>',
      to: email,
      subject: `🧏 Ton code Zylva Labs : ${code}`,
      html: emailTemplate(code)
    });

    if (error) {
      console.error('❌ Resend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Email envoyé à ${email} (id: ${data.id})`);
    res.json({ success: true, id: data.id });

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Zylva Labs API sur http://localhost:${PORT}`);
  console.log(`📧 From: ${process.env.FROM_EMAIL || 'onboarding@resend.dev'}`);
});
