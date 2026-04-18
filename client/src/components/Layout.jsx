import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout({ title, subtitle, activeCampaign, children }) {
  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} activeCampaign={activeCampaign} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
