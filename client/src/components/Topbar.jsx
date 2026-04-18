export default function Topbar({ title, subtitle, activeCampaign }) {
  return (
    <header className="h-12 border-b border-gray-200 bg-white flex items-center px-6">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-tight truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-[11px] text-gray-500 leading-tight truncate">
            {subtitle}
          </div>
        )}
      </div>
      {activeCampaign && (
        <div className="text-[11px] text-gray-600 border border-gray-200 rounded-full px-3 py-1">
          <span className="text-gray-400 mr-1.5">Campaign</span>
          <span className="font-medium">{activeCampaign}</span>
        </div>
      )}
    </header>
  );
}
