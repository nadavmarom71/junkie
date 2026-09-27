import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, MoveLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const ok = await login(password);
    if (!ok) {
      toast.error('הסיסמה לא התאימה. אפשר לנסות שוב.');
      setPassword('');
    }
    setLoading(false);
  };

  return <main className="junkie-auth-shell" dir="rtl">
    <section className="junkie-auth-card" aria-labelledby="junkie-login-title">
      <div className="junkie-auth-brand" dir="ltr"><span>j<span>.</span></span><strong>junkie<small>YOUR MONEY, IN GOOD HANDS</small></strong></div>
      <div className="junkie-auth-copy"><span className="junkie-auth-kicker">המרחב הפיננסי של נדב</span><h1 id="junkie-login-title">פחות לנחש.<br/>יותר לדעת.</h1><p>הכסף, העסק, דוד ומה שזז בדרך — במקום אחד.</p></div>
      <form className="junkie-auth-form" onSubmit={handleSubmit}>
        <label htmlFor="junkie-password">סיסמה</label>
        <div className="junkie-auth-input"><LockKeyhole size={19}/><input id="junkie-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="הסיסמה שלך" autoComplete="current-password" autoFocus/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>
        <button className="junkie-auth-submit" type="submit" disabled={!password || loading}>{loading ? 'נכנס…' : <>כניסה למרחב <MoveLeft size={18}/></>}</button>
        <small>במחשב המקומי שלך Junkie נשארת מחוברת אוטומטית.</small>
      </form>
    </section>
    <aside className="junkie-auth-orbit" aria-hidden="true"><div><span>עו״ש</span><strong>היום</strong></div><div><span>תזרים</span><strong>קדימה</strong></div><div><span>דוד</span><strong>מחושב</strong></div></aside>
  </main>;
}
