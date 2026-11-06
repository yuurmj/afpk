import './Sidebar.scss';

export default function Sidebar({ currentPage, onPageChange }) {
    const menus = [
        { id: 'plan', label: '재무계획' },
        { id: 'scenario', label: '시나리오 비교' },
        { id: 'review', label: 'AI 답변 검토' },
    ];

  return (
    <aside className="sidebar">
        <h2>AFPK</h2>

        <nav aria-label="주 메뉴">
            {menus.map((menu) => (
                <button
                    key={menu.id}
                    type="button"
                    className={currentPage === menu.id ? 'active' : ''}
                    onClick={() => onPageChange(menu.id)}
                >
                    {menu.label}
                </button>
            ))}
        </nav>
    </aside>
  );
}