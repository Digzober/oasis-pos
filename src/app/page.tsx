export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center justify-center gap-8 p-16">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
          Oasis POS
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Cannabis POS, Inventory, Ecommerce &amp; Compliance Platform
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Environment: {process.env.NEXT_PUBLIC_APP_ENV ?? 'development'}
        </p>
      </main>
    </div>
  );
}
