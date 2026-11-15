import "./Sidebar.scss";

export default function Sidebar({ currentPage, onPageChange }) {
  const menus = [
    { id: "plan", label: "재무계획" },
    { id: "scenario", label: "시나리오 비교" },
    { id: "review", label: "AI 답변 검토" },
  ];

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <span className="app-header__brand">AFPK</span>

        <nav className="app-header__nav" aria-label="주 메뉴">
          {menus.map((menu) => (
            <button
              key={menu.id}
              type="button"
              aria-current={currentPage === menu.id ? "page" : undefined}
              onClick={() => onPageChange(menu.id)}
            >
              {menu.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
