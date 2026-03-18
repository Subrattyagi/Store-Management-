export default function StatusBadge({ status }) {
    const s = status?.toLowerCase().replace(/\s+/g, '_') || '';
    return (
        <span className={`badge badge-${s}`}>
            <span className="badge-dot" />
            {status?.replace(/_/g, ' ')}
        </span>
    );
}
