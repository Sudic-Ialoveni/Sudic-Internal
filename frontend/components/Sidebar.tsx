import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, Phone, Building, Bot, Layout, FileText } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: Home,
    },
    { 
      name: 'TaritiGPT', 
      href: '/tariti-gpt', 
      icon: Bot,
    },
    { 
      name: 'Website Analytics', 
      href: '/website-analytics', 
      icon: LineChart,
    },
    { 
      name: 'Moizvonki Analytics', 
      href: '/moizvonki-analytics', 
      icon: Phone,
    },
    { 
      name: 'AmoCRM Analytics', 
      href: '/amocrm-analytics', 
      icon: Building,
    },
    { 
      name: 'AI Page Builder', 
      href: '/ai-page-builder', 
      icon: Layout,
    },
    { 
      name: 'Custom Pages', 
      href: '/custom-pages', 
      icon: FileText,
    },
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="h-0 flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
