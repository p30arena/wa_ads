// بسم الله الرحمن الرحیم

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-lg mb-8">The page you are looking for does not exist.</p>
      <a href="/" className="px-6 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition">Go Home</a>
    </div>
  );
}
