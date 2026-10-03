// ============================================================
// 📧 CONFIGURATION EMAIL — Zylva Labs
// ============================================================
// Choisis UNE méthode et remplis la config correspondante.
// Mets celle que tu veux en "active: true".
// ============================================================

const EMAIL_CONFIG = {

  // ────────────────────────────────────────────────
  // 🥇 OPTION 1 : EMAILJS (le plus simple, 0 backend)
  // ────────────────────────────────────────────────
  // 1. Va sur https://emailjs.com → Sign up (gratuit)
  // 2. Email Services → Add Service → Gmail (ou autre)
  // 3. Email Templates → Create → colle le template ci-dessous
  // 4. Account → copie Public Key
  // ────────────────────────────────────────────────
  emailjs: {
    active: false, // ← mets true
    serviceId: 'service_xxxxxxx',
    templateId: 'template_xxxxxxx',
    publicKey: 'XXXXXXXXXXXXXXXXXXXX'
  },

  // ────────────────────────────────────────────────
  // 🥈 OPTION 2 : RESEND (recommandé, 3000/mois gratuit)
  // ────────────────────────────────────────────────
  // 1. Va sur https://resend.com → Sign up
  // 2. API Keys → Create → copie la clé
  // 3. Déploie le backend (dossier server/)
  // 4. Colle l'URL du backend ici
  // ────────────────────────────────────────────────
  resend: {
    active: true, // ← ACTIF PAR DÉFAUT
    apiUrl: 'http://localhost:3000/api/send-code'
    // En prod : 'https://zylva-labs-api.onrender.com/api/send-code'
  },

  // ────────────────────────────────────────────────
  // 🥉 OPTION 3 : MODE DÉMO (aucun email envoyé)
  // ────────────────────────────────────────────────
  // Le code s'affiche à l'écran. Parfait pour tester.
  demo: {
    active: false // ← mets true pour tester sans backend
  }
};

// ============================================================
// 📧 TEMPLATE EMAILJS à copier-coller dans EmailJS
// ============================================================
/*
Sujet : 🧏 Ton code Zylva Labs : {{code}}

Corps (HTML) :

<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; padding: 40px; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2dd4bf; letter-spacing: 2px; font-weight: 300; margin: 0;">
      zylva<span style="font-weight: 700;">labs</span>
    </h1>
  </div>

  <h2 style="color: #f5f5f5; font-size: 18px; margin-bottom: 15px;">
    Ton code de vérification
  </h2>

  <p style="color: #8a8a94; font-size: 14px; line-height: 1.6;">
    Utilise ce code pour te connecter à Zylva Labs :
  </p>

  <div style="background: #17171a; border: 1px solid #232327; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
    <div style="font-size: 36px; font-weight: 700; color: #2dd4bf; letter-spacing: 8px;">
      {{code}}
    </div>
  </div>

  <p style="color: #8a8a94; font-size: 12px; line-height: 1.6;">
    Ce code expire dans <strong style="color:#2dd4bf;">10 minutes</strong>.<br>
    Si tu n'es pas à l'origine de cette demande, ignore cet email.
  </p>

  <hr style="border: none; border-top: 1px solid #232327; margin: 30px 0;">

  <p style="color: #8a8a94; font-size: 11px; text-align: center;">
    © Zylva Labs — Messagerie sécurisée
  </p>
</div>
*/
