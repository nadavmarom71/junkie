import { useState } from 'react';
import { Settings, Bell, Brain, Download, Tag, Save, Target, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  const currentSettings = { ...settings, ...form };

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updateSettings.mutateAsync(form);
      setForm({});
      setDirty(false);
      toast.success('הגדרות נשמרו');
    } catch {
      toast.error('שגיאה בשמירת הגדרות');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const csvExportUrl = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/transactions/export.csv`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-white/70" />
          <h1 className="text-2xl font-bold text-white">הגדרות</h1>
        </div>
        {dirty && (
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? 'שומר...' : 'שמור שינויים'}
          </Button>
        )}
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            הגדרות כלליות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מטבע ברירת מחדל</Label>
              <Select
                value={(currentSettings?.currency as string | undefined) || 'ILS'}
                onValueChange={(v) => set('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪ שקל ישראלי (ILS)</SelectItem>
                  <SelectItem value="USD">$ דולר אמריקאי (USD)</SelectItem>
                  <SelectItem value="EUR">€ אירו (EUR)</SelectItem>
                  <SelectItem value="GBP">£ פאונד בריטי (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>שם העסק</Label>
              <Input
                value={(currentSettings?.business_name as string) || ''}
                onChange={(e) => set('business_name', e.target.value)}
                placeholder="שם העסק שלך"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מטרת הכנסה חודשית (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.monthly_income_goal as number) ?? ''}
                onChange={(e) => set('monthly_income_goal', Number(e.target.value))}
                placeholder="25000"
              />
            </div>
            <div className="space-y-2">
              <Label>תקציב הוצאות חודשי (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.monthly_expense_budget as number) ?? ''}
                onChange={(e) => set('monthly_expense_budget', Number(e.target.value))}
                placeholder="8000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            יעדים פיננסיים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>יעד חיסכון חודשי (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.monthly_savings_goal as number) ?? ''}
                onChange={(e) => set('monthly_savings_goal', Number(e.target.value))}
                placeholder="3000"
              />
            </div>
            <div className="space-y-2">
              <Label>יעד הכנסה שנתי (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.annual_income_goal as number) ?? ''}
                onChange={(e) => set('annual_income_goal', Number(e.target.value))}
                placeholder="300000"
              />
            </div>
          </div>

          <p className="text-sm font-semibold pt-2" style={{ color: 'var(--t2)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>קרן חירום</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מספר חודשי הוצאות לכיסוי</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={(currentSettings?.emergency_fund_months as number) ?? 6}
                onChange={(e) => set('emergency_fund_months', Number(e.target.value))}
                placeholder="6"
              />
              <p className="text-[11px] text-white/40">היעד מחושב אוטומטית: ממוצע הוצאות אישיות × מספר חודשים</p>
            </div>
            <div className="space-y-2">
              <Label>יתרה נוכחית בקרן חירום (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.emergency_fund_target as number) ?? ''}
                onChange={(e) => set('emergency_fund_target', Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <p className="text-sm font-semibold pt-2" style={{ color: 'var(--t2)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>חיסכון לטווח ארוך</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>יעד פנסיה (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.pension_fund_target as number) ?? ''}
                onChange={(e) => set('pension_fund_target', Number(e.target.value))}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label>יתרה נוכחית — פנסיה (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.pension_fund_current as number) ?? ''}
                onChange={(e) => set('pension_fund_current', Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>יעד קרן השתלמות (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.study_fund_target as number) ?? ''}
                onChange={(e) => set('study_fund_target', Number(e.target.value))}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label>יתרה נוכחית — קרן השתלמות (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.study_fund_current as number) ?? ''}
                onChange={(e) => set('study_fund_current', Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>יעד תיק השקעות (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.investment_portfolio_target as number) ?? ''}
                onChange={(e) => set('investment_portfolio_target', Number(e.target.value))}
                placeholder="300000"
              />
            </div>
            <div className="space-y-2">
              <Label>יתרה נוכחית — תיק השקעות (₪)</Label>
              <Input
                type="number"
                value={(currentSettings?.investment_portfolio_current as number) ?? ''}
                onChange={(e) => set('investment_portfolio_current', Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
            <p className="text-xs text-emerald-300">
              🎯 היעדים שלך ישמשו את ה-AI לניתוח יומי ולהמלצות מותאמות אישית. עדכן את היתרות הנוכחיות באופן ידני כשאתה מפקיד.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            הגדרות מס
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Dealer type + Credit points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">עוסק פטור</p>
                <p className="text-xs text-white/50">פטור ממע&quot;מ (מע&quot;מ = 0%)</p>
              </div>
              <Switch
                checked={(currentSettings?.is_exempt_dealer as boolean) ?? true}
                onCheckedChange={(v) => {
                  set('is_exempt_dealer', v);
                  if (v) set('vat_rate', 0);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>נקודות זיכוי</Label>
              <Input
                type="number"
                step="0.25"
                value={(currentSettings?.credit_points as number) ?? 2.75}
                onChange={(e) => set('credit_points', Number(e.target.value))}
                placeholder="2.75"
              />
              <p className="text-[11px] text-white/40">ברירת מחדל: 2.75 (גבר רווק)</p>
            </div>
          </div>

          {/* Row 2: Locality credit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>זיכוי יישוב מוטב (%)</Label>
              <Input
                type="number"
                value={(currentSettings?.locality_credit_rate as number) ?? 16}
                onChange={(e) => set('locality_credit_rate', Number(e.target.value))}
                placeholder="16"
              />
              <p className="text-[11px] text-white/40">נתיבות: 16%</p>
            </div>
            <div className="space-y-2">
              <Label>תקרת הכנסה שנתית לזיכוי</Label>
              <Input
                type="number"
                value={(currentSettings?.locality_credit_ceiling as number) ?? 226560}
                onChange={(e) => set('locality_credit_ceiling', Number(e.target.value))}
                placeholder="226560"
              />
              <p className="text-[11px] text-white/40">נתיבות 2026: ₪226,560</p>
            </div>
          </div>

          {/* Row 3: VAT override (only if not exempt) */}
          {!(currentSettings?.is_exempt_dealer ?? true) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>מע&quot;מ (%)</Label>
                <Input
                  type="number"
                  value={(currentSettings?.vat_rate as number) ?? ''}
                  onChange={(e) => set('vat_rate', Number(e.target.value))}
                  placeholder="17"
                />
              </div>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
            <p className="text-xs text-amber-300">
              📊 מס הכנסה מחושב אוטומטית לפי מדרגות מס 2026 + זיכוי יישוב מוטב. ביטוח לאומי + בריאות מחושב לפי מדרגות עצמאי.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            התראות Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">שלח דוח שבועי ב-Telegram</p>
              <p className="text-xs text-white/50">כל יום שני בבוקר תקבל דוח שבועי</p>
            </div>
            <Switch
              checked={(currentSettings?.telegram_weekly_report as boolean) ?? true}
              onCheckedChange={(v) => set('telegram_weekly_report', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">תזכורות תשלומים</p>
              <p className="text-xs text-white/50">התראה על תשלומים הקרובים ב-3 ימים</p>
            </div>
            <Switch
              checked={(currentSettings?.telegram_payment_reminders as boolean) ?? true}
              onCheckedChange={(v) => set('telegram_payment_reminders', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">התראות AI</p>
              <p className="text-xs text-white/50">שלח תובנות חשובות מה-AI</p>
            </div>
            <Switch
              checked={(currentSettings?.telegram_ai_alerts as boolean) ?? false}
              onCheckedChange={(v) => set('telegram_ai_alerts', v)}
            />
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
            <p className="text-xs text-yellow-300">
              💡 להגדרת Telegram: צור בוט עם @BotFather, קבל את ה-Token וה-Chat ID, והוסף אותם לקובץ <code className="font-mono">.env</code> בשרת.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            הגדרות AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">ניתוח AI יומי אוטומטי</p>
              <p className="text-xs text-white/50">כל בוקר בשעה 6:00 מופעל ניתוח אוטומטי</p>
            </div>
            <Switch
              checked={(currentSettings?.ai_daily_analysis as boolean) ?? true}
              onCheckedChange={(v) => set('ai_daily_analysis', v)}
            />
          </div>
          <div className="space-y-2">
            <Label>מספר תובנות מקסימלי לשמירה</Label>
            <Select
              value={String((currentSettings?.ai_max_insights as number) || '50')}
              onValueChange={(v) => set('ai_max_insights', Number(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 תובנות</SelectItem>
                <SelectItem value="50">50 תובנות</SelectItem>
                <SelectItem value="100">100 תובנות</SelectItem>
                <SelectItem value="200">200 תובנות</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
            <p className="text-xs text-blue-300">
              🤖 ה-AI משתמש במודל <strong>claude-sonnet-4-6</strong> ומדבר אליך בעברית בגוף שני. כל תובנה מבוססת על הנתונים האמיתיים שלך.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            ייצוא נתונים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium text-sm">ייצוא עסקאות (CSV)</p>
                <p className="text-xs text-white/50">כל העסקאות העסקיות בפורמט Excel/CSV</p>
              </div>
              <a
                href={csvExportUrl}
                download="transactions.csv"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  הורד CSV
                </Button>
              </a>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-md p-3">
            <p className="text-xs text-white/60">
              📊 הקובץ נשמר בקידוד UTF-8 עם BOM לתמיכה מלאה בעברית ב-Excel.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            קטגוריות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-white/70 mb-2">קטגוריות הכנסה</p>
              <div className="flex flex-wrap gap-2">
                {((currentSettings?.income_categories as string[]) || [
                  'פרויקטים', 'ריטיינר', 'ייעוץ', 'הכשרות', 'מוצרים', 'הכנסה כללית'
                ]).map((cat: string) => (
                  <Badge key={cat} variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white/70 mb-2">קטגוריות הוצאה עסקית</p>
              <div className="flex flex-wrap gap-2">
                {((currentSettings?.expense_categories as string[]) || [
                  'תוכנה', 'ציוד', 'שיווק', 'חשבונאות', 'משרד', 'נסיעות', 'מנויים', 'הוצאה כללית'
                ]).map((cat: string) => (
                  <Badge key={cat} variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white/70 mb-2">קטגוריות הוצאה אישית</p>
              <div className="flex flex-wrap gap-2">
                {((currentSettings?.personal_categories as string[]) || [
                  'מזון', 'תחבורה', 'בילוי', 'קניות', 'בריאות', 'חינוך', 'שונות'
                ]).map((cat: string) => (
                  <Badge key={cat} variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-white/50">
            לעריכת קטגוריות, ערוך את ה-DEFAULT_SETTINGS בקובץ <code className="font-mono">backend/src/routes/settings.js</code>
          </p>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">מידע מערכת</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white/5 rounded-md">
              <p className="text-xs text-white/50">גרסת Frontend</p>
              <p className="font-semibold text-sm">React 18 + Vite 6</p>
            </div>
            <div className="p-3 bg-white/5 rounded-md">
              <p className="text-xs text-white/50">גרסת Backend</p>
              <p className="font-semibold text-sm">Express 5 + Node.js</p>
            </div>
            <div className="p-3 bg-white/5 rounded-md">
              <p className="text-xs text-white/50">מסד נתונים</p>
              <p className="font-semibold text-sm">Supabase PostgreSQL</p>
            </div>
            <div className="p-3 bg-white/5 rounded-md">
              <p className="text-xs text-white/50">מודל AI</p>
              <p className="font-semibold text-sm">claude-sonnet-4-6</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      )}
    </div>
  );
}
