export default function Footer() {
  return (
    <footer className="border-t border-surface-border/60 bg-surface/50 backdrop-blur-sm py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-heading text-sm font-bold">
            Radical<span className="gradient-text">Portal</span>
          </p>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Radical Recruitment. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    </footer>
  );
}
