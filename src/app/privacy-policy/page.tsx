import React from 'react';
import { Metadata } from 'next';
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | מחולל הקהילות",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-4xl flex-grow">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">מדיניות פרטיות</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          <p className="text-gray-500">תאריך עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. מבוא</h2>
            <p>אנו ב"מחולל הקהילות" מתייחסים ברצינות רבה לפרטיות המשתמשים שלנו. מדיניות פרטיות זו מתארת כיצד אנו אוספים, משתמשים ושומרים על המידע האישי שלך כאשר אתה משתמש בשירותים שלנו. על ידי שימוש באתר, אתה מסכים לאיסוף ולשימוש במידע בהתאם למדיניות זו.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. מידע שאנו אוספים</h2>
            <p>אנו עשויים לאסוף את סוגי המידע הבאים:</p>
            <ul className="list-disc list-inside space-y-2 mt-4 text-gray-600">
              <li><strong>מידע שאתה מספק לנו באופן ישיר:</strong> כגון שמך, כתובת האימייל שלך, מספר טלפון ופרטי יצירת קשר נוספים בעת ההרשמה או השימוש בשירות (לדוגמה דרך התחברות עם Google).</li>
              <li><strong>מידע שנאסף באופן אוטומטי:</strong> מידע טכני על המכשיר שלך, כתובת IP, סוג דפדפן, דפים בהם ביקרת, ושעות פעילות באתר, אשר עשוי להיאסף באמצעות עוגיות (Cookies) או טכנולוגיות דומות.</li>
              <li><strong>מידע משירותי צד שלישי:</strong> אם אתה בוחר להתחבר באמצעות חשבון Google או מעניק לנו גישה לשירותים חיצונים (לדוגמה YouTube, Calendar), אנו נקבל ונעבד מידע אך ורק בהתאם להרשאות שאישרת ולצורך הפעלת השירות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. כיצד אנו משתמשים במידע</h2>
            <p>המידע שאנו אוספים משמש למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-2 mt-4 text-gray-600">
              <li>אספקת השירותים, תפעול האתר וניהול חשבונך האישי.</li>
              <li>התאמה אישית של חווית המשתמש והצעת תוכן רלוונטי.</li>
              <li>תקשורת איתך בנושאי תמיכה, עדכוני שירות, או הודעות מערכת.</li>
              <li>שיפור מתמיד של האתר, הכלים והשירותים שאנו מציעים.</li>
              <li>עמידה בדרישות חוקיות ורגולטוריות ומניעת פעילות זדונית.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. שיתוף מידע עם צדדים שלישיים</h2>
            <p>אנו מתחייבים לא למכור, להשכיר או לשתף את המידע האישי שלך עם צדדים שלישיים למטרות שיווקיות, למעט במקרים הבאים:</p>
            <ul className="list-disc list-inside space-y-2 mt-4 text-gray-600">
              <li>לאחר קבלת הסכמתך המפורשת.</li>
              <li>עם ספקי שירות חיצוניים המסייעים לנו בתפעול האתר (כגון שירותי אחסון ענן, ניהול מאגרי נתונים או שירותי דיוור), הכפופים גם הם להסכמי סודיות מחמירים.</li>
              <li>כאשר אנו נדרשים לכך על פי חוק, צו בית משפט או בקשה מרשויות החוק המוסמכות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. שימוש במידע של Google (Google API Services)</h2>
            <p>
              השימוש שלנו במידע המתקבל מממשקי ה-API של גוגל יתבצע אך ורק בהתאם למדיניות
              {' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google API Services User Data Policy</a>,
              לרבות דרישות השימוש המוגבל (Limited Use requirements). לא נעביר מידע זה לצד שלישי אלא לצורך מתן השירותים שאישרת במפורש.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. אבטחת מידע</h2>
            <p>אנו נוקטים באמצעי אבטחה ארגוניים וטכנולוגיים מתקדמים כדי להגן על המידע האישי שלך מפני גישה, חשיפה, שינוי או השמדה בלתי מורשים. עם זאת, עליך להיות מודע לכך שאין מערכת מחשוב או שידור נתונים באינטרנט שמאובטחים באופן מוחלט, ולכן איננו יכולים להבטיח חסינות מלאה מפני פריצות.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. זכויות המשתמש</h2>
            <p>לרשותך עומדות זכויות שונות הנוגעות למידע האישי שלך, כולל הזכות לעיין במידע, לבקש את תיקונו במקרה של אי-דיוק, או לדרוש את מחיקתו ממערכותינו. כדי לממש זכויות אלו, ניתן לפנות אלינו באמצעות פרטי הקשר המופיעים מטה.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. שינויים במדיניות זו</h2>
            <p>אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. שינויים משמעותיים יפורסמו בדף זה ולעיתים אף יישלחו אליך בהודעה מיוחדת. המשך השימוש באתר לאחר פרסום השינויים מהווה את הסכמתך למדיניות המעודכנת.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. יצירת קשר</h2>
            <p>לכל שאלה, בקשה או הערה בנושא מדיניות הפרטיות שלנו, אתה מוזמן ליצור איתנו קשר:</p>
            <p className="mt-2 text-gray-600">דוא"ל: ovt5771@gmail.com</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
