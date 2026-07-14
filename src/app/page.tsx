export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-overlay font-sans dark:bg-bg">
      <main className="flex flex-col items-center justify-center gap-8 p-16">
        <h1 className="text-4xl font-bold tracking-tight text-inverse dark:text-primary">
          Oasis POS
        </h1>
        <p className="text-lg text-muted dark:text-secondary">
          Cannabis POS, Inventory, Ecommerce &amp; Compliance Platform
        </p>
        <p className="text-sm text-secondary dark:text-muted">
          Environment: {process.env.NEXT_PUBLIC_APP_ENV ?? 'development'}
        </p>
      </main>
    </div>
  );
}
