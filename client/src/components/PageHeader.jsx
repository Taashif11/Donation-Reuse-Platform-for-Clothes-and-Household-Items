// Consistent header banner for inner pages.
export default function PageHeader({ title, subtitle }) {
  return (
    <header className="page-header">
      <div className="container">
        <h1 className="h2 mb-2">{title}</h1>
        {subtitle && <p className="lead mb-0 text-muted">{subtitle}</p>}
      </div>
    </header>
  )
}
