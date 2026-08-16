import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-200 bg-white py-6 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
        <div className="mb-4 md:mb-0">
          © {new Date().getFullYear()} מחולל הקהילות. כל הזכויות שמורות.
        </div>
        <div className="flex gap-6">
          <Link href="/privacy-policy" className="hover:text-gray-900 transition-colors">
            מדיניות פרטיות
          </Link>
          <Link href="/terms-of-use" className="hover:text-gray-900 transition-colors">
            תנאי שימוש
          </Link>
        </div>
      </div>
    </footer>
  );
};
