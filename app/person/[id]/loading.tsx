export default function PersonDetailLoading() {
    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <header className="glass-header sticky top-0 z-50 border-b border-subtle">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                    <div className="flex h-12 items-center justify-between">
                        <div className="h-4 w-12 rounded bg-stone-200" />
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-20 rounded bg-stone-200" />
                            <div className="h-7 w-16 rounded-lg bg-stone-200" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
                <section className="card-base p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-24 w-24 shrink-0 rounded-2xl bg-stone-200" />
                        <div className="min-w-0 flex-1 space-y-3">
                            <div className="h-7 w-48 rounded bg-stone-200" />
                            <div className="h-4 w-72 max-w-full rounded bg-stone-100" />
                            <div className="flex flex-wrap gap-2">
                                <div className="h-6 w-20 rounded-lg bg-stone-100" />
                                <div className="h-6 w-24 rounded-lg bg-stone-100" />
                                <div className="h-6 w-16 rounded-lg bg-stone-100" />
                            </div>
                        </div>
                    </div>
                </section>

                {[0, 1, 2].map(index => (
                    <section key={index} className="card-base p-5 sm:p-6">
                        <div className="h-4 w-28 rounded bg-stone-200" />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="h-24 rounded-xl bg-stone-100" />
                            <div className="h-24 rounded-xl bg-stone-100" />
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
}
