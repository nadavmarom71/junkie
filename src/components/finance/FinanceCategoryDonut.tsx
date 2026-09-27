import { financeVisual } from './FinanceVisuals';
import { money } from '@/lib/financeFormatters';

type Category = { category: string; amount: number };

export default function FinanceCategoryDonut({
  categories,
  total,
  selected,
  hovered,
  scope,
  onSelect,
  onHover,
}: {
  categories: Category[];
  total: number | null | undefined;
  selected: string | null;
  hovered: string | null;
  scope: 'business' | 'personal';
  onSelect: (category: string | null) => void;
  onHover: (category: string | null) => void;
}) {
  const safeTotal = total && total > 0 ? total : 0;
  const emphasized = hovered || selected;
  const active = emphasized ? categories.find(item => item.category === emphasized) : null;
  let offset = 0;

  return <div className="fn-category-donut-wrap">
    <div className={`fn-category-donut fn-category-donut-${scope}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`חלוקת הוצאות ${scope === 'business' ? 'עסקיות' : 'אישיות'} לפי קטגוריה`}>
        <circle className="fn-category-donut-track" cx="60" cy="60" r="43" pathLength="100"/>
        {safeTotal > 0 && categories.map(category => {
          const size = category.amount / safeTotal * 100;
          const start = offset;
          offset += size;
          const accent = financeVisual(category.category, scope).accent;
          const isActive = selected === category.category;
          const isHovered = hovered === category.category;
          return <circle
            key={category.category}
            data-category-key={category.category}
            className={`fn-category-donut-segment fn-accent-stroke-${accent}${isActive ? ' is-active' : ''}${isHovered ? ' is-hovered' : ''}${emphasized && emphasized !== category.category ? ' is-dimmed' : ''}`}
            cx="60"
            cy="60"
            r="43"
            pathLength="100"
            strokeDasharray={`${Math.max(size - .45, .5)} ${100 - Math.max(size - .45, .5)}`}
            strokeDashoffset={-start}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`${category.category}, ${money(category.amount)}, ${Math.round(size)} אחוז מההוצאות`}
            onMouseEnter={() => onHover(category.category)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(category.category)}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(isActive ? null : category.category)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(isActive ? null : category.category);
              }
            }}
          />;
        })}
      </svg>
      <button className="fn-category-donut-center" onClick={() => onSelect(null)} aria-label={selected ? 'הצגת כל הקטגוריות' : undefined}>
        <span>{active ? `${Math.round(active.amount / Math.max(safeTotal, 1) * 100)}%` : 'סה״כ'}</span>
        <strong>{money(active?.amount ?? total)}</strong>
        <small>{active?.category || `${categories.length} קטגוריות`}</small>
      </button>
    </div>
    <p>{active ? <>מציג עכשיו את <strong>{active.category}</strong></> : categories[0] ? <><strong>{categories[0].category}</strong> היא הקטגוריה הגדולה בתקופה</> : 'עוד אין הוצאות להצגה'}</p>
  </div>;
}
