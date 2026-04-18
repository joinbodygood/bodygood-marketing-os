import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const SECTIONS = [
  {
    label: 'Command',
    items: [
      { to: '/', label: 'Home', end: true },
      { to: '/ops', label: 'Ops Manager', roles: ['ceo', 'operations'] },
      { to: '/qc', label: 'QC Center', roles: ['ceo', 'operations'] },
      { to: '/analytics', label: 'Analytics', roles: ['ceo', 'operations'] },
    ],
  },
  {
    label: 'Studio',
    items: [
      { to: '/tools', label: 'Team Tools' },
      { to: '/library', label: 'Content Library' },
    ],
  },
  {
    label: 'Admin',
    items: [{ to: '/settings', label: 'Settings', roles: ['ceo', 'operations'] }],
  },
];

function navItemClasses({ isActive }) {
  return [
    'group flex items-center gap-2 px-3 py-1.5 text-xs rounded-md',
    isActive ? 'text-gray-900 bg-gray-50' : 'text-gray-600 hover:text-gray-900',
  ].join(' ');
}

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const role = profile?.role;

  return (
    <aside className="w-[200px] shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="text-sm font-medium">
          Body <span style={{ color: '#ED1B1B' }}>Good</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">
          Marketing OS
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {SECTIONS.map((section) => {
          const visible = section.items.filter(
            (i) => !i.roles || (role && i.roles.includes(role))
          );
          if (visible.length === 0) return null;
          return (
            <div key={section.label}>
              <div className="px-3 mb-1 text-[10px] uppercase tracking-widest text-gray-400">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={navItemClasses}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className="w-1 h-1 rounded-full"
                          style={{
                            backgroundColor: isActive ? '#ED1B1B' : '#d1d5db',
                          }}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
            style={{ backgroundColor: '#ED1B1B' }}
          >
            {(profile?.name || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">
              {profile?.name || '—'}
            </div>
            <div className="text-[10px] text-gray-500 capitalize truncate">
              {profile?.role || ''}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-2 w-full text-[10px] text-gray-500 hover:text-gray-800 text-left px-0"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
