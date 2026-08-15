// صوت تنبيه بسيط (بيب) بدون أي ملف صوتي خارجي، باستخدام Web Audio API
export function playNotificationBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // نغمتين سريعتين عشان يبقى واضح إنه تنبيه مش نغمة عادية
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.18);
    });

    setTimeout(() => ctx.close(), 800);
  } catch {
    // متصفحات بعض المتصفحات بتمنع الصوت قبل أول تفاعل من المستخدم، مفيش مشكلة لو الصوت متشغلش
  }
}
