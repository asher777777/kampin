import type { Metadata } from 'next';
import SystemMapClient from './SystemMapClient';

export const metadata: Metadata = {
  title: 'מפת מערכת וארכיטקטורה ויזואלית | Golden Flute',
  description: 'מפה ויזואלית אינטראקטיבית של כל הקבצים, הנתיבים, שרתי ה-API והפונקציות במערכת.'
};

export default function SystemMapPage() {
  return <SystemMapClient />;
}
