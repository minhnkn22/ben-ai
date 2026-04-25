import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="max-w-lg w-full px-6 text-center">
        <h1 className="text-4xl font-semibold text-stone-900 mb-3">Ben</h1>
        <p className="text-stone-600 text-lg mb-2">
          Tell me what you hated about your last three jobs.
        </p>
        <p className="text-stone-400 text-sm mb-10">
          Upload your CV. In 10 minutes I&apos;ll tell you a pattern about how you work
          that nobody has told you before.
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
        >
          Get my Pattern Reveal
        </Link>
      </div>
    </div>
  )
}
