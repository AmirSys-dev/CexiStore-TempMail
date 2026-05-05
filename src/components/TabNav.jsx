
/**
 * TabNav - Accessible tab navigation component with ARIA support
 * Usage: <TabNav
 *          tabs={[
 *            { id: 'vault', label: 'Vault', icon: <VaultIcon /> },
 *            { id: 'inbox', label: 'Inbox', icon: <InboxIcon /> }
 *          ]}
 *          activeTab="vault"
 *          onTabChange={(id) => setActiveTab(id)}
 *        />
 */
export default function TabNav({
  tabs = [],
  activeTab,
  onTabChange,
  className = '',
  idPrefix = 'tabnav'
}) {
  const handleKeyDown = (event, index) => {
    if (!tabs.length) return;

    let nextIndex = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onTabChange(tabs[index].id);
        return;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onTabChange(nextTab.id);
      requestAnimationFrame(() => {
        const nextButton = document.getElementById(`${idPrefix}-${nextTab.id}-tab`);
        nextButton?.focus();
      });
    }
  };

  return (
    <div
      className={`tabnav-root ${className}`}
      role="tablist"
      aria-orientation="horizontal"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`${idPrefix}-${tab.id}-tab`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`${idPrefix}-${tab.id}-panel`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`tabnav-item ${isActive ? 'active' : ''} flex items-center gap-2`}
          >
            {tab.icon && <span className="flex items-center">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
